import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditDto } from './dto/create-credit.dto';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createCredit(createCreditDto: CreateCreditDto, adminName: string) {
    const { distributorId, creditDays } = createCreditDto;

    // Verificar si ya tiene un crédito activo
    const existingCredit = await this.prisma.distributorCredit.findFirst({
      where: {
        distributorId,
        isActive: true,
      },
    });

    if (existingCredit) {
      throw new BadRequestException(
        'El distribuidor ya tiene un crédito activo',
      );
    }

    // Verificar si tiene un crédito anterior desactivado
    const previousCredit = await this.prisma.distributorCredit.findFirst({
      where: {
        distributorId,
        isActive: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Si tiene un crédito anterior, verificar que no tenga deudas pendientes
    if (previousCredit) {
      const unpaidCutoffs = await this.prisma.creditCutoff.count({
        where: {
          creditId: previousCredit.id,
          isPaid: false,
        },
      });

      if (unpaidCutoffs > 0) {
        throw new BadRequestException(
          'El distribuidor tiene deudas pendientes de un crédito anterior. Debe pagar antes de activar uno nuevo.',
        );
      }
    }

    // Crear el crédito
    const credit = await this.prisma.distributorCredit.create({
      data: {
        distributorId,
        creditDays,
        isActive: true,
        isBlocked: false,
        assignedBy: adminName,
      },
    });

    return {
      message: 'Crédito activado exitosamente',
      data: {
        credit,
      },
    };
  }

  /**
   * Desactivar el crédito de un distribuidor
   */
  async deactivateCredit(distributorId: string, adminName: string) {
    const credit = await this.prisma.distributorCredit.findFirst({
      where: {
        distributorId,
        isActive: true,
      },
    });

    if (!credit) {
      throw new BadRequestException(
        'El distribuidor no tiene un crédito activo',
      );
    }

    // Verificar si tiene deudas pendientes
    const unpaidCutoffs = await this.prisma.creditCutoff.findMany({
      where: {
        creditId: credit.id,
        isPaid: false,
      },
    });

    const totalOwed = unpaidCutoffs.reduce(
      (sum, cutoff) => sum + (cutoff.amountUsed - cutoff.amountPaid),
      0,
    );

    if (totalOwed > 0) {
      return {
        success: false,
        message: `No se puede desactivar el crédito. El distribuidor tiene una deuda pendiente de $${(totalOwed / 100).toFixed(2)}`,
        data: {
          totalOwed,
          unpaidCutoffs: unpaidCutoffs.length,
        },
      };
    }

    // Desactivar el crédito
    const updatedCredit = await this.prisma.distributorCredit.update({
      where: { id: credit.id },
      data: {
        isActive: false,
        isBlocked: false,
      },
    });

    this.logger.log(
      `Crédito desactivado para distribuidor ${distributorId} por ${adminName}`,
    );

    return {
      success: true,
      message: 'Crédito desactivado exitosamente',
      data: {
        credit: updatedCredit,
      },
    };
  }

  /**
   * Reactivar un crédito existente (si no tiene deudas)
   */
  async reactivateCredit(distributorId: string, adminName: string) {
    // Verificar que no tenga un crédito activo
    const activeCredit = await this.prisma.distributorCredit.findFirst({
      where: {
        distributorId,
        isActive: true,
      },
    });

    if (activeCredit) {
      throw new BadRequestException(
        'El distribuidor ya tiene un crédito activo',
      );
    }

    // Buscar el crédito más reciente desactivado
    const inactiveCredit = await this.prisma.distributorCredit.findFirst({
      where: {
        distributorId,
        isActive: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!inactiveCredit) {
      throw new BadRequestException(
        'El distribuidor no tiene un crédito anterior para reactivar',
      );
    }

    // Verificar que no tenga deudas pendientes
    const unpaidCutoffs = await this.prisma.creditCutoff.findMany({
      where: {
        creditId: inactiveCredit.id,
        isPaid: false,
      },
    });

    const totalOwed = unpaidCutoffs.reduce(
      (sum, cutoff) => sum + (cutoff.amountUsed - cutoff.amountPaid),
      0,
    );

    if (totalOwed > 0) {
      throw new BadRequestException(
        `No se puede reactivar el crédito. El distribuidor tiene una deuda pendiente de $${(totalOwed / 100).toFixed(2)}`,
      );
    }

    // Reactivar el crédito
    const reactivatedCredit = await this.prisma.distributorCredit.update({
      where: { id: inactiveCredit.id },
      data: {
        isActive: true,
        isBlocked: false,
      },
    });

    this.logger.log(
      `Crédito reactivado para distribuidor ${distributorId} por ${adminName}`,
    );

    return {
      message: 'Crédito reactivado exitosamente',
      data: {
        credit: reactivatedCredit,
      },
    };
  }

  async canEmitSignature(distributorId: string): Promise<boolean> {
    const credit = await this.prisma.distributorCredit.findFirst({
      where: {
        distributorId,
        isActive: true,
      },
    });

    if (!credit) return true;

    return !credit.isBlocked;
  }

  /**
   * Obtener el estado del crédito (si existe)
   * Retorna null si no tiene crédito activo
   */
  async getCreditStatus(distributorId: string) {
    const credit = await this.prisma.distributorCredit.findFirst({
      where: {
        distributorId,
        isActive: true,
      },
    });

    if (!credit) {
      return null;
    }

    return {
      id: credit.id,
      creditDays: credit.creditDays,
      isActive: credit.isActive,
      isBlocked: credit.isBlocked,
      assignedBy: credit.assignedBy,
    };
  }

  /**
   * Registrar que se emitió una firma en crédito
   * Crea o actualiza el corte del día actual
   */
  async registerSignatureInCredit(
    distributorId: string,
    signatureAmount: number,
    signatureId: string,
  ) {
    const credit = await this.prisma.distributorCredit.findFirst({
      where: {
        distributorId,
        isActive: true,
      },
    });

    if (!credit) {
      throw new BadRequestException('El distribuidor no tiene crédito activo');
    }

    if (credit.isBlocked) {
      throw new BadRequestException(
        'El crédito está bloqueado por falta de pago',
      );
    }

    // Obtener la fecha del corte (inicio del día)
    const now = new Date();
    const cutoffDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Calcular fecha de pago (cutoffDate + creditDays)
    const paymentDueDate = new Date(cutoffDate);
    paymentDueDate.setDate(paymentDueDate.getDate() + credit.creditDays);
    paymentDueDate.setHours(23, 59, 59, 999);

    // Buscar o crear el corte del día
    const cutoff = await this.prisma.creditCutoff.upsert({
      where: {
        creditId_cutoffDate: {
          creditId: credit.id,
          cutoffDate,
        },
      },
      create: {
        distributorId,
        creditId: credit.id,
        cutoffDate,
        paymentDueDate,
        amountUsed: signatureAmount,
        signaturesCount: 1,
        signaturesDetails: JSON.stringify([signatureId]),
      },
      update: {
        amountUsed: {
          increment: signatureAmount,
        },
        signaturesCount: {
          increment: 1,
        },
      },
    });

    this.logger.log(
      `Firma ${signatureId} registrada en crédito. Monto: $${(signatureAmount / 100).toFixed(2)}`,
    );

    return cutoff;
  }

  /**
   * Cron que se ejecuta diariamente a las 00:01 para verificar y bloquear distribuidores
   * con cortes vencidos no pagados
   */
  @Cron('1 0 * * *', {
    timeZone: 'America/Guayaquil',
  })
  async checkOverdueCutoffs() {
    this.logger.log('Verificando cortes de crédito vencidos...');

    const now = new Date();

    try {
      // Buscar cortes vencidos no pagados
      const overdueCutoffs = await this.prisma.creditCutoff.findMany({
        where: {
          isPaid: false,
          isOverdue: false,
          paymentDueDate: {
            lt: now,
          },
        },
        include: {
          credit: true,
          distributor: true,
        },
      });

      this.logger.log(
        `Se encontraron ${overdueCutoffs.length} cortes vencidos`,
      );

      for (const cutoff of overdueCutoffs) {
        try {
          await this.prisma.$transaction(async (prisma) => {
            // Marcar el corte como vencido
            await prisma.creditCutoff.update({
              where: { id: cutoff.id },
              data: { isOverdue: true },
            });

            // Bloquear el crédito del distribuidor
            await prisma.distributorCredit.update({
              where: { id: cutoff.creditId },
              data: { isBlocked: true },
            });

            this.logger.warn(
              `Distribuidor ${cutoff.distributor.email} bloqueado por corte vencido. Debe: $${((cutoff.amountUsed - cutoff.amountPaid) / 100).toFixed(2)}`,
            );
          });
        } catch (error) {
          this.logger.error(
            `Error procesando corte vencido ${cutoff.id}: ${error.message}`,
          );
        }
      }

      this.logger.log('Verificación de cortes vencidos completada');
    } catch (error) {
      this.logger.error(
        `Error en el cron de cortes vencidos: ${error.message}`,
      );
    }
  }

  /**
   * Cron que se ejecuta diariamente a las 23:59 para intentar cobrar cortes vencidos
   */
  @Cron('59 23 * * *', {
    timeZone: 'America/Guayaquil',
  })
  async processPaymentAttempts() {
    this.logger.log('Iniciando intentos de cobro de cortes vencidos...');

    const now = new Date();

    try {
      // Obtener todos los cortes no pagados que ya vencieron
      const unpaidCutoffs = await this.prisma.creditCutoff.findMany({
        where: {
          isPaid: false,
          paymentDueDate: {
            lt: now,
          },
        },
        include: {
          distributor: true,
          credit: true,
        },
        orderBy: {
          cutoffDate: 'asc',
        },
      });

      this.logger.log(
        `Se encontraron ${unpaidCutoffs.length} cortes pendientes de pago`,
      );

      let collected = 0;
      let partiallyPaid = 0;
      let notPaid = 0;

      for (const cutoff of unpaidCutoffs) {
        try {
          const amountOwed = cutoff.amountUsed - cutoff.amountPaid;

          if (amountOwed <= 0) {
            // Ya está pagado, marcar como tal
            await this.prisma.creditCutoff.update({
              where: { id: cutoff.id },
              data: { isPaid: true },
            });
            continue;
          }

          await this.prisma.$transaction(async (prisma) => {
            const distributor = cutoff.distributor;

            if (distributor.balance >= amountOwed) {
              // Tiene saldo suficiente: cobrar todo
              const newBalance = distributor.balance - amountOwed;

              await prisma.distributor.update({
                where: { id: distributor.id },
                data: { balance: newBalance },
              });

              await prisma.creditCutoff.update({
                where: { id: cutoff.id },
                data: {
                  amountPaid: cutoff.amountUsed,
                  isPaid: true,
                  isOverdue: false,
                },
              });

              // Desbloquear el crédito si este era el último pendiente
              const remainingUnpaid = await prisma.creditCutoff.count({
                where: {
                  creditId: cutoff.creditId,
                  isPaid: false,
                  id: { not: cutoff.id },
                },
              });

              if (remainingUnpaid === 0) {
                await prisma.distributorCredit.update({
                  where: { id: cutoff.creditId },
                  data: { isBlocked: false },
                });
              }

              collected++;
              this.logger.log(
                `Corte ${cutoff.id} cobrado completamente. Monto: $${(amountOwed / 100).toFixed(2)}`,
              );
            } else if (distributor.balance > 0) {
              // Tiene algo de saldo: cobrar parcial
              const amountPaid = distributor.balance;
              const newBalance = 0;

              await prisma.distributor.update({
                where: { id: distributor.id },
                data: { balance: newBalance },
              });

              await prisma.creditCutoff.update({
                where: { id: cutoff.id },
                data: {
                  amountPaid: cutoff.amountPaid + amountPaid,
                },
              });

              partiallyPaid++;
              this.logger.log(
                `Corte ${cutoff.id} cobrado parcialmente. Pagado: $${(amountPaid / 100).toFixed(2)}, Falta: $${((amountOwed - amountPaid) / 100).toFixed(2)}`,
              );
            } else {
              // No tiene saldo
              notPaid++;
            }
          });
        } catch (error) {
          this.logger.error(
            `Error procesando corte ${cutoff.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Cobros completados. Cobrados: ${collected}, Parciales: ${partiallyPaid}, Sin pago: ${notPaid}`,
      );
    } catch (error) {
      this.logger.error(`Error en el cron de cobros: ${error.message}`);
    }
  }

  /**
   * Obtener resumen de crédito de un distribuidor
   */
  async getCreditSummary(distributorId: string) {
    const credit = await this.prisma.distributorCredit.findFirst({
      where: {
        distributorId,
        isActive: true,
      },
      include: {
        creditCutoffs: {
          orderBy: { cutoffDate: 'desc' },
        },
      },
    });

    if (!credit) {
      return {
        hasCredit: false,
        message: 'El distribuidor no tiene crédito activo',
      };
    }

    const totalUsed = await this.prisma.creditCutoff.aggregate({
      where: { creditId: credit.id },
      _sum: { amountUsed: true },
    });

    const totalPaid = await this.prisma.creditCutoff.aggregate({
      where: { creditId: credit.id },
      _sum: { amountPaid: true },
    });

    const unpaidCutoffs = await this.prisma.creditCutoff.findMany({
      where: {
        creditId: credit.id,
        isPaid: false,
      },
      orderBy: { cutoffDate: 'asc' },
    });

    return {
      hasCredit: true,
      creditDays: credit.creditDays,
      isBlocked: credit.isBlocked,
      totalUsed: totalUsed._sum.amountUsed || 0,
      totalPaid: totalPaid._sum.amountPaid || 0,
      totalOwed:
        (totalUsed._sum.amountUsed || 0) - (totalPaid._sum.amountPaid || 0),
      cutoffs: credit.creditCutoffs,
      unpaidCutoffs,
    };
  }
}
