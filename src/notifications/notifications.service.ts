import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WhatsappService } from './whatsapp.service';
import { SendBulkNotificationsDto } from './dto/send-bulk-notifications.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) {}

  /**
   * Envía notificaciones masivas a distribuidores
   */
  async sendBulkNotifications(data: SendBulkNotificationsDto) {
    const { distributorIds, message } = data;

    // Eliminar IDs duplicados
    const uniqueDistributorIds = [...new Set(distributorIds)];

    this.logger.log(
      `Iniciando envío de notificaciones a ${uniqueDistributorIds.length} distribuidores`,
    );

    // Obtener información de distribuidores activos
    const distributorsInfo = await this.prisma.distributor.findMany({
      where: {
        id: { in: uniqueDistributorIds },
        active: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        socialReason: true,
        phone: true,
      },
    });

    // Validar que se encontraron distribuidores
    if (distributorsInfo.length === 0) {
      this.logger.warn('No se encontraron distribuidores activos');
      return {
        success: false,
        message: 'No se encontraron distribuidores activos',
        totalRequested: uniqueDistributorIds.length,
        totalFound: 0,
        notificationsSent: 0,
        notificationsFailed: 0,
        distributorsWithoutPhone: 0,
      };
    }

    // Agrupar por número de teléfono para evitar enviar duplicados al mismo número
    const phoneGroups = new Map<string, (typeof distributorsInfo)[0]>();
    let distributorsWithoutPhone = 0;

    distributorsInfo.forEach((dist) => {
      if (!dist.phone) {
        distributorsWithoutPhone++;
        this.logger.warn(
          `Distribuidor ${dist.id} no tiene teléfono registrado`,
        );
        return;
      }

      // Si el teléfono no está en el mapa, agregarlo
      if (!phoneGroups.has(dist.phone)) {
        phoneGroups.set(dist.phone, dist);
      }
    });

    this.logger.log(
      `Se encontraron ${phoneGroups.size} números únicos para notificar`,
    );

    // Enviar notificaciones de forma asíncrona
    this.sendNotificationsAsync(phoneGroups, message).catch((err) =>
      this.logger.error(
        `Error en notificaciones en segundo plano: ${err.message}`,
      ),
    );

    return {
      success: true,
      message: `Notificaciones en proceso para ${phoneGroups.size} distribuidores`,
      totalRequested: uniqueDistributorIds.length,
      totalFound: distributorsInfo.length,
      uniquePhones: phoneGroups.size,
      distributorsWithoutPhone,
      status: 'processing',
    };
  }

  /**
   * Envía las notificaciones de forma asíncrona
   * @private
   */
  private async sendNotificationsAsync(
    phoneGroups: Map<string, any>,
    message: string,
  ) {
    let sent = 0;
    let failed = 0;

    for (const [phone, dist] of phoneGroups) {
      const name =
        dist.firstName || dist.lastName || dist.socialReason || 'Distribuidor';

      try {
        // Usar plantilla notificaciones_distribuidores con nombre y mensaje
        await this.whatsappService.sendTemplate(
          phone,
          'notificaciones_distribuidores',
          [name, message],
        );
        sent++;
        this.logger.log(
          `Notificación enviada a ${name} (${phone}) - ${dist.id}`,
        );
      } catch (error) {
        failed++;
        this.logger.error(
          `Error enviando notificación al distribuidor ${dist.id} (${phone}): ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Proceso de notificaciones completado: ${sent} enviadas, ${failed} fallidas`,
    );
  }
}
