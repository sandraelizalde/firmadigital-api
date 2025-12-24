import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { Public } from 'src/auth/decorators/public.decorator';

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
  @Public()
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
  @Public()
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
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    type: String,
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
  @Get('distributor/:distributorId')
  @Roles(Role.ADMIN, Role.DISTRIBUTOR)
  async getDistributorPlans(@Param('distributorId') distributorId: string) {
    return await this.plansService.getDistributorPlans(distributorId);
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
    summary: 'Obtener mis planes de persona natural',
    description:
      'Obtiene todos los planes para personas naturales asignados al distribuidor autenticado con sus precios personalizados. Incluye planes para PERSONA_NATURAL_SIN_RUC y PERSONA_NATURAL_CON_RUC.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Lista de planes naturales del distribuidor',
    schema: {
      example: {
        success: true,
        plans: [
          {
            id: 'clx123',
            perfil: 'PN-001',
            basePrice: 79900,
            basePricePromo: 69900,
            duration: '1',
            durationType: 'Y',
            durationPromo: null,
            isPromo: true,
            eligibleClientsType: [
              'PERSONA_NATURAL_SIN_RUC',
              'PERSONA_NATURAL_CON_RUC',
            ],
            customPrice: 75000,
            customPricePromo: 65000,
            isActive: true,
            createdAt: '2024-12-20T10:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo para distribuidores',
  })
  @Get('my-plans/natural')
  @Roles(Role.DISTRIBUTOR)
  async getMyNaturalPlans(@Request() req: any) {
    return await this.plansService.getDistributorNaturalPlans(req.user.userId);
  }

  @ApiOperation({
    summary: 'Obtener mis planes de persona jurídica',
    description:
      'Obtiene todos los planes para personas jurídicas asignados al distribuidor autenticado con sus precios personalizados. Incluye planes con PERSONA_JURIDICA.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Lista de planes jurídicos del distribuidor',
    schema: {
      example: {
        success: true,
        plans: [
          {
            id: 'clx456',
            perfil: 'PJ-003',
            basePrice: 149900,
            basePricePromo: 129900,
            duration: '1',
            durationType: 'Y',
            durationPromo: null,
            isPromo: true,
            eligibleClientsType: ['PERSONA_JURIDICA'],
            customPrice: 140000,
            customPricePromo: 120000,
            isActive: true,
            createdAt: '2024-12-20T10:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo para distribuidores',
  })
  @Get('my-plans/juridica')
  @Roles(Role.DISTRIBUTOR)
  async getMyJuridicalPlans(@Request() req: any) {
    return await this.plansService.getDistributorJuridicalPlans(
      req.user.userId,
    );
  }
}
