import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SendBulkNotificationsDto } from './dto/send-bulk-notifications.dto';

@ApiTags('Notificaciones')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Enviar notificaciones masivas por WhatsApp',
    description:
      'Envía notificaciones por WhatsApp a múltiples distribuidores de forma eficiente. ' +
      'Agrupa por número de teléfono para evitar duplicados y procesa de forma asíncrona.',
  })
  @ApiBody({ type: SendBulkNotificationsDto })
  @ApiResponse({
    status: 200,
    description: 'Notificaciones en proceso',
    example: {
      success: true,
      message: 'Notificaciones en proceso para 25 distribuidores',
      totalRequested: 30,
      totalFound: 28,
      uniquePhones: 25,
      distributorsWithoutPhone: 3,
      status: 'processing',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  async sendBulkNotifications(@Body() data: SendBulkNotificationsDto) {
    return await this.notificationsService.sendBulkNotifications(data);
  }
}
