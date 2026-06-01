import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MaintenanceService, CHECKLIST_BY_TYPE } from './maintenance.service';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EquipmentType } from '@prisma/client';

@ApiTags('maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('upcoming')
  @ApiOperation({ summary: 'Listar manutenções a vencer' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Dias para verificar (default: 3)' })
  @ApiResponse({ status: 200, description: 'Lista de manutenções a vencer' })
  findUpcoming(@Query('days', new DefaultValuePipe(3), ParseIntPipe) days: number) {
    return this.maintenanceService.findUpcoming(days);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Listar manutenções vencidas' })
  @ApiResponse({ status: 200, description: 'Lista de manutenções vencidas' })
  findOverdue() {
    return this.maintenanceService.findOverdue();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas do dashboard' })
  @ApiResponse({ status: 200, description: 'Estatísticas de manutenções' })
  getDashboardStats() {
    return this.maintenanceService.getDashboardStats();
  }

  @Get('checklist/:type')
  @ApiOperation({ summary: 'Obter checklist por tipo de equipamento' })
  @ApiResponse({ status: 200, description: 'Checklist do tipo' })
  getChecklist(@Param('type') type: EquipmentType) {
    return {
      type,
      items: CHECKLIST_BY_TYPE[type] || [],
    };
  }

  @Get('by-equipment/:equipmentId')
  @ApiOperation({ summary: 'Listar manutenções por equipamento' })
  @ApiResponse({ status: 200, description: 'Lista de manutenções do equipamento' })
  findByEquipment(@Param('equipmentId') equipmentId: string) {
    return this.maintenanceService.findByEquipment(equipmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar manutenção por ID' })
  @ApiResponse({ status: 200, description: 'Manutenção encontrada' })
  @ApiResponse({ status: 404, description: 'Manutenção não encontrada' })
  findOne(@Param('id') id: string) {
    return this.maintenanceService.findOne(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Concluir manutenção' })
  @ApiResponse({ status: 200, description: 'Manutenção concluída e próxima agendada' })
  @ApiResponse({ status: 404, description: 'Manutenção não encontrada' })
  complete(@Param('id') id: string, @Body() completeDto: CompleteMaintenanceDto) {
    return this.maintenanceService.complete(id, completeDto);
  }
}
