import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsDateString } from 'class-validator';

export class CompleteMaintenanceDto {
  @ApiPropertyOptional({
    example: '2024-01-15T10:00:00.000Z',
    description: 'Data/hora da conclusão (default: agora)',
  })
  @IsOptional()
  @IsDateString()
  concludedAt?: string;

  @ApiProperty({
    example: ['Temperatura ok', 'Ruído ok'],
    description: 'Itens do checklist marcados',
  })
  @IsArray()
  @IsString({ each: true })
  checklist: string[];

  @ApiPropertyOptional({
    example: 'Manutenção realizada sem problemas',
    description: 'Observações adicionais',
  })
  @IsOptional()
  @IsString()
  observations?: string;
}
