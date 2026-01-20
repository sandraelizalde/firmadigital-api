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
   * No valida deudas pendientes - se puede desactivar aunque deba
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

    // Verificar si tiene deudas pendientes (solo para informar)
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

    // Desactivar el crédito sin importar si tiene deudas
    const updatedCredit = await this.prisma.distributorCredit.update({
      where: { id: credit.id },
      data: {
        isActive: false,
        isBlocked: false,
      },
    });
    const message = 'Crédito desactivado exitosamente';

    return {
      success: true,
      message,
      data: {
        credit: updatedCredit,
        totalOwed: totalOwed,
        unpaidCutoffs: unpaidCutoffs.length,
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

  /**
   * Verificar si un distribuidor puede emitir firmas
   * Retorna:
   * - true: Si NO tiene crédito activo (puede emitir con saldo normal)
   * - true: Si tiene crédito activo y NO está bloqueado
   * - false: Si tiene crédito activo y ESTÁ bloqueado
   */
  async canEmitSignature(distributorId: string): Promise<boolean> {
    const credit = await this.prisma.distributorCredit.findFirst({
      where: {
        distributorId,
        isActive: true,
      },
    });

    // Si no tiene crédito activo, puede emitir firmas normalmente
    if (!credit) {
      return true;
    }

    // Si tiene crédito activo, solo puede emitir si NO está bloqueado
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

              // Crear movimiento de cobro de crédito
              await prisma.accountMovement.create({
                data: {
                  distributorId: distributor.id,
                  type: 'EXPENSE',
                  detail: `Cobro de crédito - Corte del ${new Date(cutoff.cutoffDate).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
                  amount: amountOwed,
                  balanceAfter: newBalance,
                  distributorCreditId: cutoff.creditId,
                  note: `Pago completo de ${cutoff.signaturesCount} firma(s). Corte ID: ${cutoff.id}`,
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

              // Crear movimiento de cobro parcial de crédito
              await prisma.accountMovement.create({
                data: {
                  distributorId: distributor.id,
                  type: 'EXPENSE',
                  detail: `Cobro parcial de crédito - Corte del ${new Date(cutoff.cutoffDate).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
                  amount: amountPaid,
                  balanceAfter: newBalance,
                  distributorCreditId: cutoff.creditId,
                  note: `Pago parcial: $${(amountPaid / 100).toFixed(2)} de $${(amountOwed / 100).toFixed(2)}. Pendiente: $${((amountOwed - amountPaid) / 100).toFixed(2)}. Corte ID: ${cutoff.id}`,
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
   * Intentar cobrar créditos vencidos de un distribuidor específico
   * Retorna información sobre lo cobrado
   */
  async attemptCollectOverdueCredits(distributorId: string) {
    this.logger.log(
      `Intentando cobrar créditos vencidos para distribuidor ${distributorId}...`,
    );

    try {
      // Obtener todos los cortes no pagados del distribuidor
      const unpaidCutoffs = await this.prisma.creditCutoff.findMany({
        where: {
          distributorId,
          isPaid: false,
        },
        include: {
          distributor: true,
          credit: true,
        },
        orderBy: {
          cutoffDate: 'asc',
        },
      });

      if (unpaidCutoffs.length === 0) {
        return {
          success: true,
          message: 'No hay créditos pendientes de pago',
          collected: 0,
          partiallyPaid: 0,
          remaining: 0,
          totalCollected: 0,
          details: [],
        };
      }

      let collected = 0;
      let partiallyPaid = 0;
      let remaining = 0;
      let totalCollected = 0;
      const details: Array<{
        cutoffId: string;
        cutoffDate: Date;
        amountOwed: number;
        amountCollected: number;
        status: string;
        reason: string;
      }> = [];

      for (const cutoff of unpaidCutoffs) {
        const amountOwed = cutoff.amountUsed - cutoff.amountPaid;

        if (amountOwed <= 0) {
          // Ya está pagado, marcar como tal
          await this.prisma.creditCutoff.update({
            where: { id: cutoff.id },
            data: { isPaid: true },
          });
          continue;
        }

        // Obtener el saldo actual del distribuidor
        const distributor = await this.prisma.distributor.findUnique({
          where: { id: distributorId },
          select: { balance: true },
        });

        if (!distributor || distributor.balance <= 0) {
          // No hay más saldo para cobrar
          remaining++;
          details.push({
            cutoffId: cutoff.id,
            cutoffDate: cutoff.cutoffDate,
            amountOwed,
            amountCollected: 0,
            status: 'pending',
            reason: 'Saldo insuficiente',
          });
          continue;
        }

        try {
          let shouldBreak = false;

          await this.prisma.$transaction(async (prisma) => {
            if (distributor.balance >= amountOwed) {
              // Tiene saldo suficiente: cobrar todo
              const newBalance = distributor.balance - amountOwed;

              await prisma.distributor.update({
                where: { id: distributorId },
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

              // Crear movimiento de cobro de crédito
              await prisma.accountMovement.create({
                data: {
                  distributorId,
                  type: 'EXPENSE',
                  detail: `Cobro de crédito - Corte del ${new Date(cutoff.cutoffDate).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
                  amount: amountOwed,
                  balanceAfter: newBalance,
                  distributorCreditId: cutoff.creditId,
                  note: `Pago completo de ${cutoff.signaturesCount} firma(s). Corte ID: ${cutoff.id}`,
                },
              });

              collected++;
              totalCollected += amountOwed;

              details.push({
                cutoffId: cutoff.id,
                cutoffDate: cutoff.cutoffDate,
                amountOwed,
                amountCollected: amountOwed,
                status: 'paid',
                reason: 'Cobro completo',
              });

              this.logger.log(
                `Corte ${cutoff.id} cobrado completamente. Monto: $${(amountOwed / 100).toFixed(2)}`,
              );
            } else {
              // Tiene algo de saldo: cobrar parcial
              const amountPaid = distributor.balance;
              const newBalance = 0;

              await prisma.distributor.update({
                where: { id: distributorId },
                data: { balance: newBalance },
              });

              await prisma.creditCutoff.update({
                where: { id: cutoff.id },
                data: {
                  amountPaid: cutoff.amountPaid + amountPaid,
                },
              });

              // Crear movimiento de cobro parcial de crédito
              await prisma.accountMovement.create({
                data: {
                  distributorId,
                  type: 'EXPENSE',
                  detail: `Cobro parcial de crédito - Corte del ${new Date(cutoff.cutoffDate).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
                  amount: amountPaid,
                  balanceAfter: newBalance,
                  distributorCreditId: cutoff.creditId,
                  note: `Pago parcial: $${(amountPaid / 100).toFixed(2)} de $${(amountOwed / 100).toFixed(2)}. Pendiente: $${((amountOwed - amountPaid) / 100).toFixed(2)}. Corte ID: ${cutoff.id}`,
                },
              });

              partiallyPaid++;
              totalCollected += amountPaid;

              details.push({
                cutoffId: cutoff.id,
                cutoffDate: cutoff.cutoffDate,
                amountOwed,
                amountCollected: amountPaid,
                status: 'partial',
                reason: `Cobrado $${(amountPaid / 100).toFixed(2)} de $${(amountOwed / 100).toFixed(2)}`,
              });

              this.logger.log(
                `Corte ${cutoff.id} cobrado parcialmente. Pagado: $${(amountPaid / 100).toFixed(2)}, Falta: $${((amountOwed - amountPaid) / 100).toFixed(2)}`,
              );

              // Si cobró parcial, ya no tiene más saldo, marcar para salir del loop
              shouldBreak = true;
            }
          });

          // Si cobró parcial y no tiene más saldo, salir del loop
          if (shouldBreak) {
            break;
          }
        } catch (error) {
          this.logger.error(
            `Error procesando corte ${cutoff.id}: ${error.message}`,
          );
          details.push({
            cutoffId: cutoff.id,
            cutoffDate: cutoff.cutoffDate,
            amountOwed,
            amountCollected: 0,
            status: 'error',
            reason: error.message,
          });
        }
      }

      // Verificar si se deben desbloquear créditos
      const creditsToUnblock = await this.prisma.distributorCredit.findMany({
        where: {
          distributorId,
          isActive: true,
          isBlocked: true,
        },
      });

      for (const credit of creditsToUnblock) {
        const remainingUnpaid = await this.prisma.creditCutoff.count({
          where: {
            creditId: credit.id,
            isPaid: false,
          },
        });

        if (remainingUnpaid === 0) {
          await this.prisma.distributorCredit.update({
            where: { id: credit.id },
            data: { isBlocked: false },
          });

          this.logger.log(
            `Crédito ${credit.id} desbloqueado - todas las deudas pagadas`,
          );
        }
      }

      this.logger.log(
        `Cobros completados para distribuidor ${distributorId}. Cobrados: ${collected}, Parciales: ${partiallyPaid}, Pendientes: ${remaining}, Total: $${(totalCollected / 100).toFixed(2)}`,
      );

      return {
        success: true,
        message: `Se cobraron ${collected + partiallyPaid} cortes por un total de $${(totalCollected / 100).toFixed(2)}`,
        collected,
        partiallyPaid,
        remaining,
        totalCollected,
        details,
      };
    } catch (error) {
      this.logger.error(
        `Error en cobro de créditos para distribuidor ${distributorId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Obtener resumen de crédito de un distribuidor
   * Incluye créditos desactivados con deudas pendientes
   */
  async getCreditSummary(distributorId: string) {
    // Primero buscar crédito activo
    let credit = await this.prisma.distributorCredit.findFirst({
      where: {
        distributorId,
        isActive: true,
      },
      include: {
        creditCutoffs: {
          orderBy: { cutoffDate: 'desc' },
          where: {
            isPaid: false,
          },
        },
      },
    });

    let isActiveCredit = true;

    // Si no hay crédito activo, buscar el más reciente inactivo
    if (!credit) {
      credit = await this.prisma.distributorCredit.findFirst({
        where: {
          distributorId,
          isActive: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          creditCutoffs: {
            orderBy: { cutoffDate: 'desc' },

            where: {
              isPaid: false,
            },
          },
        },
      });

      isActiveCredit = false;
    }

    if (!credit) {
      return {
        hasCredit: false,
        message: 'El distribuidor no tiene crédito activo ni anterior',
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

    const totalOwed =
      (totalUsed._sum.amountUsed || 0) - (totalPaid._sum.amountPaid || 0);

    // Si el crédito está inactivo pero tiene deudas, incluir advertencia
    let message;
    if (!isActiveCredit && totalOwed > 0) {
      message = `El crédito está desactivado pero tiene una deuda pendiente de $${(totalOwed / 100).toFixed(2)}. Debe pagar antes de poder activar o crear un nuevo crédito.`;
    } else if (!isActiveCredit && totalOwed === 0) {
      message = 'El distribuidor no tiene crédito activo';
    }

    return {
      hasCredit: isActiveCredit,
      isActive: credit.isActive,
      creditDays: credit.creditDays,
      isBlocked: credit.isBlocked,
      createdAt: credit.createdAt,
      assignedBy: credit.assignedBy,
      totalUsed: totalUsed._sum.amountUsed || 0,
      totalPaid: totalPaid._sum.amountPaid || 0,
      totalOwed,
      cutoffs: credit.creditCutoffs,
      unpaidCutoffs,
      message,
    };
  }

  /**
   * Obtener cortes de crédito de un distribuidor con filtros de fecha y paginación
   */
  async getDistributorCreditCutoffs(
    distributorId: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    // Construir filtros de fecha (zona horaria de Ecuador: UTC-5)
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate + 'T00:00:00-05:00');
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate + 'T23:59:59.999-05:00');
    }

    // Construir condiciones where
    const whereConditions: any = {
      distributorId,
    };

    if (startDate || endDate) {
      whereConditions.cutoffDate = dateFilter;
    }

    // Obtener total de cortes
    const total = await this.prisma.creditCutoff.count({
      where: whereConditions,
    });

    // Obtener cortes paginados
    const cutoffs = await this.prisma.creditCutoff.findMany({
      where: whereConditions,
      orderBy: { cutoffDate: 'desc' },
      skip,
      take: limit,
      include: {
        credit: {
          select: {
            id: true,
            creditDays: true,
            isActive: true,
            isBlocked: true,
            assignedBy: true,
          },
        },
      },
    });

    // Calcular totales
    const totals = await this.prisma.creditCutoff.aggregate({
      where: whereConditions,
      _sum: {
        amountUsed: true,
        amountPaid: true,
        signaturesCount: true,
      },
    });

    return {
      success: true,
      data: cutoffs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      totals: {
        totalUsed: totals._sum.amountUsed || 0,
        totalPaid: totals._sum.amountPaid || 0,
        totalOwed:
          (totals._sum.amountUsed || 0) - (totals._sum.amountPaid || 0),
        totalSignatures: totals._sum.signaturesCount || 0,
      },
    };
  }
}
