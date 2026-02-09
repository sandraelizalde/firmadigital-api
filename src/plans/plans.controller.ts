import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AssignPlansToDistributorDto } from './dto/assign-plan-to-distributor.dto';
import { UpdateDistributorPlanPriceDto } from './dto/update-distributor-plan-price.dto';
import { UpdatePlansToDistributorDto } from './dto/update-plans-to-distributor.dto';
import { CreatePromotionsDto } from './dto/create-promotions.dto';

@ApiTags('Planes')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @ApiOperation({
    summary: 'Listar todos los planes disponibles',
    description: 'Obtiene la lista completa de planes activos en el sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de planes obtenida exitosamente',
  })
  @Get()
  @Roles(Role.ADMIN)
  async getAllPlans() {
    return await this.plansService.getAllPlans();
  }

  @ApiOperation({
    summary: 'Obtener detalles de un plan específico',
    description: 'Obtiene información detallada de un plan por su ID',
  })
  @ApiParam({
    name: 'planId',
    description: 'ID del plan',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Plan encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Plan no encontrado',
  })
  @Get(':planId')
  @Roles(Role.ADMIN, Role.DISTRIBUTOR)
  async getPlanById(@Param('planId') planId: string) {
    return await this.plansService.getPlanById(planId);
  }

  @ApiOperation({
    summary:
      'Asignar múltiples planes a distribuidor con precios personalizados',
    description:
      'Permite a un administrador asignar múltiples planes a un distribuidor de una sola vez, cada uno con sus precios personalizados. Se registra automáticamente quién realizó la asignación. Si algún plan ya está asignado, se rechaza toda la operación.',
  })
  @ApiBody({ type: AssignPlansToDistributorDto })
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'Planes asignados exitosamente al distribuidor',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: '5 planes asignados exitosamente al distribuidor',
        },
        distributor: {
          type: 'object',
          description: 'Información del distribuidor',
        },
        assignments: {
          type: 'array',
          description:
            'Lista de asignaciones creadas con detalles de cada plan',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Uno o más planes no fueron encontrados o están inactivos',
  })
  @ApiResponse({
    status: 404,
    description: 'Distribuidor no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Algunos planes ya están asignados al distribuidor',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT inválido o faltante',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Solo administradores pueden asignar planes',
  })
  @Post('assign')
  @Roles(Role.ADMIN)
  async assignPlansToDistributor(
    @Body() data: AssignPlansToDistributorDto,
    @Request() req: any,
  ) {
    return await this.plansService.assignPlansToDistributor(data, req.user);
  }

  @ApiOperation({
    summary:
      'Actualizar múltiples planes de un distribuidor con precios personalizados',
    description:
      'Permite a un administrador actualizar los precios de múltiples planes ya asignados a un distribuidor. Si el plan jurídico tiene un plan natural equivalente asignado, también se actualiza automáticamente.',
  })
  @ApiBody({ type: UpdatePlansToDistributorDto })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Planes actualizados exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example:
            '6 planes actualizados exitosamente (3 jurídicos + 3 naturales)',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Uno o más planes no fueron encontrados, no son jurídicos o no están asignados',
  })
  @ApiResponse({
    status: 404,
    description: 'Distribuidor no encontrado',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT inválido o faltante',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Solo administradores pueden actualizar planes',
  })
  @Patch('update-plans')
  @Roles(Role.ADMIN)
  async updatePlansToDistributor(@Body() data: UpdatePlansToDistributorDto) {
    return await this.plansService.updatePlansToDistributor(data);
  }

  @ApiOperation({
    summary: 'Actualizar precios personalizados de un plan asignado',
    description:
      'Permite a un administrador modificar los precios personalizados de un plan ya asignado a un distribuidor.',
  })
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    type: String,
  })
  @ApiParam({
    name: 'planId',
    description: 'ID del plan',
    type: String,
  })
  @ApiBody({ type: UpdateDistributorPlanPriceDto })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Precios actualizados exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Plan no asignado a este distribuidor',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Solo administradores',
  })
  @Patch(':distributorId/:planId')
  @Roles(Role.ADMIN)
  async updateDistributorPlanPrice(
    @Param('distributorId') distributorId: string,
    @Param('planId') planId: string,
    @Body() data: UpdateDistributorPlanPriceDto,
    @Request() req: any,
  ) {
    return await this.plansService.updateDistributorPlanPrice(
      distributorId,
      planId,
      data,
      req.user,
    );
  }

  @ApiOperation({
    summary: 'Listar planes asignados a un distribuidor',
    description:
      'Obtiene todos los planes activos asignados a un distribuidor específico con sus precios personalizados.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Lista de planes del distribuidor',
  })
  @ApiResponse({
    status: 404,
    description: 'Distribuidor no encontrado',
  })
  @Get('distributor/my-plans')
  @Roles(Role.ADMIN, Role.DISTRIBUTOR)
  async getDistributorPlans(@Request() req: any) {
    const id = req.user.userId;
    return await this.plansService.getDistributorPlans(id);
  }

  @ApiOperation({
    summary: 'Desactivar plan para un distribuidor',
    description:
      'Desactiva un plan asignado a un distribuidor (soft delete). El plan dejará de estar disponible pero se mantiene el historial.',
  })
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    type: String,
  })
  @ApiParam({
    name: 'planId',
    description: 'ID del plan',
    type: String,
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Plan desactivado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Plan no asignado a este distribuidor',
  })
  @Delete(':distributorId/:planId')
  @Roles(Role.ADMIN)
  async deactivateDistributorPlan(
    @Param('distributorId') distributorId: string,
    @Param('planId') planId: string,
  ) {
    return await this.plansService.deactivateDistributorPlan(
      distributorId,
      planId,
    );
  }

  @ApiOperation({
    summary: 'Activar plan para un distribuidor',
    description:
      'Re-activa un plan previamente desactivado para un distribuidor.',
  })
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    type: String,
  })
  @ApiParam({
    name: 'planId',
    description: 'ID del plan',
    type: String,
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Plan activado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Plan no asignado a este distribuidor',
  })
  @Patch(':distributorId/:planId/activate')
  @Roles(Role.ADMIN)
  async activateDistributorPlan(
    @Param('distributorId') distributorId: string,
    @Param('planId') planId: string,
  ) {
    return await this.plansService.activateDistributorPlan(
      distributorId,
      planId,
    );
  }

  @ApiOperation({
    summary: 'Listar todos los distribuidores con sus planes',
    description:
      'Obtiene una lista completa de todos los distribuidores activos con sus planes asignados y precios personalizados.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Lista de distribuidores con planes',
  })
  @Get('distributors/all')
  @Roles(Role.ADMIN)
  async getAllDistributorsWithPlans() {
    return await this.plansService.getAllDistributorsWithPlans();
  }

  @ApiOperation({
    summary: 'Obtener planes filtrados según tipo de persona y proveedor',
    description:
      'Obtiene los planes asignados al distribuidor autenticado filtrados por tipo de persona (NATURAL/JURIDICA), documento (CEDULA/PASAPORTE) y si usa token. Devuelve solo los planes con perfil correspondiente no nulo.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Lista de planes filtrados del distribuidor',
    schema: {
      example: {
        success: true,
        plans: [
          {
            id: 'clx123',
            perfil: '002',
            duration: '1',
            durationType: 'Y',
            customPrice: 149900,
            customPricePromo: null,
            isActive: true,
            createdAt: '2024-12-20T10:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo para distribuidores',
  })
  @Get('my-plans/filtered')
  @Roles(Role.DISTRIBUTOR)
  async getMyPlansFiltered(
    @Request() req: any,
    @Query('tipoPersona') tipoPersona: 'NATURAL' | 'JURIDICA',
    @Query('documento') documento?: 'CEDULA' | 'PASAPORTE',
    @Query('usaToken') usaToken?: string,
  ) {
    const usaTokenBool = usaToken === 'true';
    return await this.plansService.getDistributorPlansFiltered(
      req.user.userId,
      tipoPersona,
      documento || null,
      usaTokenBool,
    );
  }

  @ApiOperation({
    summary: 'Crear promociones para los planes de los distribuidores',
    description:
      'Permite a un administrador actualizar promociones para los planes de los distribuidores, estableciendo precios promocionales personalizados para cada distribuidor.',
  })
  @ApiBody({ type: CreatePromotionsDto })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Promociones creadas exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Promociones creadas exitosamente para 10 distribuidores',
        },
        updatedCount: {
          type: 'number',
          example: 10,
          description: 'Número total de asignaciones de planes actualizadas',
        },
        distributorsProcessed: {
          type: 'number',
          example: 10,
          description: 'Número de distribuidores procesados',
        },
        priceGroupsProcessed: {
          type: 'number',
          example: 3,
          description: 'Número de grupos de precios únicos procesados',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos - Verifique el formato y los valores proporcionados',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT inválido o faltante',
  })
  @Roles(Role.ADMIN)
  @Post('create-promotions')
  async createPromotionsForDistributors(@Body() data: CreatePromotionsDto) {
    return await this.plansService.createPromotionsForDistributors(data);
  }
}
