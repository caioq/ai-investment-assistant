import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CreateHoldingDto } from './dto/create-holding.dto';
import { UpdateHoldingDto } from './dto/update-holding.dto';
import { PortfolioService } from './portfolio.service';
import { Asset, Holding } from '../../generated/prisma/client';

/**
 * `AuthGuard` (CONVENTIONS.md -> "Auth") is applied once here, at the
 * controller class, rather than per-handler — every endpoint this module
 * adds is scoped to `req.user.id` (spec.md -> API Contract preamble), so
 * guarding the class means a handler added later is protected by default
 * instead of relying on someone remembering to decorate it individually
 * (see PORTFOLIO_US-1_T-5, which exists to catch exactly that omission).
 */
@Controller('portfolio')
@UseGuards(AuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Post('holdings')
  async createHolding(@Body() dto: CreateHoldingDto, @Req() req: Request): Promise<Holding> {
    const userId = (req.user as { id: string }).id;

    return this.portfolioService.createHolding(userId, dto.ticker, dto.quantity, dto.avgPrice);
  }

  @Get('holdings')
  async listHoldings(@Req() req: Request): Promise<(Holding & { asset: Asset })[]> {
    const userId = (req.user as { id: string }).id;

    return this.portfolioService.listHoldings(userId);
  }

  @Patch('holdings/:id')
  async updateHolding(
    @Param('id') id: string,
    @Body() dto: UpdateHoldingDto,
    @Req() req: Request,
  ): Promise<Holding> {
    const userId = (req.user as { id: string }).id;

    return this.portfolioService.updateHolding(userId, id, dto);
  }

  @Delete('holdings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHolding(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const userId = (req.user as { id: string }).id;

    await this.portfolioService.deleteHolding(userId, id);
  }
}
