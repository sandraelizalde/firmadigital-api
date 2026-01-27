import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditDto } from './dto/create-credit.dto';
import { Cron } from '@nestjs/schedule';
import { WhatsappService } from '../notifications/whatsapp.service';

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) { }

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
   * Desbloquear manualmente el crédito de un distribuidor (temporal para emergencias)
   */
  async forceUnblockCredit(distributorId: string, adminName: string) {
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

    if (!credit.isBlocked) {
      return {
        message: 'El crédito ya está desbloqueado',
        data: { credit },
      };
    }

    // Desbloquear forzadamente
    const unblockedCredit = await this.prisma.distributorCredit.update({
      where: { id: credit.id },
      data: { isBlocked: false },
    });

    this.logger.warn(
      `Crédito desbloqueado FORZADAMENTE para distribuidor ${distributorId} por ${adminName}`,
    );

    return {
      message: 'Crédito desbloqueado exitosamente (forzado)',
      data: {
        credit: unblockedCredit,
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

  async canEmitSignatureRest(distributorId: string): Promise<{
    canEmit: boolean;
    reason?: string;
    hasCredit?: boolean;
    isBlocked?: boolean;
  }> {
    const credit = await this.prisma.distributorCredit.findFirst({
      where: {
        distributorId,
      },
    });
    // Si tiene un credito bloqueado no puede emitir firmas
    if (credit && credit.isBlocked) {
      return {
        canEmit: false,
        hasCredit: credit.isActive,
        isBlocked: credit.isBlocked,
        reason: 'El crédito está bloqueado por falta de pago',
      };
    }
    return { canEmit: true };
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

    // Obtener la fecha del corte (inicio del día en hora de Ecuador, guardado en UTC)
    const now = new Date();

    // Crear fecha en hora de Ecuador (ISO string con timezone)
    const ecuadorDateString = now.toLocaleString('en-US', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // Parsear la fecha y crear el final del día en Ecuador (convertido a UTC)
    const [month, day, year] = ecuadorDateString.split('/');
    const cutoffDate = new Date(`${year}-${month}-${day}T23:59:59.999-05:00`);

    // Calcular fecha de pago añadiendo días en milisegundos (evita problemas de zona horaria
    // al usar `setDate` sobre objetos Date con offsets)
    const paymentDueDate = new Date(
      cutoffDate.getTime() + credit.creditDays * 24 * 60 * 60 * 1000,
    );

    // Buscar si ya existe el corte del día para este crédito
    const existingCutoff = await this.prisma.creditCutoff.findUnique({
      where: {
        creditId_cutoffDate: {
          creditId: credit.id,
          cutoffDate,
        },
      },
    });

    let cutoff;
    if (existingCutoff) {
      // Si existe, actualizar contadores y agregar el ID de la firma al JSON
      let signatures: string[] = [];
      try {
        signatures = JSON.parse(existingCutoff.signaturesDetails || '[]');
      } catch (e) {
        signatures = [];
      }

      if (!Array.isArray(signatures)) signatures = [];
      signatures.push(signatureId);

      cutoff = await this.prisma.creditCutoff.update({
        where: { id: existingCutoff.id },
        data: {
          amountUsed: {
            increment: signatureAmount,
          },
          signaturesCount: {
            increment: 1,
          },
          signaturesDetails: JSON.stringify(signatures),
        },
      });
    } else {
      // Si no existe, crearlo
      cutoff = await this.prisma.creditCutoff.create({
        data: {
          distributorId,
          creditId: credit.id,
          cutoffDate,
          paymentDueDate,
          amountUsed: signatureAmount,
          signaturesCount: 1,
          signaturesDetails: JSON.stringify([signatureId]),
        },
      });
    }

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
      // Buscar cortes vencidos no pagados que no estén marcados como tales
      const overdueCutoffs = await this.prisma.creditCutoff.findMany({
        where: {
          isPaid: false,
          paymentDueDate: {
            lte: now,
          },
        },
        include: {
          credit: true,
          distributor: true,
        },
      });

      if (overdueCutoffs.length > 0) {
        this.logger.log(
          `Se encontraron ${overdueCutoffs.length} cortes que deberían ser bloqueados`,
        );
      }

      for (const cutoff of overdueCutoffs) {
        try {
          await this.prisma.$transaction(async (prisma) => {
            // Asegurar que esté marcado como vencido
            if (!cutoff.isOverdue) {
              await prisma.creditCutoff.update({
                where: { id: cutoff.id },
                data: { isOverdue: true },
              });
            }

            // Bloquear el crédito del distribuidor si no está bloqueado
            if (!cutoff.credit.isBlocked) {
              await prisma.distributorCredit.update({
                where: { id: cutoff.creditId },
                data: { isBlocked: true },
              });

              this.logger.warn(
                `Distribuidor ${cutoff.distributor.email} bloqueado por corte vencido (Cron 00:01). Debe: $${((cutoff.amountUsed - cutoff.amountPaid) / 100).toFixed(2)}`,
              );
            }
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
    this.logger.log('Iniciando intentos de cobro de cortes...');

    const now = new Date();
    const nowWithMargin = new Date(now.getTime() + 2 * 60 * 1000);

    try {
      // Obtener todos los cortes no pagados
      const unpaidCutoffs = await this.prisma.creditCutoff.findMany({
        where: {
          isPaid: false,
          cutoffDate: {
            lte: nowWithMargin,
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

      const distributorIdsToCheck = new Set<string>();

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
            await this.prisma.creditCutoff.update({
              where: { id: cutoff.id },
              data: { isPaid: true },
            });
            continue;
          }

          await this.prisma.$transaction(async (prisma) => {
            // Re-obtener el distribuidor con el saldo actualizado en cada iteración
            const distributor = await prisma.distributor.findUnique({
              where: { id: cutoff.distributor.id },
              select: { balance: true, id: true, email: true },
            });

            if (!distributor) return;

            if (distributor.balance >= amountOwed) {
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

              collected++;
            } else if (distributor.balance > 0) {
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
            } else {
              notPaid++;
            }

            // REVISAR BLOQUEO/DESBLOQUEO
            let remainsUnpaid = true;
            if (distributor.balance >= amountOwed) {
              remainsUnpaid = false;
            }

            const isDueOrOverdue = cutoff.paymentDueDate <= nowWithMargin;

            if (isDueOrOverdue && remainsUnpaid) {
              // Si ya venció hoy y no se pudo pagar completo, marcar como vencido y bloquear
              await prisma.creditCutoff.update({
                where: { id: cutoff.id },
                data: { isOverdue: true },
              });

              await prisma.distributorCredit.update({
                where: { id: cutoff.creditId },
                data: { isBlocked: true },
              });

              this.logger.warn(
                `Distribuidor ${cutoff.distributor.email} bloqueado al cierre del día por vencimiento de deuda.`,
              );
            } else if (!remainsUnpaid) {
              // Si se pagó algo, marcar para revisar desbloqueo al final del proceso
              distributorIdsToCheck.add(cutoff.distributorId);
            }
          });
        } catch (error) {
          this.logger.error(
            `Error procesando corte ${cutoff.id}: ${error.message}`,
          );
        }
      }

      // 4. Revisar desbloqueos de forma agrupada al final
      for (const distributorId of distributorIdsToCheck) {
        try {
          const creditsToUnblock = await this.prisma.distributorCredit.findMany(
            {
              where: {
                distributorId,
                isActive: true,
                isBlocked: true,
              },
            },
          );

          for (const credit of creditsToUnblock) {
            const remainingOverdueUnpaid = await this.prisma.creditCutoff.count(
              {
                where: {
                  creditId: credit.id,
                  isPaid: false,
                  paymentDueDate: { lte: nowWithMargin },
                },
              },
            );

            if (remainingOverdueUnpaid === 0) {
              await this.prisma.distributorCredit.update({
                where: { id: credit.id },
                data: { isBlocked: false },
              });
              this.logger.log(
                `Distribuidor ${distributorId} desbloqueado exitosamente.`,
              );
            }
          }
        } catch (unblockError) {
          this.logger.error(
            `Error al intentar desbloquear distribuidor ${distributorId}: ${unblockError.message}`,
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
   * Cron que se ejecuta diariamente a las 12:00 PM (Hora Ecuador)
   * Notifica por WhatsApp a los distribuidores con créditos vencidos impagos
   */
  @Cron('0 12 * * *', {
    timeZone: 'America/Guayaquil',
  })
  async notifyOverdueCredits() {
    // Solo ejecutar notificaciones en production
    if (process.env.ENVIRONMENT !== 'production') {
      this.logger.log(
        'notifyOverdueCredits: omitido porque ENVIRONMENT !== production',
      );
      return;
    }

    this.logger.log(
      'Iniciando proceso de notificación de créditos vencidos...',
    );
    const now = new Date();

    try {
      // Buscar todos los cortes NO pagados que ya vencieron
      const overdueCutoffs = await this.prisma.creditCutoff.findMany({
        where: {
          isPaid: false,
          paymentDueDate: {
            lt: now,
          },
        },
        include: {
          distributor: true,
        },
      });

      if (overdueCutoffs.length === 0) {
        this.logger.log('No se encontraron créditos vencidos para notificar.');
        return;
      }

      const distributorDebts = new Map<
        string,
        {
          distributor: any;
          totalOwed: number;
        }
      >();

      for (const cutoff of overdueCutoffs) {
        const debt = cutoff.amountUsed - cutoff.amountPaid;
        if (debt <= 0) continue;

        const distributorId = cutoff.distributor.id;

        if (!distributorDebts.has(distributorId)) {
          distributorDebts.set(distributorId, {
            distributor: cutoff.distributor,
            totalOwed: 0,
          });
        }

        const current = distributorDebts.get(distributorId)!;
        current.totalOwed += debt;
      }

      this.logger.log(
        `Se notificará a ${distributorDebts.size} distribuidores con deudas vencidas.`,
      );

      // Enviar notificaciones
      for (const [distributorId, data] of distributorDebts) {
        const { distributor, totalOwed } = data;

        const name =
          distributor.firstName || distributor.socialReason || 'Distribuidor';
        const amountFormatted = (totalOwed / 100).toFixed(2);

        try {
          await this.whatsappService.sendTemplate(
            distributor.phone, // El servicio formatea
            'deuda_distribuidor',
            [name, amountFormatted],
          );

          this.logger.log(
            `Notificación enviada a ${name} (${distributor.phone}) por deuda de $${amountFormatted}`,
          );
        } catch (error) {
          this.logger.error(
            `Error enviando WhatsApp a ${distributor.email}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error en cron notifyOverdueCredits: ${error.message}`);
    }
  }

  /**
   * Intentar cobrar créditos vencidos de un distribuidor específico
   * Retorna información sobre lo cobrado
   */
  async attemptCollectOverdueCredits(distributorId: string) {
    this.logger.log(
      `Intentando cobrar deudas de crédito para distribuidor ${distributorId}...`,
    );

    try {
      const now = new Date();

      // Calcular el inicio del día de hoy en Ecuador (para excluir el corte que aún está abierto)
      const ecuadorDateString = now.toLocaleString('en-US', {
        timeZone: 'America/Guayaquil',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const [month, day, year] = ecuadorDateString.split('/');
      const startOfToday = new Date(
        `${year}-${month}-${day}T00:00:00.000-05:00`,
      );

      // Obtener todos los cortes no pagados de días ANTERIORES a hoy
      const unpaidCutoffs = await this.prisma.creditCutoff.findMany({
        where: {
          distributorId,
          isPaid: false,
          cutoffDate: {
            lt: startOfToday,
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

      if (unpaidCutoffs.length === 0) {
        return {
          success: true,
          message: 'No hay deudas de crédito de días anteriores pendientes',
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

        try {
          let shouldBreak = false;

          await this.prisma.$transaction(async (prisma) => {
            // Obtener el saldo actual del distribuidor dentro de la transacción
            const distributor = await prisma.distributor.findUnique({
              where: { id: distributorId },
              select: { balance: true },
            });

            if (!distributor || distributor.balance <= 0) {
              remaining++;
              details.push({
                cutoffId: cutoff.id,
                cutoffDate: cutoff.cutoffDate,
                amountOwed,
                amountCollected: 0,
                status: 'pending',
                reason: 'Saldo insuficiente',
              });
              shouldBreak = true;
              return;
            }

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
          isBlocked: true,
        },
      });

      for (const credit of creditsToUnblock) {
        const remainingOverdueUnpaid = await this.prisma.creditCutoff.count({
          where: {
            creditId: credit.id,
            isPaid: false,
            paymentDueDate: { lte: now }, // Solo los que ya vencieron
          },
        });

        if (remainingOverdueUnpaid === 0) {
          await this.prisma.distributorCredit.update({
            where: { id: credit.id },
            data: { isBlocked: false },
          });

          this.logger.log(
            `Crédito ${credit.id} desbloqueado - no quedan deudas vencidas`,
          );
        }
      }

      this.logger.log(
        `Cobros completados para distribuidor ${distributorId}. Cobrados: ${collected}, Parciales: ${partiallyPaid}, Pendientes: ${remaining}, Total: $${(totalCollected / 100).toFixed(2)}`,
      );

      return {
        success: true,
        message: `Se cobraron ${collected + partiallyPaid} deudas por un total de $${(totalCollected / 100).toFixed(2)}`,
        collected,
        partiallyPaid,
        remaining,
        totalCollected,
        details,
      };
    } catch (error) {
      this.logger.error(
        `Error en cobro de deudas de crédito para distribuidor ${distributorId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Obtener resumen de crédito de un distribuidor
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
   * Obtener todos los créditos de un distribuidor
   */
  async getAllDistributorCredits(distributorId: string) {
    try {
      await this.prisma.distributor.findUniqueOrThrow({
        where: { id: distributorId },
      });
      const credits = await this.prisma.distributorCredit.findMany({
        where: { distributorId },
        include: {
          creditCutoffs: {
            orderBy: { cutoffDate: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return {
        success: true,
        data: credits,
      };
    } catch {
      throw new NotFoundException(
        'Distribuidor no encontrado o no tiene créditos',
      );
    }
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
