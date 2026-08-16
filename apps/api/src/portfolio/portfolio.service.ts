import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { Asset, Holding } from '../../generated/prisma/client';

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
   * `POST /portfolio/holdings` (PORTFOLIO_US-1_T-1). Three things happen in
   * one request, per the task's own breakdown:
   *
   * 1. Find-or-create the `Asset` by ticker, normalised to uppercase before
   *    lookup — `Asset.ticker` is `@unique`, so `petr4` vs `PETR4` would
   *    otherwise create two rows and silently split one position in two.
   * 2. Upsert the `Holding` on `@@unique([userId, assetId])`: re-adding a
   *    held ticker updates `quantity`/`avgPrice` rather than inserting a
   *    duplicate (spec AC-2).
   * 3. For a newly-created `Asset` only, trigger the historical backfill
   *    fire-and-forget — `MarketDataService.backfillHistory` reaches out to
   *    Yahoo Finance (unofficial, rate-limited) and has no internal
   *    `try`/`catch`, so it must never be able to fail this request. Its own
   *    `.catch()` here logs at `error` level instead, degrading to "the
   *    chart starts flat" rather than "I can't add stocks."
   */
  async createHolding(
    userId: string,
    ticker: string,
    quantity: number,
    avgPrice: number,
  ): Promise<Holding> {
    const normalizedTicker = ticker.toUpperCase();

    let asset = await this.prisma.asset.findUnique({ where: { ticker: normalizedTicker } });
    let isNewAsset = false;

    if (!asset) {
      asset = await this.prisma.asset.create({
        data: { ticker: normalizedTicker, name: normalizedTicker },
      });
      isNewAsset = true;
    }

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

    return holding;
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
