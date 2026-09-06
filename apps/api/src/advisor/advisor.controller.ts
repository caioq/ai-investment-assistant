import { Body, Controller, Get, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { MAX_PDF_UPLOAD_BYTES } from '../common/file-upload.constants';
import { UploadReportBodyDto } from './dto/upload-report-body.dto';
import { AdvisorService } from './advisor.service';
import { AdvisorAnalysis, AdvisorReport } from '../../generated/prisma/client';

/**
 * `AuthGuard` (CONVENTIONS.md -> "Auth") is applied once here, at the
 * controller class, rather than per-handler — every route this module adds
 * is per-user and `POST /advisor/analyze` spends money on a paid API call,
 * so guarding the class means a handler added later is protected by
 * default instead of relying on someone remembering to decorate it
 * individually (same rationale as `PortfolioController`/
 * `RecommendedPortfoliosController`).
 *
 * Route shapes below match spec.md -> API Contract, but their bodies are
 * intentionally unimplemented stubs — this task (ADVISOR_SHARED_T-2) only
 * wires the module and the guard; each story's own task fills in real
 * request handling (DTOs, file upload, etc.) per method.
 */
@Controller('advisor')
@UseGuards(AuthGuard)
export class AdvisorController {
  constructor(private readonly advisorService: AdvisorService) {}

  /**
   * Accepts *either* a multipart PDF *or* a JSON `{ sourceName?, text }`
   * body (spec.md -> API Contract). `FileInterceptor` (in-memory storage,
   * per CONVENTIONS.md -> "File uploads") populates `req.body`'s other
   * fields as plain strings when a file is attached, so `UploadReportBodyDto`
   * validates both the multipart and pure-JSON case the same way. Routing
   * between the two paths, and rejecting neither-present, is
   * `AdvisorService.uploadReport`'s job — this handler only shapes the
   * request/response per CONVENTIONS.md -> "Module structure".
   */
  @Post('reports/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PDF_UPLOAD_BYTES } }))
  async uploadReport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadReportBodyDto,
    @Req() req: Request,
  ): Promise<AdvisorReport> {
    const userId = (req.user as { id: string }).id;

    return this.advisorService.uploadReport(userId, {
      file,
      sourceName: dto.sourceName,
      text: dto.text,
    });
  }

  /** Implemented by ADVISOR_US-2_T-4. */
  @Post('analyze')
  async analyze(): Promise<AdvisorAnalysis> {
    return this.advisorService.analyze();
  }

  /** Implemented by ADVISOR_US-3_T-1. */
  @Get('analysis/latest')
  async getLatestAnalysis(): Promise<AdvisorAnalysis> {
    return this.advisorService.getLatestAnalysis();
  }
}
