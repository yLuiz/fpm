import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DowntimeService } from './downtime.service';
import { CreateDowntimeDto } from './dto/create-downtime.dto';
import { CloseDowntimeDto } from './dto/close-downtime.dto';
import { QueryDowntimeDto } from './dto/query-downtime.dto';

@ApiTags('downtime')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('downtime')
export class DowntimeController {
  constructor(private readonly downtimeService: DowntimeService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar parada de equipamento' })
  @ApiResponse({ status: 201, description: 'Parada registrada (e corretiva aberta, se pedido)' })
  @ApiResponse({ status: 404, description: 'Equipamento não encontrado' })
  @ApiResponse({ status: 409, description: 'Equipamento já tem parada em andamento' })
  create(@Body() dto: CreateDowntimeDto, @Request() req: any) {
    return this.downtimeService.create(dto, req.user?.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar paradas (filtros: equipamento, em andamento, período)' })
  findAll(@Query() query: QueryDowntimeDto) {
    return this.downtimeService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar parada por ID' })
  findOne(@Param('id') id: string) {
    return this.downtimeService.findOne(id);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Encerrar parada (equipamento volta a operar)' })
  @ApiResponse({ status: 200, description: 'Parada encerrada' })
  @ApiResponse({ status: 409, description: 'Parada já encerrada' })
  close(@Param('id') id: string, @Body() dto: CloseDowntimeDto, @Request() req: any) {
    return this.downtimeService.close(id, dto, req.user?.sub);
  }
}
