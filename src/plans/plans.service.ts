import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignPlansToDistributorDto } from './dto/assign-plan-to-distributor.dto';
import { UpdateDistributorPlanPriceDto } from './dto/update-distributor-plan-price.dto';
import { UpdatePlansToDistributorDto } from './dto/update-plans-to-distributor.dto';
import { CreatePromotionsDto } from './dto/create-promotions.dto';
import { TypeClient } from '@prisma/client';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // Listar todos los planes disponibles
  async getAllPlans() {
    return await this.prisma.plan.findMany({
      where: {
        isActive: true,
        eligibleClientsType: {
          has: TypeClient.PERSONA_JURIDICA,
        },
      },
      orderBy: { perfil: 'asc' },
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

    // Obtener todos los planes jurídicos enviados
    const juridicalPlanIds = data.plans.map((p) => p.planId);
    const juridicalPlans = await this.prisma.plan.findMany({
      where: {
        id: { in: juridicalPlanIds },
        eligibleClientsType: {
          has: TypeClient.PERSONA_JURIDICA,
        },
      },
    });

    // Validar que todos los planes enviados son de persona jurídica
    if (juridicalPlans.length !== juridicalPlanIds.length) {
      throw new BadRequestException({
        message: 'Algunos planes no existen o no son de tipo Persona Jurídica',
        error: 'INVALID_PLANS',
      });
    }

    // Preparar todas las asignaciones (PJ + PN)
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
      // Buscar el plan jurídico
      const juridicalPlan = juridicalPlans.find(
        (p) => p.id === planData.planId,
      );

      if (!juridicalPlan) continue;

      // Agregar el plan jurídico
      allAssignments.push({
        distributorId: data.distributorId,
        planId: juridicalPlan.id,
        customPrice: planData.customPrice,
        customPricePromo: planData.customPricePromo,
        createdBy: adminUser.userId,
        createdByName: `${adminUser.firstName} ${adminUser.lastName}`,
        isActive: true,
      });

      // Buscar el plan natural equivalente con el mismo duration y durationType
      const naturalPlan = await this.prisma.plan.findFirst({
        where: {
          duration: juridicalPlan.duration,
          durationType: juridicalPlan.durationType,
          eligibleClientsType: {
            hasSome: [
              TypeClient.PERSONA_NATURAL_SIN_RUC,
              TypeClient.PERSONA_NATURAL_CON_RUC,
            ],
          },
          isActive: true,
        },
      });

      // Si existe plan natural equivalente, agregarlo también
      if (naturalPlan) {
        allAssignments.push({
          distributorId: data.distributorId,
          planId: naturalPlan.id,
          customPrice: planData.customPrice,
          customPricePromo: planData.customPricePromo,
          createdBy: adminUser.userId,
          createdByName: `${adminUser.firstName} ${adminUser.lastName}`,
          isActive: true,
        });
      }
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

    // Enviar contrato por correo con solo los planes jurídicos
    const juridicalAssignments = assignments.filter((a) =>
      a.plan.eligibleClientsType.includes(TypeClient.PERSONA_JURIDICA),
    );

    try {
      await this.mailService.sendContract(distributor, juridicalAssignments);
      console.log('Contrato enviado por correo exitosamente');
    } catch (error) {
      // Log error pero no fallar la operación
      console.error('Error al enviar contrato:', error);
    }

    return {
      success: true,
      message: `${assignments.length} planes asignados exitosamente al distribuidor (${data.plans.length} jurídicos + ${assignments.length - data.plans.length} naturales)`,
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

    return {
      success: true,
      distributor: {
        id: distributor.id,
        firstName: distributor.firstName,
        lastName: distributor.lastName,
        socialReason: distributor.socialReason,
        email: distributor.email,
      },
      plans: assignments,
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

  // Obtener planes para personas naturales del distribuidor autenticado
  async getDistributorNaturalPlans(distributorId: string) {
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
          eligibleClientsType: {
            hasSome: [
              TypeClient.PERSONA_NATURAL_SIN_RUC,
              TypeClient.PERSONA_NATURAL_CON_RUC,
            ],
          },
          isActive: true,
        },
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

    return {
      success: true,
      plans: assignments.map((a) => ({
        id: a.plan.id,
        perfil: a.plan.perfil,
        basePrice: a.plan.basePrice,
        basePricePromo: a.plan.basePricePromo,
        duration: a.plan.duration,
        durationType: a.plan.durationType,
        durationPromo: a.plan.durationPromo,
        isPromo: a.plan.isPromo,
        eligibleClientsType: a.plan.eligibleClientsType,
        customPrice: a.customPrice,
        customPricePromo: a.customPricePromo,
        isActive: a.isActive,
        createdAt: a.createdAt,
      })),
    };
  }

  // Obtener planes para personas jurídicas del distribuidor autenticado
  async getDistributorJuridicalPlans(distributorId: string) {
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
          eligibleClientsType: {
            has: TypeClient.PERSONA_JURIDICA,
          },
          isActive: true,
        },
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

    return {
      success: true,
      plans: assignments.map((a) => ({
        id: a.plan.id,
        perfil: a.plan.perfil,
        basePrice: a.plan.basePrice,
        basePricePromo: a.plan.basePricePromo,
        duration: a.plan.duration,
        durationType: a.plan.durationType,
        durationPromo: a.plan.durationPromo,
        isPromo: a.plan.isPromo,
        eligibleClientsType: a.plan.eligibleClientsType,
        customPrice: a.customPrice,
        customPricePromo: a.customPricePromo,
        isActive: a.isActive,
        createdAt: a.createdAt,
      })),
    };
  }

  /**
   * Actualizar múltiples planes de un distribuidor con precios personalizados
   * Similar a assignPlansToDistributor pero para actualizar planes ya asignados
   */
  async updatePlansToDistributor(data: UpdatePlansToDistributorDto) {
    // Obtener todos los planes jurídicos enviados
    const juridicalPlanIds = data.plans.map((p) => p.planId);
    const juridicalPlans = await this.prisma.plan.findMany({
      where: {
        id: { in: juridicalPlanIds },
        eligibleClientsType: {
          has: TypeClient.PERSONA_JURIDICA,
        },
      },
    });

    // Pre-cargar todos los planes naturales equivalentes en una sola consulta
    const durationCombinations = juridicalPlans.map((p) => ({
      duration: p.duration,
      durationType: p.durationType,
    }));

    const naturalPlans = await this.prisma.plan.findMany({
      where: {
        OR: durationCombinations.map((combo) => ({
          duration: combo.duration,
          durationType: combo.durationType,
        })),
        eligibleClientsType: {
          hasSome: [
            TypeClient.PERSONA_NATURAL_SIN_RUC,
            TypeClient.PERSONA_NATURAL_CON_RUC,
          ],
        },
        isActive: true,
      },
    });

    // Pre-cargar todas las asignaciones naturales del distribuidor
    const naturalPlanIds = naturalPlans.map((p) => p.id);
    const naturalAssignments = await this.prisma.distributorPlanPrice.findMany({
      where: {
        distributorId: data.distributorId,
        planId: { in: naturalPlanIds },
      },
    });
    const naturalAssignmentMap = new Map(
      naturalAssignments.map((a) => [a.planId, a]),
    );

    // Preparar todas las actualizaciones (PJ + PN)
    const allUpdates: Array<{
      distributorId: string;
      planId: string;
      customPrice: number;
    }> = [];

    for (const planData of data.plans) {
      // Buscar el plan jurídico
      const juridicalPlan = juridicalPlans.find(
        (p) => p.id === planData.planId,
      );

      if (!juridicalPlan) continue;

      // Agregar el plan jurídico
      allUpdates.push({
        distributorId: data.distributorId,
        planId: juridicalPlan.id,
        customPrice: planData.customPrice,
      });

      // Buscar el plan natural equivalente (ya pre-cargado)
      const naturalPlan = naturalPlans.find(
        (p) =>
          p.duration === juridicalPlan.duration &&
          p.durationType === juridicalPlan.durationType,
      );

      // Si existe plan natural equivalente y está asignado, actualizarlo también
      if (naturalPlan && naturalAssignmentMap.has(naturalPlan.id)) {
        allUpdates.push({
          distributorId: data.distributorId,
          planId: naturalPlan.id,
          customPrice: planData.customPrice,
        });
      }
    }

    // Actualizar todos los planes en una transacción con timeout extendido
    const updatedAssignments = await this.prisma.$transaction(
      async (tx) => {
        return await Promise.all(
          allUpdates.map((updateData) =>
            tx.distributorPlanPrice.update({
              where: {
                distributorId_planId: {
                  distributorId: updateData.distributorId,
                  planId: updateData.planId,
                },
              },
              data: {
                customPrice: updateData.customPrice,
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
   * Optimizado con updateMany agrupando por precio
   */
  async createPromotionsForDistributors(data: CreatePromotionsDto) {
    const { duration, durationType, distributors } = data;

    this.logger.log(
      `Iniciando creación de promociones para ${distributors.length} distribuidores`,
    );

    // Agrupar distribuidores por precio promocional
    const priceGroups = new Map<number, string[]>();
    distributors.forEach((d) => {
      if (!priceGroups.has(d.customPricePromo)) {
        priceGroups.set(d.customPricePromo, []);
      }
      priceGroups.get(d.customPricePromo)!.push(d.distributorId);
    });

    this.logger.log(
      `Distribuidores agrupados en ${priceGroups.size} grupos de precios`,
    );

    let totalUpdated = 0;

    // Ejecutar updateMany por cada grupo de precio
    for (const [pricePromo, distributorIds] of priceGroups) {
      this.logger.log(
        `Actualizando ${distributorIds.length} distribuidores con precio promo $${(pricePromo / 100).toFixed(2)}`,
      );

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
        },
      });

      totalUpdated += result.count;
      this.logger.log(
        `Actualizadas ${result.count} asignaciones para este grupo`,
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
}
