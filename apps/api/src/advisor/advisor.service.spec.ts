import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { RecommendedPortfoliosService } from '../recommended-portfolios/recommended-portfolios.service';
import { AdvisorService } from './advisor.service';

/**
 * ADVISOR_US-1_T-1 — PDF text extraction.
 *
 * Unit test with a mocked `PrismaService` (and its two sibling service
 * deps), per CONVENTIONS.md -> "Testing" — direct instantiation, same
 * pattern as `RecommendedPortfoliosService`'s own spec.
 * `extractPdfText` never touches any of the three, but the constructor
 * still requires them.
 */

const FIXTURE_DIR = join(__dirname, '..', '..', 'test', 'fixtures', 'advisor');

function readFixture(name: string): Buffer {
  return readFileSync(join(FIXTURE_DIR, name));
}

describe('AdvisorService', () => {
  let service: AdvisorService;

  beforeEach(() => {
    service = new AdvisorService(
      {} as unknown as PrismaService,
      {} as unknown as PortfolioService,
      {} as unknown as RecommendedPortfoliosService,
    );
  });

  describe('extractPdfText', () => {
    it('extracts a known sentence from a valid PDF', async () => {
      const text = await service.extractPdfText(readFixture('stub-report.pdf'));

      expect(text).toContain('This is a stub PDF fixture for advisor tests.');
    });

    it('rejects a non-PDF buffer with BadRequestException, not a generic Error', async () => {
      await expect(service.extractPdfText(Buffer.from('not a pdf'))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an empty buffer with BadRequestException', async () => {
      await expect(service.extractPdfText(Buffer.alloc(0))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a PDF that parses to whitespace only, rather than returning an empty string', async () => {
      await expect(service.extractPdfText(readFixture('blank-report.pdf'))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
