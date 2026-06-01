import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateFrequencyDto } from './dto/update-frequency.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EquipmentType, UserRole } from '@prisma/client';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('frequency')
  @ApiOperation({ summary: 'Obter todas as frequências de manutenção' })
  @ApiResponse({ status: 200, description: 'Lista de frequências por tipo' })
  getAllFrequencies() {
    return this.settingsService.getAllFrequencies();
  }

  @Put('frequency/:type')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar frequência por tipo (somente admin)' })
  @ApiResponse({ status: 200, description: 'Frequência atualizada' })
  @ApiResponse({ status: 403, description: 'Acesso negado - somente admin' })
  updateFrequency(
    @Param('type') type: EquipmentType,
    @Body() updateDto: UpdateFrequencyDto,
  ) {
    return this.settingsService.updateFrequency(type, updateDto);
  }
}
