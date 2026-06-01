import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EquipmentStatus } from '@prisma/client';

@ApiTags('equipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo equipamento' })
  @ApiResponse({ status: 201, description: 'Equipamento criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  create(@Body() createEquipmentDto: CreateEquipmentDto, @Request() req: any) {
    return this.equipmentService.create(createEquipmentDto, req.user?.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os equipamentos' })
  @ApiQuery({ name: 'status', required: false, enum: EquipmentStatus })
  @ApiResponse({ status: 200, description: 'Lista de equipamentos' })
  findAll(@Query('status') status?: EquipmentStatus) {
    return this.equipmentService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar equipamento por ID' })
  @ApiResponse({ status: 200, description: 'Equipamento encontrado' })
  @ApiResponse({ status: 404, description: 'Equipamento não encontrado' })
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar equipamento' })
  @ApiResponse({ status: 200, description: 'Equipamento atualizado' })
  @ApiResponse({ status: 404, description: 'Equipamento não encontrado' })
  update(
    @Param('id') id: string,
    @Body() updateEquipmentDto: UpdateEquipmentDto,
    @Request() req: any,
  ) {
    return this.equipmentService.update(id, updateEquipmentDto, req.user?.sub);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Alternar status do equipamento (ativo/inativo)' })
  @ApiResponse({ status: 200, description: 'Status alterado' })
  @ApiResponse({ status: 404, description: 'Equipamento não encontrado' })
  toggleStatus(@Param('id') id: string, @Request() req: any) {
    return this.equipmentService.toggleStatus(id, req.user?.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover equipamento (soft delete)' })
  @ApiResponse({ status: 200, description: 'Equipamento removido' })
  @ApiResponse({ status: 404, description: 'Equipamento não encontrado' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.equipmentService.remove(id, req.user?.sub);
  }
}
