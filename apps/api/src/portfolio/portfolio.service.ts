import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { Asset, Holding } from '../../generated/prisma/client';

/** Response body of `POST /portfolio/holdings/upload-csv` (spec.md -> API Contract). */
export interface ImportHoldingsCsvResult {
  created: number;
  updated: number;
  errors: string[];
}

/**
 * Business logic for the `portfolio` module lives here per CONVENTIONS.md ->
 * "Module structure" (controllers stay thin).
 */
@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
  ) {}

  /**
   * `POST /portfolio/holdings` (PORTFOLIO_US-1_T-1). Delegates the actual
   * find-or-create-`Asset` + upsert-`Holding` work to `upsertHolding`, shared
   * with `importHoldingsCsv` (PORTFOLIO_US-2_T-1) so the ticker-uppercasing
   * rule and upsert semantics can't diverge between the two entry points.
   */
  async createHolding(
    userId: string,
    ticker: string,
    quantity: number,
    avgPrice: number,
  ): Promise<Holding> {
    const { holding } = await this.upsertHolding(userId, ticker, quantity, avgPrice);
    return holding;
  }

  /**
   * `POST /portfolio/holdings/upload-csv` (PORTFOLIO_US-2_T-1;
   * PORTFOLIO_US-2_T-2 is the thin multipart wrapper over this). Parses a
   * `ticker,quantity,avgPrice` CSV with a header row and processes each row
   * independently through `upsertHolding` — the same shared logic
   * `createHolding` uses.
   *
   * Spec AC-3 requires 3 valid + 1 malformed rows to yield 3 holdings *and*
   * 1 reported error, without a 500 — so a malformed row is collected into
   * `errors[]` and the loop continues, rather than validating the whole file
   * up front or wrapping every row in one transaction that would roll back
   * the good rows along with the bad one.
   */
  async importHoldingsCsv(userId: string, csv: string): Promise<ImportHoldingsCsvResult> {
    // `columns: false` (raw string arrays) rather than `columns: true`,
    // because csv-parse's `relax_column_count` with `columns: true` silently
    // drops extra columns instead of surfacing a wrong-column-count row as
    // an error — array mode lets each row's length be checked explicitly.
    // `skip_empty_lines: true` drops a blank trailing line (a text editor
    // artifact, not a user mistake) without reporting it as an error.
    const rows: string[][] = parse(csv, {
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    // First row is the header (`ticker,quantity,avgPrice`); data rows are
    // numbered from 1, not counting the header.
    const dataRows = rows.slice(1);

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const rowNumber = i + 1;
      const row = dataRows[i];

      if (row.length !== 3) {
        errors.push(
          `row ${rowNumber}: expected 3 columns (ticker,quantity,avgPrice), got ${row.length}`,
        );
        continue;
      }

      const [rawTicker, rawQuantity, rawAvgPrice] = row;
      const ticker = rawTicker?.trim() ?? '';

      if (!ticker) {
        errors.push(`row ${rowNumber}: ticker must not be empty`);
        continue;
      }

      const quantity = Number(rawQuantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        errors.push(`row ${rowNumber}: quantity must be a positive number`);
        continue;
      }

      const avgPrice = Number(rawAvgPrice);
      if (!Number.isFinite(avgPrice) || avgPrice <= 0) {
        errors.push(`row ${rowNumber}: avgPrice must be a positive number`);
        continue;
      }

      try {
        const { wasCreated } = await this.upsertHolding(userId, ticker, quantity, avgPrice);
        if (wasCreated) {
          created++;
        } else {
          updated++;
        }
      } catch (error) {
        errors.push(`row ${rowNumber}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { created, updated, errors };
  }

  /**
   * Shared by `createHolding` and `importHoldingsCsv`. Three things happen:
   *
   * 1. Find-or-create the `Asset` by ticker, normalised to uppercase before
   *    lookup — `Asset.ticker` is `@unique`, so `petr4` vs `PETR4` would
   *    otherwise create two rows and silently split one position in two.
   * 2. Upsert the `Holding` on `@@unique([userId, assetId])`: re-adding a
   *    held ticker updates `quantity`/`avgPrice` rather than inserting a
   *    duplicate (spec AC-2). Whether the holding already existed is
   *    resolved via a lookup before the upsert, since Prisma's `upsert`
   *    itself doesn't report which branch it took — `importHoldingsCsv`
   *    needs that to count a row toward `created` vs. `updated`.
   * 3. For a newly-created `Asset` only, trigger the historical backfill
   *    fire-and-forget — `MarketDataService.backfillHistory` reaches out to
   *    Yahoo Finance (unofficial, rate-limited) and has no internal
   *    `try`/`catch`, so it must never be able to fail the caller's request.
   *    Its own `.catch()` here logs at `error` level instead, degrading to
   *    "the chart starts flat" rather than "I can't add stocks."
   */
  private async upsertHolding(
    userId: string,
    ticker: string,
    quantity: number,
    avgPrice: number,
  ): Promise<{ holding: Holding; wasCreated: boolean }> {
    const normalizedTicker = ticker.toUpperCase();

    let asset = await this.prisma.asset.findUnique({ where: { ticker: normalizedTicker } });
    let isNewAsset = false;

    if (!asset) {
      asset = await this.prisma.asset.create({
        data: { ticker: normalizedTicker, name: normalizedTicker },
      });
      isNewAsset = true;
    }

    const existingHolding = await this.prisma.holding.findUnique({
      where: { userId_assetId: { userId, assetId: asset.id } },
    });

    const holding = await this.prisma.holding.upsert({
      where: { userId_assetId: { userId, assetId: asset.id } },
      update: { quantity, avgPrice },
      create: { userId, assetId: asset.id, quantity, avgPrice },
    });

    if (isNewAsset) {
      this.marketDataService.backfillHistory(asset.id).catch((error: unknown) => {
        this.logger.error(
          `backfillHistory failed for newly-created asset ${asset!.ticker} (${asset!.id}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }

    return { holding, wasCreated: !existingHolding };
  }

  /**
   * `GET /portfolio/holdings` (PORTFOLIO_US-1_T-2). Joined with `Asset` via
   * Prisma `include`, per spec.md -> API Contract: the consumer needs
   * `ticker`/`name`/`sector`/`currentPrice`/`investmentStyle`/`riskRating`,
   * all of which live on `Asset`, not `Holding` — leaving the join out would
   * mean the dashboard issuing one follow-up request per row. A user with no
   * holdings gets `[]`, not a `404` (spec.md -> Behavior Notes for this
   * task): an empty portfolio is a normal state for a new account.
   */
  async listHoldings(userId: string): Promise<(Holding & { asset: Asset })[]> {
    return this.prisma.holding.findMany({
      where: { userId },
      include: { asset: true },
    });
  }

  /**
   * `PATCH /portfolio/holdings/:id` (PORTFOLIO_US-1_T-3).
   *
   * Scoped on `(id, userId)` together, not `id` alone — a bare
   * `prisma.holding.update({ where: { id } })` lets any authenticated user
   * modify any holding whose id they can name, since the guard only proves
   * *who* the caller is, not that the row belongs to them (this is the
   * concrete instance of spec AC-7 the task calls out). `Holding`'s `id` is
   * globally unique, so `updateMany` is the way to add the `userId` filter
   * to the `where` clause — `update` only accepts a unique identifier.
   * `updateMany`'s `count` distinguishes "no such id" from "id exists but
   * isn't this user's" without leaking which case it was: both return `404`,
   * not `403`, so the response can't be used to probe which ids exist.
   *
   * `quantity`/`avgPrice` are passed straight through as given — both are
   * optional on the DTO, and Prisma's `update`/`updateMany` treat an
   * `undefined` field in `data` as "not provided" (skipped), not "set to
   * null". Naively re-passing `{ quantity, avgPrice }` from a DTO that
   * validated fine with only one field present is exactly this behavior;
   * spelling it out here since it's easy to break by "helpfully" defaulting
   * the missing field to something.
   */
  async updateHolding(
    userId: string,
    id: string,
    { quantity, avgPrice }: { quantity?: number; avgPrice?: number },
  ): Promise<Holding> {
    const { count } = await this.prisma.holding.updateMany({
      where: { id, userId },
      data: { quantity, avgPrice },
    });

    if (count === 0) {
      throw new NotFoundException(`No Holding found for id '${id}'`);
    }

    return this.prisma.holding.findUniqueOrThrow({ where: { id } });
  }

  /**
   * `DELETE /portfolio/holdings/:id` (PORTFOLIO_US-1_T-4).
   *
   * Scoped on `(id, userId)` together, not `id` alone — same reasoning as
   * `updateHolding` (PORTFOLIO_US-1_T-3): a bare
   * `prisma.holding.delete({ where: { id } })` lets any authenticated user
   * destroy any holding whose id they can name, since the guard only proves
   * *who* the caller is, not that the row belongs to them (spec AC-7).
   * `Holding`'s `id` is globally unique, so `deleteMany` is the way to add
   * the `userId` filter to the `where` clause — `delete` only accepts a
   * unique identifier. `deleteMany`'s `count` distinguishes "no such id"
   * from "id exists but isn't this user's" without leaking which case it
   * was: both return `404`, not `403`, so the response can't be used to
   * probe which ids exist.
   *
   * Only the `Holding` row is deleted. `Asset` is intentionally left
   * alone — it's shared across all users and owned by market-data (see the
   * task file), so this never cascades into deleting it even if this was
   * the last holding referencing it.
   */
  async deleteHolding(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.holding.deleteMany({
      where: { id, userId },
    });

    if (count === 0) {
      throw new NotFoundException(`No Holding found for id '${id}'`);
    }
  }
}
