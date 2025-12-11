import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { DistributorsService } from './distributors.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateBillingInfoDto } from './dto/create-billing-info.dto';
import { UpdateBillingInfoDto } from './dto/update-billing-info.dto';

@ApiTags('Distribuidores')
@Controller('distributors')
export class DistributorsController {
  constructor(private readonly distributorsService: DistributorsService) {}

  @ApiOperation({
    summary: 'Listar todos los distribuidores',
    description:
      'Obtiene la lista completa de distribuidores activos con su información de facturación y planes asignados',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Lista de distribuidores obtenida exitosamente',
  })
  @Get()
  @Roles(Role.ADMIN)
  async getAllDistributors() {
    return await this.distributorsService.getAllDistributors();
  }

  @ApiOperation({
    summary: 'Obtener información de un distribuidor',
    description:
      'Obtiene información detallada de un distribuidor incluyendo datos de facturación y planes asignados',
  })
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    type: String,
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Información del distribuidor obtenida exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Distribuidor no encontrado',
  })
  @Get(':distributorId')
  @Roles(Role.ADMIN, Role.DISTRIBUTOR)
  async getDistributorById(@Param('distributorId') distributorId: string) {
    return await this.distributorsService.getDistributorById(distributorId);
  }

  @ApiOperation({
    summary: 'Crear información de facturación para un distribuidor',
    description:
      'Permite configurar datos de facturación personalizados para un distribuidor. Si useDistributorData es true, se usarán los datos del distribuidor; si es false, se deben proporcionar datos personalizados.',
  })
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    type: String,
  })
  @ApiBody({ type: CreateBillingInfoDto })
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'Información de facturación creada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Distribuidor no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'El distribuidor ya tiene información de facturación',
  })
  @Post(':distributorId/billing')
  @Roles(Role.ADMIN)
  async createBillingInfo(
    @Param('distributorId') distributorId: string,
    @Body() data: CreateBillingInfoDto,
  ) {
    return await this.distributorsService.createBillingInfo(
      distributorId,
      data,
    );
  }

  @ApiOperation({
    summary: 'Actualizar información de facturación',
    description:
      'Permite modificar los datos de facturación de un distribuidor',
  })
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    type: String,
  })
  @ApiBody({ type: UpdateBillingInfoDto })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Información de facturación actualizada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description:
      'Distribuidor no encontrado o no tiene información de facturación',
  })
  @Patch(':distributorId/billing')
  @Roles(Role.ADMIN)
  async updateBillingInfo(
    @Param('distributorId') distributorId: string,
    @Body() data: UpdateBillingInfoDto,
  ) {
    return await this.distributorsService.updateBillingInfo(
      distributorId,
      data,
    );
  }

  @ApiOperation({
    summary: 'Obtener información de facturación de un distribuidor',
    description:
      'Obtiene los datos de facturación configurados para un distribuidor',
  })
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    type: String,
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Información de facturación obtenida exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Información de facturación no encontrada',
  })
  @Get(':distributorId/billing')
  @Roles(Role.ADMIN, Role.DISTRIBUTOR)
  async getBillingInfo(@Param('distributorId') distributorId: string) {
    return await this.distributorsService.getBillingInfo(distributorId);
  }
}
