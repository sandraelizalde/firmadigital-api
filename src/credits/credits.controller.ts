import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Patch,
  Param,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CreditsService } from './credits.service';
import { CreateCreditDto } from './dto/create-credit.dto';
import { CreditCutoffsQueryDto } from './dto/credit-cutoffs-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('Créditos')
@Controller('credits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) { }

  /**
   * Crear un nuevo crédito para un distribuidor
   * Solo accesible para administradores
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear/activar un crédito para un distribuidor',
    description:
      'Permite a un administrador activar un crédito con días específicos para un distribuidor. El distribuidor podrá emitir firmas a crédito que se cobrarán automáticamente según los cortes diarios.',
  })
  @ApiResponse({
    status: 201,
    description: 'Crédito activado exitosamente',
    schema: {
      example: {
        message: 'Crédito activado exitosamente',
        data: {
          credit: {
            id: 'clx1234567890',
            distributorId: 'clx9876543210',
            creditDays: 2,
            isActive: true,
            isBlocked: false,
            assignedBy: 'Admin Name',
            createdAt: '2024-06-01T12:00:00.000Z',
            updatedAt: '2024-06-01T12:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'El distribuidor ya tiene un crédito activo o tiene deudas pendientes',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo administradores',
  })
  async createCredit(@Body() createCreditDto: CreateCreditDto, @Request() req) {
    const adminName = req.user.firstName + ' ' + req.user.lastName;

    return this.creditsService.createCredit(createCreditDto, adminName);
  }

  @Patch(':distributorId/deactivate')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactivar el crédito de un distribuidor',
    description:
      'Desactiva el crédito activo de un distribuidor. Solo se puede desactivar si no tiene deudas pendientes.',
  })
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    example: 'clx9876543210',
  })
  @ApiResponse({
    status: 200,
    description: 'Crédito desactivado exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Crédito desactivado exitosamente',
        data: {
          credit: {
            id: 'clx1234567890',
            distributorId: 'clx9876543210',
            creditDays: 2,
            isActive: false,
            isBlocked: false,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'El distribuidor no tiene crédito activo o tiene deudas pendientes',
    schema: {
      example: {
        success: false,
        message:
          'No se puede desactivar el crédito. El distribuidor tiene una deuda pendiente de $150.00',
        data: {
          totalOwed: 15000,
          unpaidCutoffs: 2,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo administradores',
  })
  async deactivateCredit(
    @Param('distributorId') distributorId: string,
    @Request() req,
  ) {
    const adminName = req.user.firstName + ' ' + req.user.lastName;
    return this.creditsService.deactivateCredit(distributorId, adminName);
  }

  @Patch(':distributorId/reactivate')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reactivar un crédito desactivado',
    description:
      'Reactiva el crédito más reciente de un distribuidor que fue desactivado previamente. Solo se puede reactivar si no tiene deudas pendientes.',
  })
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    example: 'clx9876543210',
  })
  @ApiResponse({
    status: 200,
    description: 'Crédito reactivado exitosamente',
    schema: {
      example: {
        message: 'Crédito reactivado exitosamente',
        data: {
          credit: {
            id: 'clx1234567890',
            distributorId: 'clx9876543210',
            creditDays: 2,
            isActive: true,
            isBlocked: false,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'No hay crédito para reactivar, ya tiene uno activo, o tiene deudas pendientes',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo administradores',
  })
  async reactivateCredit(
    @Param('distributorId') distributorId: string,
    @Request() req,
  ) {
    const adminName = req.user.firstName + ' ' + req.user.lastName;
    return this.creditsService.reactivateCredit(distributorId, adminName);
  }

  @Patch(':distributorId/force-unblock')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[EMERGENCIA] Desbloquear forzadamente un crédito',
    description:
      '⚠️ SOLO PARA EMERGENCIAS: Desbloquea forzadamente el crédito de un distribuidor sin validar deudas pendientes. Usar solo en casos de errores del sistema.',
  })
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    example: 'clx9876543210',
  })
  @ApiResponse({
    status: 200,
    description: 'Crédito desbloqueado exitosamente',
    schema: {
      example: {
        message: 'Crédito desbloqueado exitosamente (forzado)',
        data: {
          credit: {
            id: 'clx1234567890',
            distributorId: 'clx9876543210',
            creditDays: 2,
            isActive: true,
            isBlocked: false,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'El distribuidor no tiene un crédito activo',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo administradores',
  })
  async forceUnblockCredit(
    @Param('distributorId') distributorId: string,
    @Request() req,
  ) {
    const adminName = req.user.firstName + ' ' + req.user.lastName;
    return this.creditsService.forceUnblockCredit(distributorId, adminName);
  }

  @Get(':distributorId/summary')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener resumen del crédito de un distribuidor',
    description:
      'Obtiene información detallada del crédito activo del distribuidor, incluyendo cortes, montos usados, pagados y pendientes.',
  })
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    example: 'clx9876543210',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen del crédito obtenido exitosamente',
    schema: {
      example: {
        hasCredit: true,
        creditDays: 2,
        isBlocked: false,
        totalUsed: 50000,
        totalPaid: 30000,
        totalOwed: 20000,
        cutoffs: [
          {
            id: 'clx111',
            cutoffDate: '2026-01-14T00:00:00.000Z',
            paymentDueDate: '2026-01-16T23:57:59.999Z',
            amountUsed: 25000,
            amountPaid: 25000,
            isPaid: true,
            isOverdue: false,
            signaturesCount: 5,
          },
          {
            id: 'clx222',
            cutoffDate: '2026-01-15T00:00:00.000Z',
            paymentDueDate: '2026-01-17T23:57:59.999Z',
            amountUsed: 25000,
            amountPaid: 5000,
            isPaid: false,
            isOverdue: false,
            signaturesCount: 5,
          },
        ],
        unpaidCutoffs: [
          {
            id: 'clx222',
            cutoffDate: '2026-01-15T00:00:00.000Z',
            paymentDueDate: '2026-01-17T23:57:59.999Z',
            amountUsed: 25000,
            amountPaid: 5000,
            isPaid: false,
            isOverdue: false,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'El distribuidor no tiene crédito activo',
    schema: {
      example: {
        hasCredit: false,
        message: 'El distribuidor no tiene crédito activo',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  async getCreditSummary(@Param('distributorId') distributorId: string) {
    return this.creditsService.getAllDistributorCredits(distributorId);
  }

  @Get(':distributorId/can-emit')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar si el distribuidor puede emitir firmas',
    description:
      'Verifica si el distribuidor tiene permitido emitir firmas. Devuelve false si tiene un crédito bloqueado por falta de pago.',
  })
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    example: 'clx9876543210',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de emisión obtenido exitosamente',
    schema: {
      example: {
        canEmit: true,
        hasCredit: true,
        isBlocked: false,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  async canEmitSignature(@Param('distributorId') distributorId: string) {
    const canEmit = await this.creditsService.canEmitSignature(distributorId);

    const credit = await this.creditsService[
      'prisma'
    ].distributorCredit.findFirst({
      where: {
        distributorId,
        isActive: true,
      },
    });

    return {
      canEmit,
      hasCredit: !!credit,
      isBlocked: credit?.isBlocked || false,
    };
  }

  /**
   * Obtener cortes de crédito de un distribuidor con filtros
   * Solo accesible para administradores
   */
  @Get('admin/:distributorId/cutoffs')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN] Obtener cortes de crédito de un distribuidor',
    description:
      'Obtiene todos los cortes de crédito de un distribuidor específico con paginación y filtros de fecha. Incluye información detallada de cada corte y totales agregados.',
  })
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    example: 'clx9876543210',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Elementos por página',
    example: 10,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Fecha de inicio del rango (ISO 8601)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Fecha de fin del rango (ISO 8601)',
    example: '2026-01-31T23:59:59.999Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de cortes de crédito con paginación y totales',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'clx222',
            distributorId: 'clx9876543210',
            creditId: 'clx1234567890',
            cutoffDate: '2026-01-15T00:00:00.000Z',
            paymentDueDate: '2026-01-17T23:59:59.999Z',
            amountUsed: 25000,
            amountPaid: 5000,
            isPaid: false,
            isOverdue: false,
            signaturesCount: 5,
            signaturesDetails: '["sig1","sig2","sig3","sig4","sig5"]',
            createdAt: '2026-01-15T10:30:00.000Z',
            updatedAt: '2026-01-16T08:15:00.000Z',
            credit: {
              id: 'clx1234567890',
              creditDays: 2,
              isActive: true,
              isBlocked: false,
              assignedBy: 'Admin Name',
            },
          },
        ],
        pagination: {
          total: 45,
          page: 1,
          limit: 10,
          totalPages: 5,
        },
        totals: {
          totalUsed: 125000,
          totalPaid: 85000,
          totalOwed: 40000,
          totalSignatures: 25,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo administradores',
  })
  async getDistributorCreditCutoffs(
    @Param('distributorId') distributorId: string,
    @Query() query: CreditCutoffsQueryDto,
  ) {
    return this.creditsService.getDistributorCreditCutoffs(
      distributorId,
      query.page,
      query.limit,
      query.startDate,
      query.endDate,
    );
  }

  /**
   * [TESTING] Disparar manualmente el proceso de cobros (Cron 23:59)
   */
  @Post('test/trigger-payments')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: '[TEST] Disparar manualmente cobros de cortes' })
  async triggerPayments() {
    await this.creditsService.processPaymentAttempts();
    return { message: 'Proceso de cobros ejecutado manualmente' };
  }

  /**
   * [TESTING] Disparar manualmente la verificación de vencidos (Cron 00:01)
   */
  @Post('test/trigger-check-overdue')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: '[TEST] Disparar manualmente verificación de bloqueos' })
  async triggerCheckOverdue() {
    await this.creditsService.checkOverdueCutoffs();
    return { message: 'Verificación de vencidos ejecutada manualmente' };
  }
}
