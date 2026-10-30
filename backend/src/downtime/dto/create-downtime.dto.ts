import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DowntimeCause } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateDowntimeDto {
  @ApiProperty({ example: '4f8c2a52-...' })
  @IsUUID()
  equipmentId: string;

  @ApiPropertyOptional({ example: '2026-10-24T08:30:00.000Z', description: 'Início da parada (default: agora)' })
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiProperty({ enum: DowntimeCause, example: DowntimeCause.MECHANICAL })
  @IsEnum(DowntimeCause)
  cause: DowntimeCause;

  @ApiProperty({ example: 'Motor travou e desarmou o disjuntor' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @ApiPropertyOptional({ default: false, description: 'Abre uma corretiva vinculada à parada' })
  @IsOptional()
  @IsBoolean()
  openCorrective?: boolean;
}
