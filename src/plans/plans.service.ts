import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignPlansToDistributorDto } from './dto/assign-plan-to-distributor.dto';
import { UpdateDistributorPlanPriceDto } from './dto/update-distributor-plan-price.dto';
import { TypeClient } from '@prisma/client';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  // Listar todos los planes disponibles
  async getAllPlans() {
    return await this.prisma.plan.findMany({
      where: { isActive: true },
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

    // Validar que todos los planes existen
    const planIds = data.plans.map((p) => p.planId);
    const plans = await this.prisma.plan.findMany({
      where: {
        id: { in: planIds },
        isActive: true,
      },
    });

    if (plans.length !== planIds.length) {
      throw new BadRequestException({
        message: 'Uno o más planes no fueron encontrados o están inactivos',
        error: 'INVALID_PLANS',
      });
    }

    // Verificar si ya existen asignaciones
    const existingAssignments = await this.prisma.distributorPlanPrice.findMany(
      {
        where: {
          distributorId: data.distributorId,
          planId: { in: planIds },
        },
      },
    );

    if (existingAssignments.length > 0) {
      const existingPlanIds = existingAssignments.map((a) => a.planId);
      const conflictingPlans = plans.filter((p) =>
        existingPlanIds.includes(p.id),
      );

      throw new ConflictException({
        message: 'Algunos planes ya están asignados al distribuidor',
        error: 'PLANS_ALREADY_ASSIGNED',
        conflictingPlans: conflictingPlans.map((p) => p.perfil),
      });
    }

    // Crear todas las asignaciones en una transacción
    const assignments = await this.prisma.$transaction(
      data.plans.map((planData) =>
        this.prisma.distributorPlanPrice.create({
          data: {
            distributorId: data.distributorId,
            planId: planData.planId,
            customPrice: planData.customPrice,
            customPricePromo: planData.customPricePromo,
            createdBy: adminUser.id,
            createdByName: `${adminUser.firstName} ${adminUser.lastName}`,
            isActive: true,
          },
          include: {
            plan: true,
          },
        }),
      ),
    );

    return {
      success: true,
      message: `${assignments.length} planes asignados exitosamente al distribuidor`,
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
      orderBy: {
        plan: {
          perfil: 'asc',
        },
      },
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
      orderBy: {
        plan: {
          perfil: 'asc',
        },
      },
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
      orderBy: {
        plan: {
          perfil: 'asc',
        },
      },
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
}
