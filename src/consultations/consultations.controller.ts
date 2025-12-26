import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { QueryCedulaDto } from './dto/query-cedula.dto';
import { QueryRucDto } from './dto/query-ruc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * Controlador para consultas de cédulas y RUC
 * Accesible por admin y distribuidor
 */
@Controller('consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  /**
   * Consulta datos de una cédula
   * Endpoint: POST /consultations/cedula
   * Roles: ADMIN, DISTRIBUTOR
   */
  @Post('cedula')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'DISTRIBUTOR')
  async consultarCedula(@Body() dto: QueryCedulaDto) {
    return this.consultationsService.consultarCedula(dto.cedula);
  }

  /**
   * Consulta datos de un RUC
   * Endpoint: POST /consultations/ruc
   * Roles: ADMIN, DISTRIBUTOR
   */
  @Post('ruc')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'DISTRIBUTOR')
  async consultarRuc(@Body() dto: QueryRucDto) {
    return this.consultationsService.consultarRuc(dto.ruc);
  }
}
