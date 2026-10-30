import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryDowntimeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @ApiPropertyOptional({ description: 'true = só paradas em andamento; false = só encerradas' })
  @IsOptional()
  @Transform(({ obj, key }) => (obj[key] === 'true' ? true : obj[key] === 'false' ? false : obj[key]))
  @IsBoolean()
  open?: boolean;

  @ApiPropertyOptional({ description: 'Paradas que estavam em andamento a partir desta data' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Paradas iniciadas até esta data' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
