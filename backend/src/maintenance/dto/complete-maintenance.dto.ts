import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CHECKLIST_RESULTS, ChecklistResultValue } from '../checklist';

export class ChecklistResultDto {
  @ApiProperty({ example: 'Ruído ok' })
  @IsString()
  item: string;

  @ApiProperty({
    enum: CHECKLIST_RESULTS,
    example: 'NOK',
    description: 'OK, NOK (não conforme) ou NA (não se aplica)',
  })
  @IsIn(CHECKLIST_RESULTS)
  result: ChecklistResultValue;

  @ApiPropertyOptional({
    example: 'Ruído anormal no rolamento traseiro',
    description: 'Obrigatória quando NOK',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CompleteMaintenanceDto {
  @ApiPropertyOptional({
    example: '2024-01-15T10:00:00.000Z',
    description: 'Data/hora da conclusão (default: agora)',
  })
  @IsOptional()
  @IsDateString()
  concludedAt?: string;

  @ApiPropertyOptional({
    type: [ChecklistResultDto],
    description:
      'Resultado de cada item do checklist do tipo. Obrigatório na preventiva; ignorado na corretiva.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistResultDto)
  checklist?: ChecklistResultDto[];

  @ApiPropertyOptional({
    example: 'Rolamento substituído',
    description: 'Observações. Na corretiva, é obrigatória (solução aplicada).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observations?: string;
}
