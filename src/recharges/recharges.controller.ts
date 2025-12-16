import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { RechargesService } from './recharges.service';
import { CreateRechargeDto } from './dto/create-recharge.dto';
import { ManualRechargeDto } from './dto/manual-recharge.dto';
import { ReviewRechargeDto } from './dto/review-recharge.dto';
import { InitCardRechargeDto } from './dto/init-card-recharge.dto';
import { PayphoneConfirmationDto } from './dto/payphone-confirmation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, RechargeStatus } from '@prisma/client';

@ApiTags('Recargas')
@Controller('recharges')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RechargesController {
  constructor(private readonly rechargesService: RechargesService) {}

  // ==========================================
  // ENDPOINTS PARA DISTRIBUIDORES
  // ==========================================

  /**
   * Solicitar una nueva recarga
   * - TRANSFER: queda pendiente de aprobación
   */
  @Post()
  @Roles(Role.DISTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Solicitar una nueva recarga',
    description:
      'Permite a un distribuidor solicitar una recarga. Si es por transferencia queda PENDING hasta aprobación del admin. Si es por tarjeta se procesa con Payphone.',
  })
  @ApiResponse({
    status: 201,
    description: 'Recarga creada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o distribuidor inactivo',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async createRecharge(@Request() req, @Body() dto: CreateRechargeDto) {
    return this.rechargesService.createRecharge(req.user.id, dto);
  }

  /**
   * Iniciar recarga con tarjeta (Payphone)
   * Crea la recarga y devuelve los datos necesarios para la cajita de pagos
   */
  @Post('init-card-recharge')
  @Roles(Role.DISTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Iniciar recarga con tarjeta (Payphone)',
    description:
      'Crea una recarga PENDING y devuelve los datos necesarios para mostrar la cajita de pagos de Payphone en el frontend',
  })
  @ApiResponse({
    status: 201,
    description:
      'Recarga iniciada, retorna datos para configurar cajita de Payphone',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o distribuidor inactivo',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async initCardRecharge(@Request() req, @Body() dto: InitCardRechargeDto) {
    return this.rechargesService.initCardRecharge(req.user.id, dto);
  }

  /**
   * Confirmar pago de recarga con Payphone
   * Se llama desde el frontend después de que Payphone redirige con los parámetros
   */
  @Post('confirm-card-recharge')
  @Roles(Role.DISTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirmar pago de recarga con Payphone',
    description:
      'Confirma el estado de una recarga con tarjeta consultando la API de Payphone. Se debe llamar dentro de los 5 minutos posteriores al pago.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recarga confirmada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Recarga ya procesada o error en la confirmación',
  })
  @ApiResponse({ status: 404, description: 'Recarga no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async confirmCardRecharge(
    @Request() req,
    @Body() dto: PayphoneConfirmationDto,
  ) {
    return this.rechargesService.confirmCardRecharge(req.user.id, dto);
  }

  /**
   * Obtener historial de recargas del distribuidor autenticado
   */
  @Get('my-recharges')
  @Roles(Role.DISTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener mi historial de recargas',
    description: 'Retorna todas las recargas del distribuidor autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de recargas del distribuidor',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getMyRecharges(@Request() req) {
    return this.rechargesService.getMyRecharges(req.user.id);
  }

  /**
   * Obtener una recarga específica del distribuidor
   */
  @Get('my-recharges/:id')
  @Roles(Role.DISTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener detalle de una recarga específica',
    description: 'Retorna el detalle completo de una recarga del distribuidor',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la recarga',
    example: 'clxxx123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la recarga',
  })
  @ApiResponse({ status: 404, description: 'Recarga no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getMyRecharge(@Request() req, @Param('id') id: string) {
    return this.rechargesService.getMyRecharge(req.user.id, id);
  }

  /**
   * Obtener movimientos de cuenta del distribuidor
   */
  @Get('my-account-movements')
  @Roles(Role.DISTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener mis movimientos de cuenta',
    description:
      'Retorna todos los movimientos de cuenta (ingresos, egresos, ajustes) del distribuidor',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de movimientos de cuenta',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getMyAccountMovements(@Request() req) {
    return this.rechargesService.getAccountMovements(req.user.id);
  }

  // ==========================================
  // ENDPOINTS PARA ADMIN
  // ==========================================

  /**
   * ADMIN: Obtener todas las recargas
   * Query param opcional: status (PENDING, APPROVED, REJECTED, FAILED)
   */
  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[ADMIN] Obtener todas las recargas',
    description:
      'Retorna todas las recargas del sistema, con filtro opcional por estado',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RechargeStatus,
    description: 'Filtrar por estado de recarga',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de recargas',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Requiere rol de administrador' })
  async getAllRecharges(@Query('status') status?: RechargeStatus) {
    return this.rechargesService.getAllRecharges(status);
  }

  /**
   * ADMIN: Obtener recargas pendientes
   */
  @Get('admin/pending')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[ADMIN] Obtener recargas pendientes',
    description: 'Retorna solo las recargas en estado PENDING',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de recargas pendientes',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Requiere rol de administrador' })
  async getPendingRecharges() {
    return this.rechargesService.getAllRecharges(RechargeStatus.PENDING);
  }

  /**
   * ADMIN: Obtener una recarga específica
   */
  @Get('admin/:id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[ADMIN] Obtener detalle de una recarga',
    description: 'Retorna el detalle completo de cualquier recarga del sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la recarga',
    example: 'clxxx123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la recarga',
  })
  @ApiResponse({ status: 404, description: 'Recarga no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Requiere rol de administrador' })
  async getRechargeById(@Param('id') id: string) {
    return this.rechargesService.getRechargeById(id);
  }

  /**
   * ADMIN: Aprobar o rechazar una recarga
   */
  @Patch('admin/:id/review')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[ADMIN] Aprobar o rechazar una recarga',
    description:
      'Permite al admin aprobar o rechazar una recarga pendiente. Si se aprueba, se acredita el monto al balance del distribuidor.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la recarga',
    example: 'clxxx123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Recarga revisada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Recarga ya fue procesada o datos inválidos',
  })
  @ApiResponse({ status: 404, description: 'Recarga no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Requiere rol de administrador' })
  async reviewRecharge(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ReviewRechargeDto,
  ) {
    return this.rechargesService.reviewRecharge(id, req.user.id, dto);
  }

  /**
   * ADMIN: Asignar recarga manual a un distribuidor
   */
  @Post('admin/manual')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[ADMIN] Asignar recarga manual',
    description:
      'Permite al admin asignar una recarga manual a un distribuidor. Se acredita inmediatamente y queda aprobada automáticamente.',
  })
  @ApiResponse({
    status: 201,
    description: 'Recarga manual asignada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Distribuidor no encontrado',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Requiere rol de administrador' })
  async createManualRecharge(@Request() req, @Body() dto: ManualRechargeDto) {
    return this.rechargesService.createManualRecharge(req.user.id, dto);
  }

  /**
   * ADMIN: Ver movimientos de cuenta de un distribuidor específico
   */
  @Get('admin/distributor/:distributorId/movements')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[ADMIN] Ver movimientos de cuenta de un distribuidor',
    description:
      'Retorna todos los movimientos de cuenta de un distribuidor específico',
  })
  @ApiParam({
    name: 'distributorId',
    description: 'ID del distribuidor',
    example: 'clxxx123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de movimientos de cuenta',
  })
  @ApiResponse({ status: 404, description: 'Distribuidor no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Requiere rol de administrador' })
  async getDistributorAccountMovements(
    @Param('distributorId') distributorId: string,
  ) {
    return this.rechargesService.getDistributorAccountMovements(distributorId);
  }

}
