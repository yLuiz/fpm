import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class CloseDowntimeDto {
  @ApiPropertyOptional({ example: '2026-10-24T11:00:00.000Z', description: 'Fim da parada (default: agora)' })
  @IsOptional()
  @IsDateString()
  endedAt?: string;
}
