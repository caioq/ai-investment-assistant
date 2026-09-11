import { IsOptional, IsUUID } from 'class-validator';

/**
 * Request body for `POST /advisor/analyze`, per spec.md -> API Contract.
 * Validated by the global `ValidationPipe` (CONVENTIONS.md -> "Module
 * structure"). `userId` is never part of this DTO — it always comes from
 * `req.user.id` (CONVENTIONS.md -> "Auth").
 *
 * `advisorReportId` is optional (a report is optional context, per spec.md
 * -> AC "`POST /advisor/analyze` without an `advisorReportId` still
 * succeeds") and, when present, must be a UUID: it's used in a Prisma
 * `@db.Uuid` lookup (`AdvisorController.analyze`'s ownership check), and a
 * non-UUID string would otherwise surface as a Prisma error (500) instead
 * of a clean `400` (ADVISOR_US-2_T-4).
 */
export class AnalyzeDto {
  @IsOptional()
  @IsUUID()
  advisorReportId?: string;
}
