import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MetricsService } from './metrics.service';

export class SummaryQueryDto {
  @ApiPropertyOptional({ description: 'Início do período (default: 30 dias atrás)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Fim do período (default: agora)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class MonthlyQueryDto {
  @ApiPropertyOptional({ default: 6, minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  months?: number;
}

@ApiTags('metrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Cumprimento do plano, atraso médio, MTBF, MTTR e disponibilidade' })
  @ApiResponse({ status: 200, description: 'Indicadores do período' })
  summary(@Query() query: SummaryQueryDto) {
    return this.metricsService.summary(query.from, query.to);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Série mensal de cumprimento e paradas (com/sem preventiva vencida)' })
  @ApiResponse({ status: 200, description: 'Um item por mês, do mais antigo ao atual' })
  monthly(@Query() query: MonthlyQueryDto) {
    return this.metricsService.monthly(query.months ?? 6);
  }
}
