import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { EquipmentType, Criticality } from '@prisma/client';

export class CreateEquipmentDto {
  @ApiProperty({ example: 'Motor Principal Linha 1', description: 'Nome do equipamento' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @ApiProperty({
    enum: EquipmentType,
    example: 'MOTOR',
    description: 'Tipo do equipamento',
  })
  @IsEnum(EquipmentType, { message: 'Tipo de equipamento inválido' })
  type: EquipmentType;

  @ApiProperty({ example: 'Galpão A - Setor 1', description: 'Localização do equipamento' })
  @IsString()
  @IsNotEmpty({ message: 'Localização é obrigatória' })
  location: string;

  @ApiProperty({
    enum: Criticality,
    example: 'HIGH',
    description: 'Criticidade do equipamento',
  })
  @IsEnum(Criticality, { message: 'Criticidade inválida' })
  criticality: Criticality;
}
