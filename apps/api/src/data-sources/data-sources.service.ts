import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportLog, Prisma } from '../../generated/prisma/client';
import { CreateImportLogDto } from './dto/create-import-log.dto';
import { DEFAULT_IMPORT_LOG_LIMIT } from './dto/list-imports-query.dto';

/**
 * Import history for the data-sources page (spec.md -> Data Model / API
 * Contract). Every query is scoped to the `userId` the controller took from
 * `req.user.id` — the client never sends one (CONVENTIONS.md -> "Auth").
 */
@Injectable()
export class DataSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  /** The user's own import logs, newest first. */
  async listImports(userId: string, limit = DEFAULT_IMPORT_LOG_LIMIT): Promise<ImportLog[]> {
    return this.prisma.importLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async createImport(userId: string, dto: CreateImportLogDto): Promise<ImportLog> {
    return this.prisma.importLog.create({
      data: {
        userId,
        source: dto.source,
        // Only meaningful for a WALLET import; `undefined` (not `null`) so
        // Prisma leaves the nullable column at its default for the rest.
        walletType: dto.walletType,
        fileName: dto.fileName,
        records: dto.records,
        status: dto.status,
        message: dto.message,
        // `errors` is a `Json?` column holding `string[]`; an absent array
        // stays SQL NULL rather than becoming an empty array, so "no
        // rejected rows" and "errors not recorded" don't collapse into one.
        errors: dto.errors === undefined ? Prisma.DbNull : dto.errors,
      },
    });
  }
}
