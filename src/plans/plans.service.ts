import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignPlansToDistributorDto } from './dto/assign-plan-to-distributor.dto';
import { UpdateDistributorPlanPriceDto } from './dto/update-distributor-plan-price.dto';
import { UpdatePlansToDistributorDto } from './dto/update-plans-to-distributor.dto';
import { CreatePromotionsDto } from './dto/create-promotions.dto';
import { TypeClient } from '@prisma/client';
import { MailService } from 'src/mail/mail.service';
import { WhatsappService } from 'src/notifications/whatsapp.service';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly whatsappService: WhatsappService,
  ) {}

  // Listar todos los planes disponibles
  async getAllPlans() {
    return await this.prisma.plan.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ durationType: 'asc' }, { duration: 'asc' }],
    });
  }

  // Obtener un plan por ID
  async getPlanById(planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException({
        message: 'Plan no encontrado',
        error: 'PLAN_NOT_FOUND',
      });
    }

    return plan;
  }

  // Asignar múltiples planes con precios personalizados a un distribuidor
  async assignPlansToDistributor(
    data: AssignPlansToDistributorDto,
    adminUser: any,
  ) {
    // Verificar que el distribuidor existe
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: data.distributorId },
    });

    if (!distributor) {
      throw new NotFoundException({
        message: 'Distribuidor no encontrado',
        error: 'DISTRIBUTOR_NOT_FOUND',
      });
    }

    // Obtener todos los planes enviados
    const planIds = data.plans.map((p) => p.planId);
    const plans = await this.prisma.plan.findMany({
      where: {
        id: { in: planIds },
        isActive: true,
      },
    });

    // Validar que todos los planes existen
    if (plans.length !== planIds.length) {
      throw new BadRequestException({
        message: 'Algunos planes no existen o están inactivos',
        error: 'INVALID_PLANS',
      });
    }

    // Preparar las asignaciones
    const allAssignments: Array<{
      distributorId: string;
      planId: string;
      customPrice: number;
      customPricePromo: number | undefined;
      createdBy: any;
      createdByName: string;
      isActive: boolean;
    }> = [];

    for (const planData of data.plans) {
      allAssignments.push({
        distributorId: data.distributorId,
        planId: planData.planId,
        customPrice: planData.customPrice,
        customPricePromo: planData.customPricePromo,
        createdBy: adminUser.userId,
        createdByName: `${adminUser.firstName} ${adminUser.lastName}`,
        isActive: true,
      });
    }

    // Crear todas las asignaciones en una transacción
    const assignments = await this.prisma.$transaction(
      allAssignments.map((assignmentData) =>
        this.prisma.distributorPlanPrice.create({
          data: assignmentData,
          include: {
            plan: true,
          },
        }),
      ),
    );

    // Enviar contrato por correo
    try {
      await this.mailService.sendContract(distributor, assignments);
      console.log('Contrato enviado por correo exitosamente');
    } catch (error) {
      // Log error pero no fallar la operación
      console.error('Error al enviar contrato:', error);
    }

    return {
      success: true,
      message: `${assignments.length} plan(es) asignado(s) exitosamente al distribuidor`,
      distributor: {
        id: distributor.id,
        firstName: distributor.firstName,
        lastName: distributor.lastName,
        socialReason: distributor.socialReason,
        email: distributor.email,
      },
      assignments,
    };
  }

  // Actualizar precios personalizados de un plan asignado
  async updateDistributorPlanPrice(
    distributorId: string,
    planId: string,
    data: UpdateDistributorPlanPriceDto,
    adminUser: any,
  ) {
    // Verificar que la asignación existe
    const assignment = await this.prisma.distributorPlanPrice.findUnique({
      where: {
        distributorId_planId: {
          distributorId,
          planId,
        },
      },
      include: {
        plan: true,
        distributor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            socialReason: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException({
        message: 'Plan no asignado a este distribuidor',
        error: 'ASSIGNMENT_NOT_FOUND',
      });
    }

    // Actualizar precios
    const updatedAssignment = await this.prisma.distributorPlanPrice.update({
      where: {
        distributorId_planId: {
          distributorId,
          planId,
        },
      },
      data: {
        customPrice: data.customPrice ?? assignment.customPrice,
        customPricePromo: data.customPricePromo ?? assignment.customPricePromo,
      },
      include: {
        plan: true,
        distributor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            socialReason: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Precios actualizados exitosamente',
      assignment: updatedAssignment,
    };
  }

  // Listar planes asignados a un distribuidor
  async getDistributorPlans(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });
    console.log('Obteniendo planes para distribuidor:', distributorId);

    if (!distributor) {
      throw new NotFoundException({
        message: 'Distribuidor no encontrado',
        error: 'DISTRIBUTOR_NOT_FOUND',
      });
    }

    const assignments = await this.prisma.distributorPlanPrice.findMany({
      where: {
        distributorId,
        isActive: true,
      },
      include: {
        plan: true,
      },
      orderBy: [
        {
          plan: {
            durationType: 'asc',
          },
        },
        {
          plan: {
            duration: 'asc',
          },
        },
      ],
    });

    const plansDistributor = assignments.map((a) => {
      const personaNatural: string[] = [];
      const personaJuridica: string[] = [];

      // Verificar disponibilidad para Persona Natural
      if (a.plan.perfilNaturalEnext) personaNatural.push('cedula');
      if (a.plan.perfilNaturalUanataca) personaNatural.push('pasaporte');
      if (a.plan.perfilNaturalTokenUanataca) personaNatural.push('token');

      // Verificar disponibilidad para Persona Jurídica
      if (a.plan.perfilJuridicoEnext) personaJuridica.push('cedula');
      if (a.plan.perfilJuridicoUanataca) personaJuridica.push('pasaporte');
      if (a.plan.perfilJuridicoTokenUanataca) personaJuridica.push('token');

      // Solo exponer precio promo si la promo está activa por fechas
      const promoActive = this.isPromoCurrentlyActive(
        a.customPricePromo,
        a.promoStartDate,
        a.promoEndDate,
      );

      return {
        planId: a.plan.id,
        price: a.customPrice,
        pricePromo: promoActive ? a.customPricePromo : null,
        promoStartDate: a.promoStartDate,
        promoEndDate: a.promoEndDate,
        duration: this.formatDuration(a.plan.duration, a.plan.durationType),
        availableFor: {
          personaNatural,
          personaJuridica,
        },
      };
    });

    return {
      success: true,
      plans: plansDistributor,
    };
  }

  // Desactivar asignación de plan (soft delete)
  async deactivateDistributorPlan(distributorId: string, planId: string) {
    const assignment = await this.prisma.distributorPlanPrice.findUnique({
      where: {
        distributorId_planId: {
          distributorId,
          planId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException({
        message: 'Plan no asignado a este distribuidor',
        error: 'ASSIGNMENT_NOT_FOUND',
      });
    }

    await this.prisma.distributorPlanPrice.update({
      where: {
        distributorId_planId: {
          distributorId,
          planId,
        },
      },
      data: {
        isActive: false,
      },
    });

    return {
      success: true,
      message: 'Plan desactivado para el distribuidor',
    };
  }

  // Activar asignación de plan
  async activateDistributorPlan(distributorId: string, planId: string) {
    const assignment = await this.prisma.distributorPlanPrice.findUnique({
      where: {
        distributorId_planId: {
          distributorId,
          planId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException({
        message: 'Plan no asignado a este distribuidor',
        error: 'ASSIGNMENT_NOT_FOUND',
      });
    }

    await this.prisma.distributorPlanPrice.update({
      where: {
        distributorId_planId: {
          distributorId,
          planId,
        },
      },
      data: {
        isActive: true,
      },
    });

    return {
      success: true,
      message: 'Plan activado para el distribuidor',
    };
  }

  // Listar todos los distribuidores con sus planes asignados
  async getAllDistributorsWithPlans() {
    const distributors = await this.prisma.distributor.findMany({
      where: { active: true },
      include: {
        planPrices: {
          where: { isActive: true },
          include: {
            plan: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      distributors: distributors.map((d) => ({
        id: d.id,
        firstName: d.firstName,
        lastName: d.lastName,
        socialReason: d.socialReason,
        email: d.email,
        identification: d.identification,
        plansCount: d.planPrices.length,
        plans: d.planPrices,
      })),
    };
  }

  /**
   * Método unificado para obtener planes según parámetros
   * @param distributorId ID del distribuidor
   * @param tipoPersona NATURAL o JURIDICA
   * @param documento CEDULA, PASAPORTE o null
   * @param usaToken si usa token de Uanataca
   */
  async getDistributorPlansFiltered(
    distributorId: string,
    tipoPersona: 'NATURAL' | 'JURIDICA',
    documento?: 'CEDULA' | 'PASAPORTE' | null,
    usaToken?: boolean,
  ) {
    // Determinar qué campo de perfil usar
    let perfilField: string;

    switch (true) {
      // NATURAL
      case tipoPersona === 'NATURAL' && documento === 'PASAPORTE':
        perfilField = 'perfilNaturalUanataca';
        break;

      case tipoPersona === 'NATURAL' && usaToken:
        perfilField = 'perfilNaturalTokenUanataca';
        break;

      case tipoPersona === 'NATURAL':
        perfilField = 'perfilNaturalEnext';
        break;

      // JURIDICA
      case tipoPersona === 'JURIDICA' && usaToken:
        perfilField = 'perfilJuridicoTokenUanataca';
        break;

      case tipoPersona === 'JURIDICA' && documento === 'PASAPORTE':
        perfilField = 'perfilJuridicoUanataca';
        break;

      case tipoPersona === 'JURIDICA':
        perfilField = 'perfilJuridicoEnext';
        break;

      default:
        throw new BadRequestException('No se pudo determinar el perfil');
    }

    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId, active: true },
    });

    if (!distributor) {
      throw new NotFoundException({
        message: 'Distribuidor no encontrado o inactivo',
        error: 'DISTRIBUTOR_NOT_FOUND',
      });
    }

    const assignments = await this.prisma.distributorPlanPrice.findMany({
      where: {
        distributorId,
        isActive: true,
        plan: {
          [perfilField]: { not: null },
          isActive: true,
        },
      },
      include: {
        plan: true,
      },
      orderBy: [
        { plan: { durationType: 'asc' } },
        { plan: { duration: 'asc' } },
      ],
    });

    const now = new Date();

    return {
      success: true,
      plans: assignments.map((a) => {
        // Solo exponer precio promo si la promo está activa por fechas
        const promoActive = this.isPromoCurrentlyActive(
          a.customPricePromo,
          a.promoStartDate,
          a.promoEndDate,
        );

        return {
          id: a.plan.id,
          perfil: a.plan[perfilField],
          duration: a.plan.duration,
          durationType: a.plan.durationType,
          customPrice: a.customPrice,
          customPricePromo: promoActive ? a.customPricePromo : null,
          promoStartDate: a.promoStartDate,
          promoEndDate: a.promoEndDate,
          isActive: a.isActive,
          createdAt: a.createdAt,
        };
      }),
    };
  }

  /**
   * Actualizar múltiples planes de un distribuidor con precios personalizados
   */
  async updatePlansToDistributor(data: UpdatePlansToDistributorDto) {
    const planIds = data.plans.map((p) => p.planId);

    // Verificar que todos los planes existen
    const plans = await this.prisma.plan.findMany({
      where: {
        id: { in: planIds },
        isActive: true,
      },
    });

    if (plans.length !== planIds.length) {
      throw new BadRequestException({
        message: 'Algunos planes no existen o están inactivos',
        error: 'INVALID_PLANS',
      });
    }

    // Actualizar todos los planes en una transacción
    const updatedAssignments = await this.prisma.$transaction(
      async (tx) => {
        return await Promise.all(
          data.plans.map((planData) =>
            tx.distributorPlanPrice.update({
              where: {
                distributorId_planId: {
                  distributorId: data.distributorId,
                  planId: planData.planId,
                },
              },
              data: {
                customPrice: planData.customPrice,
              },
              include: {
                plan: true,
              },
            }),
          ),
        );
      },
      {
        timeout: 60000,
      },
    );

    return {
      success: true,
      message: `${data.plans.length} plan(es) actualizados exitosamente`,
    };
  }

  /**
   * Crear promociones para múltiples distribuidores
   */
  async createPromotionsForDistributors(data: CreatePromotionsDto) {
    const { duration, durationType, distributors, promoStartDate, promoEndDate } = data;

    // Agrupar distribuidores por precio promocional
    const priceGroups = new Map<number | undefined, string[]>();
    distributors.forEach((d) => {
      if (!priceGroups.has(d.customPricePromo)) {
        priceGroups.set(d.customPricePromo, []);
      }
      priceGroups.get(d.customPricePromo)!.push(d.distributorId);
    });

    let totalUpdated = 0;

    // Preparar datos de fechas de promoción
    const promoDateData: Record<string, Date | null> = {
      promoStartDate: promoStartDate ? new Date(promoStartDate) : null,
      promoEndDate: promoEndDate ? new Date(promoEndDate) : null,
    };

    // Ejecutar updateMany por cada grupo de precio
    for (const [pricePromo, distributorIds] of priceGroups) {
      const result = await this.prisma.distributorPlanPrice.updateMany({
        where: {
          distributorId: { in: distributorIds },
          isActive: true,
          plan: {
            duration,
            durationType,
            isActive: true,
          },
        },
        data: {
          customPricePromo: pricePromo,
          promoStartDate: promoDateData.promoStartDate,
          promoEndDate: promoDateData.promoEndDate,
        },
      });

      totalUpdated += result.count;
      this.logger.log(
        `Actualizadas ${result.count} asignaciones para este grupo`,
      );
    }
    console.log('Enviar notifiacion', data.sendNotification);

    // Notificar por WhatsApp de forma asíncrona
    if (data.sendNotification) {
      this.logger.log('Iniciando notificaciones de promoción por WhatsApp');
      const distributorIds = distributors.map((d) => d.distributorId);
      this.notifyDistributorsOfPromotion(distributorIds).catch((err) =>
        this.logger.error(
          `Error in promotion background notifications: ${err.message}`,
        ),
      );
    }

    return {
      success: true,
      message: `Promociones creadas exitosamente para ${distributors.length} distribuidores`,
      updatedCount: totalUpdated,
      distributorsProcessed: distributors.length,
      priceGroupsProcessed: priceGroups.size,
    };
  }

  private async notifyDistributorsOfPromotion(distributorIds: string[]) {
    const uniqueDistributorIds = [...new Set(distributorIds)];

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

    for (const dist of distributorsInfo) {
      if (!dist.phone) continue;

      const name =
        dist.firstName || dist.lastName || dist.socialReason || 'Distribuidor';

      try {
        await this.whatsappService.sendTemplate(
          dist.phone,
          'promotion_distributor',
          [name],
          'en',
        );
      } catch (error) {
        this.logger.error(
          `Error enviando notificación de promoción al distribuidor ${dist.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Verifica si una promo está actualmente activa según sus fechas.
   * Sin fechas = permanente (activa siempre).
   */
  private isPromoCurrentlyActive(
    customPricePromo: number | null,
    promoStartDate: Date | null,
    promoEndDate: Date | null,
  ): boolean {
    if (!customPricePromo) return false;
    const now = new Date();
    if (promoStartDate && now < promoStartDate) return false;
    if (promoEndDate && now > promoEndDate) return false;
    return true;
  }

  private formatDuration(duration: string, durationType: string): string {
    const typeMap: Record<string, string> = {
      D: 'días',
      M: 'mes',
      MS: 'meses',
      Y: 'año',
      YS: 'años',
    };

    return `${duration} ${typeMap[durationType] || durationType}`;
  }

  /**
   * Cron job: Se ejecuta todos los días a las 00:05 para limpiar promociones expiradas.
   * Cuando la fecha de fin de promoción ya pasó, se limpia el precio promo y las fechas.
   */
  @Cron('5 0 * * *', {
    name: 'cleanExpiredPromotions',
    timeZone: 'America/Guayaquil',
  })
  async cleanExpiredPromotions() {
    this.logger.log('Ejecutando limpieza de promociones expiradas...');

    try {
      const now = new Date();

      const result = await this.prisma.distributorPlanPrice.updateMany({
        where: {
          customPricePromo: { not: null },
          promoEndDate: { lt: now },
        },
        data: {
          customPricePromo: null,
          promoStartDate: null,
          promoEndDate: null,
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Promociones expiradas limpiadas: ${result.count} asignaciones actualizadas`,
        );
      } else {
        this.logger.log('No hay promociones expiradas para limpiar');
      }
    } catch (error) {
      this.logger.error(
        `Error al limpiar promociones expiradas: ${error.message}`,
      );
    }
  }
}
