import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class UpdateFrequencyDto {
  @ApiProperty({
    example: 30,
    description: 'Frequência em dias para manutenção',
    minimum: 1,
    maximum: 365,
  })
  @IsInt({ message: 'Frequência deve ser um número inteiro' })
  @Min(1, { message: 'Frequência mínima é 1 dia' })
  @Max(365, { message: 'Frequência máxima é 365 dias' })
  frequencyDays: number;
}
