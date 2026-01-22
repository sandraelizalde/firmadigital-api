import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { PayphoneService } from './payphone.service';
import { CreditsService } from '../credits/credits.service';
import { RechargeMethod, RechargeStatus, MovementType } from '@prisma/client';
import { CreateRechargeDto } from './dto/create-recharge.dto';
import { ManualRechargeDto } from './dto/manual-recharge.dto';
import { ReviewRechargeDto } from './dto/review-recharge.dto';
import { InitCardRechargeDto } from './dto/init-card-recharge.dto';
import { PayphoneConfirmationDto } from './dto/payphone-confirmation.dto';

@Injectable()
export class RechargesService {
  private readonly logger = new Logger(RechargesService.name);

  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
    private payphoneService: PayphoneService,
    private creditsService: CreditsService,
  ) { }

  /**
   * Iniciar recarga con tarjeta (Payphone)
   * Crea una recarga PENDING y devuelve los datos necesarios para la cajita de Payphone
   */
  async initCardRecharge(distributorId: string, dto: InitCardRechargeDto) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      select: {
        id: true,
        active: true,
        email: true,
        identification: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!distributor) {
      throw new NotFoundException('Distribuidor no encontrado');
    }

    if (!distributor.active) {
      throw new BadRequestException('Distribuidor inactivo');
    }

    // Crear la recarga en estado PENDING
    const recharge = await this.prisma.recharge.create({
      data: {
        distributorId,
        method: RechargeMethod.CARD,
        requestedAmount: dto.requestedAmount + dto.requestedAmount * 0.06,
        commission: dto.requestedAmount * 0.06, // 6% de comisión
        status: RechargeStatus.PENDING,
        paymentReference: dto.reference || 'Recarga con tarjeta',
      },
      select: {
        id: true,
        requestedAmount: true,
        commission: true,
        createdAt: true,
      },
    });

    // Retornar datos para el frontend
    return {
      rechargeId: recharge.id,
      amount: recharge.requestedAmount,
      commission: recharge.commission,
      clientTransactionId: recharge.id,
      payphone: {
        currency: 'USD',
        reference: dto.reference || 'Recarga de saldo',
      },
      distributor: {
        email: distributor.email,
        documentId: distributor.identification,
        name: `${distributor.firstName} ${distributor.lastName}`,
      },
    };
  }

  /**
   * Confirmar pago de recarga con Payphone
   * Recibe los parámetros de la URL de respuesta y consulta el estado en Payphone
   */
  async confirmCardRecharge(
    distributorId: string,
    dto: PayphoneConfirmationDto,
  ) {
    // Verificar que la recarga pertenece al distribuidor
    const recharge = await this.prisma.recharge.findFirst({
      where: {
        id: dto.clientTxId,
        distributorId,
        method: RechargeMethod.CARD,
      },
      include: { distributor: true },
    });

    if (!recharge) {
      throw new NotFoundException('Recarga no encontrada o no autorizada');
    }

    if (recharge.status !== RechargeStatus.PENDING) {
      throw new BadRequestException(
        `La recarga ya fue procesada con estado: ${recharge.status}`,
      );
    }

    // Confirmar con Payphone
    const payphoneResponse = await this.payphoneService.confirmTransaction({
      id: dto.id,
      clientTxId: dto.clientTxId,
    });

    // Mapear estado de Payphone
    let status: RechargeStatus;
    if (payphoneResponse.statusCode === 3) {
      status = RechargeStatus.APPROVED;
    } else if (payphoneResponse.statusCode === 2) {
      status = RechargeStatus.REJECTED;
    } else {
      status = RechargeStatus.FAILED;
    }

    // Procesar la transacción
    const result = await this.prisma.$transaction(async (tx) => {
      let newBalance = recharge.distributor.balance;

      if (status === RechargeStatus.APPROVED) {
        // Usar los valores ya calculados en initCardRecharge
        const creditedAmount =
          recharge.requestedAmount - (recharge.commission ?? 0);
        newBalance = recharge.distributor.balance + creditedAmount;

        // Actualizar balance
        await tx.distributor.update({
          where: { id: recharge.distributorId },
          data: { balance: newBalance },
        });

        // Crear movimiento
        await tx.accountMovement.create({
          data: {
            distributorId: recharge.distributorId,
            type: MovementType.INCOME,
            detail: `Recarga con tarjeta aprobada - Payphone`,
            amount: creditedAmount,
            balanceAfter: newBalance,
            rechargeId: recharge.id,
            note: `Transacción Payphone: ${payphoneResponse.transactionId} - ${payphoneResponse.cardBrand} ${payphoneResponse.lastDigits}`,
          },
        });
      }

      // Actualizar recarga con el estado de Payphone
      const updatedRecharge = await tx.recharge.update({
        where: { id: recharge.id },
        data: {
          status,
          paymentReference: `Payphone: ${payphoneResponse.transactionId}`,
          creditedAmount:
            status === RechargeStatus.APPROVED
              ? recharge.requestedAmount - (recharge.commission ?? 0)
              : 0,
        },
        include: {
          distributor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              balance: true,
            },
          },
          accountMovements: true,
        },
      });

      return {
        recharge: updatedRecharge,
        payphone: {
          transactionId: payphoneResponse.transactionId,
          authorizationCode: payphoneResponse.authorizationCode,
          cardBrand: payphoneResponse.cardBrand,
          lastDigits: payphoneResponse.lastDigits,
          transactionStatus: payphoneResponse.transactionStatus,
        },
      };
    });

    // Intentar cobrar créditos vencidos si se aprobó el pago
    if (status === RechargeStatus.APPROVED) {
      try {
        const creditResult =
          await this.creditsService.attemptCollectOverdueCredits(
            result.recharge.distributorId,
          );

        this.logger.log(
          `Cobro automático de créditos (Payphone) para distribuidor ${result.recharge.distributorId}: ${creditResult.message}`,
        );
      } catch (error) {
        this.logger.error(
          `Error en cobro automático de créditos (Payphone): ${error.message}`,
        );
        // No lanzar error para no afectar la confirmación del pago
      }
    }

    return result;
  }

  /**
   * Crear una nueva solicitud de recarga
   * - Si es TRANSFER: queda en PENDING hasta aprobación del admin
   */
  async createRecharge(distributorId: string, dto: CreateRechargeDto) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      throw new NotFoundException('Distribuidor no encontrado');
    }

    if (!distributor.active) {
      throw new BadRequestException('Distribuidor inactivo');
    }

    // Subir el archivo a S3 si viene receiptFile
    let receiptFileUrl: string | undefined;
    if (dto.receiptFile) {
      // Detectar la extensión del archivo desde el base64
      const extension = this.detectFileExtension(dto.receiptFile);
      receiptFileUrl = await this.filesService.uploadFile(
        dto.receiptFile,
        Date.now(),
        extension,
        'vouchers-distribuidores',
        'vouchers-nexus',
      );
    }

    // Crear la recarga
    const recharge = await this.prisma.recharge.create({
      data: {
        distributorId,
        method: dto.method,
        requestedAmount: dto.requestedAmount,
        status: RechargeStatus.PENDING,
        paymentReference: dto.paymentReference,
        transferDate: dto.transferDate,
        receiptFile: receiptFileUrl,
      },
      include: {
        distributor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            identification: true,
          },
        },
      },
    });

    return recharge;
  }

  /**
   * Obtener historial de recargas del distribuidor autenticado
   */
  async getMyRecharges(
    distributorId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    // Obtener total de recargas
    const total = await this.prisma.recharge.count({
      where: { distributorId },
    });

    // Obtener recargas paginadas
    const recharges = await this.prisma.recharge.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        accountMovements: true,
      },
    });

    // Convertir receiptFile a base64
    // const rechargesWithReceipt = await Promise.all(
    //   recharges.map(async (recharge) => ({
    //     ...recharge,
    //     receiptFile: recharge.receiptFile
    //       ? await this.filesService.getVoucher(recharge.receiptFile)
    //       : null,
    //   })),
    // );

    return {
      success: true,
      data: recharges,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener una recarga específica del distribuidor
   */
  async getMyRecharge(distributorId: string, rechargeId: string) {
    const recharge = await this.prisma.recharge.findFirst({
      where: {
        id: rechargeId,
        distributorId,
      },
      include: {
        accountMovements: true,
        distributor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            balance: true,
          },
        },
      },
    });

    if (!recharge) {
      throw new NotFoundException('Recarga no encontrada');
    }

    // Convertir receiptFile a base64
    return {
      ...recharge,
      receiptFile: recharge.receiptFile
        ? await this.filesService.getFile(
          recharge.receiptFile,
          'vouchers-nexus',
        )
        : null,
    };
  }

  /**
   * ADMIN: Obtener todas las recargas pendientes o todas
   */
  async getAllRecharges(
    status?: RechargeStatus,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const whereCondition = status ? { status } : undefined;

    // Obtener total de recargas
    const total = await this.prisma.recharge.count({
      where: whereCondition,
    });

    // Obtener recargas paginadas
    const recharges = await this.prisma.recharge.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        distributor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            socialReason: true,
            email: true,
            identification: true,
            balance: true,
          },
        },
      },
    });

    return {
      success: true,
      data: recharges,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * ADMIN: Obtener una recarga específica
   */
  async getRechargeById(rechargeId: string) {
    const recharge = await this.prisma.recharge.findUnique({
      where: { id: rechargeId },
      include: {
        distributor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            socialReason: true,
            email: true,
            identification: true,
            balance: true,
          },
        },
        accountMovements: true,
      },
    });

    if (!recharge) {
      throw new NotFoundException('Recarga no encontrada');
    }

    // Convertir receiptFile a base64
    return {
      ...recharge,
      receiptFileUrl: recharge.receiptFile
        ? await this.filesService.getFileUrl(
          recharge.receiptFile,
          'vouchers-nexus',
        )
        : null,
    };
  }

  /**
   * ADMIN: Aprobar o rechazar una recarga por transferencia
   * - Si se aprueba: aumenta el balance del distribuidor
   * - Si se rechaza: no afecta el balance
   */
  async reviewRecharge(
    rechargeId: string,
    adminName: string,
    dto: ReviewRechargeDto,
  ) {
    const recharge = await this.prisma.recharge.findUnique({
      where: { id: rechargeId },
      include: { distributor: true },
    });

    if (!recharge) {
      throw new NotFoundException('Recarga no encontrada');
    }

    if (recharge.status !== RechargeStatus.PENDING) {
      throw new BadRequestException(
        `La recarga ya fue ${recharge.status.toLowerCase()}`,
      );
    }

    // Usar transacción para garantizar consistencia
    const updatedRecharge = await this.prisma.$transaction(async (tx) => {
      let newBalance = recharge.distributor.balance;
      let creditedAmount = 0;

      if (dto.status === RechargeStatus.APPROVED) {
        // Calcular comisión si aplica (ejemplo: 0% para transferencias)
        const commission = 0; // Se puede parametrizar según el método
        creditedAmount = recharge.requestedAmount - commission;
        newBalance = recharge.distributor.balance + creditedAmount;

        // Actualizar balance del distribuidor
        await tx.distributor.update({
          where: { id: recharge.distributorId },
          data: { balance: newBalance },
        });

        // Crear movimiento de cuenta
        await tx.accountMovement.create({
          data: {
            distributorId: recharge.distributorId,
            type: MovementType.INCOME,
            detail: `Recarga aprobada - ${recharge.method}`,
            amount: creditedAmount,
            balanceAfter: newBalance,
            rechargeId: recharge.id,
            adminName,
            note: dto.adminNote,
          },
        });
      }

      // Actualizar la recarga
      const updatedRecharge = await tx.recharge.update({
        where: { id: rechargeId },
        data: {
          status: dto.status,
          approvedBy: adminName,
          adminNote: dto.adminNote,
          creditedAmount,
          commission:
            dto.status === RechargeStatus.APPROVED
              ? recharge.requestedAmount - creditedAmount
              : null,
        },
        include: {
          distributor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              balance: true,
            },
          },
          accountMovements: true,
        },
      });

      return updatedRecharge;
    });

    // Intentar cobrar créditos vencidos si se aprobó la recarga
    if (dto.status === RechargeStatus.APPROVED) {
      try {
        const creditResult =
          await this.creditsService.attemptCollectOverdueCredits(
            updatedRecharge.distributorId,
          );

        this.logger.log(
          `Cobro automático de créditos para distribuidor ${updatedRecharge.distributorId}: ${creditResult.message}`,
        );
      } catch (error) {
        this.logger.error(
          `Error en cobro automático de créditos: ${error.message}`,
        );
        // No lanzar error para no afectar la aprobación de la recarga
      }
    }

    return updatedRecharge;
  }

  /**
   * ADMIN: Asignar recarga manual a un distribuidor
   * Similar a aprobar una recarga, pero sin solicitud previa
   */
  async createManualRecharge(adminName: string, dto: ManualRechargeDto) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: dto.distributorId },
    });

    if (!distributor) {
      throw new NotFoundException('Distribuidor no encontrado');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const newBalance = distributor.balance + dto.amount;

      // Crear la recarga
      const recharge = await tx.recharge.create({
        data: {
          distributorId: dto.distributorId,
          method: RechargeMethod.MANUAL, // Por defecto
          requestedAmount: dto.amount,
          creditedAmount: dto.amount,
          commission: 0,
          status: RechargeStatus.APPROVED,
          approvedBy: adminName,
          paymentReference: dto.note || 'Recarga manual por administrador',
          adminNote: dto.note || 'Recarga manual por administrador',
        },
      });

      // Actualizar balance
      await tx.distributor.update({
        where: { id: dto.distributorId },
        data: { balance: newBalance },
      });

      // Crear movimiento
      await tx.accountMovement.create({
        data: {
          distributorId: dto.distributorId,
          type: MovementType.INCOME,
          detail: 'Recarga manual por administrador',
          amount: dto.amount,
          balanceAfter: newBalance,
          rechargeId: recharge.id,
          adminName,
          note: dto.note,
        },
      });

      return tx.recharge.findUnique({
        where: { id: recharge.id },
        include: {
          distributor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              balance: true,
            },
          },
          accountMovements: true,
        },
      });
    });

    //Cobrar créditos vencidos si los hay (AFUERA de la transacción principal)
    try {
      const creditResult =
        await this.creditsService.attemptCollectOverdueCredits(
          dto.distributorId,
        );

      this.logger.log(
        `Cobro automático de créditos (recarga manual) para distribuidor ${dto.distributorId}: ${creditResult.message}`,
      );
    } catch (error) {
      this.logger.error(
        `Error en cobro automático de créditos (recarga manual): ${error.message}`,
      );
      // No lanzar error para no afectar la creación de la recarga
    }

    return result;
  }

  /**
   * ADMIN: Descontar balance manualmente de un distribuidor
   * Similar a createManualRecharge pero resta del balance
   */
  async deductBalance(
    adminName: string,
    distributorId: string,
    amount: number,
    note?: string,
  ) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      throw new NotFoundException('Distribuidor no encontrado');
    }

    if (distributor.balance < amount) {
      throw new BadRequestException(
        `Balance insuficiente. El distribuidor tiene $${(distributor.balance / 100).toFixed(2)} y se intentan descontar $${(amount / 100).toFixed(2)}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const newBalance = distributor.balance - amount;

      // Actualizar balance
      await tx.distributor.update({
        where: { id: distributorId },
        data: { balance: newBalance },
      });

      // Crear movimiento de descuento
      const movement = await tx.accountMovement.create({
        data: {
          distributorId,
          type: MovementType.ADJUSTMENT,
          detail: note || 'Descuento manual por administrador',
          amount: amount,
          balanceAfter: newBalance,
          adminName,
        },
      });

      return {
        success: true,
        message: `Se descontaron $${(amount / 100).toFixed(2)} del balance del distribuidor`,
        data: {
          movement,
          previousBalance: distributor.balance,
          newBalance,
          amountDeducted: amount,
        },
      };
    });
  }

  /**
   * Obtener movimientos de cuenta del distribuidor
   */
  async getAccountMovements(
    distributorId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    // Obtener total de movimientos
    const total = await this.prisma.accountMovement.count({
      where: { distributorId },
    });

    // Obtener movimientos paginados
    const movements = await this.prisma.accountMovement.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        recharge: {
          select: {
            id: true,
            method: true,
            requestedAmount: true,
            creditedAmount: true,
            status: true,
          },
        },
      },
    });

    return {
      success: true,
      data: movements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * ADMIN: Obtener recargas de un distribuidor específico
   */
  async getDistributorRecharges(
    distributorId: string,
    filterDto: any,
  ) {
    const { page = 1, limit = 10, startDate, endDate } = filterDto;

    // Verificar que el distribuidor exista
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        socialReason: true,
        email: true,
        identification: true,
        balance: true,
      },
    });

    if (!distributor) {
      throw new NotFoundException('Distribuidor no encontrado');
    }

    const skip = (page - 1) * limit;

    // Construir filtro
    const where: any = { distributorId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        // Asumiendo formato YYYY-MM-DD
        const startDateTime = new Date(`${startDate}T00:00:00-05:00`);
        where.createdAt.gte = startDateTime;
      }
      if (endDate) {
        // Asumiendo formato YYYY-MM-DD
        const endDateTime = new Date(`${endDate}T23:59:59.999-05:00`);
        where.createdAt.lte = endDateTime;
      }
    }

    // Obtener total de recargas
    const total = await this.prisma.recharge.count({
      where,
    });

    // Obtener recargas paginadas
    const recharges = await this.prisma.recharge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        accountMovements: true,
      },
    });

    return {
      success: true,
      distributor,
      data: recharges,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * ADMIN: Obtener movimientos de cuenta de un distribuidor
   */
  async getDistributorAccountMovements(
    distributorId: string,
    filterDto: any,
  ) {
    const { page = 1, limit = 10, startDate, endDate } = filterDto;

    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      throw new NotFoundException('Distribuidor no encontrado');
    }

    const skip = (page - 1) * limit;

    // Construir filtro
    const where: any = { distributorId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const startDateTime = new Date(`${startDate}T00:00:00-05:00`);
        where.createdAt.gte = startDateTime;
      }
      if (endDate) {
        const endDateTime = new Date(`${endDate}T23:59:59.999-05:00`);
        where.createdAt.lte = endDateTime;
      }
    }

    // Obtener total de movimientos
    const total = await this.prisma.accountMovement.count({
      where,
    });

    // Obtener movimientos paginados
    const movements = await this.prisma.accountMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        recharge: {
          select: {
            id: true,
            method: true,
            requestedAmount: true,
            creditedAmount: true,
            status: true,
          },
        },
      },
    });

    return {
      success: true,
      data: movements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener resumen de recargas del distribuidor
   * Balance total, recargas pendientes y ventas totales
   */
  async getRechargesSummary(distributorId: string) {
    // Obtener balance actual del distribuidor
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      select: {
        balance: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!distributor) {
      throw new NotFoundException('Distribuidor no encontrado');
    }

    // Obtener recargas pendientes (cantidad y monto total)
    const pendingRecharges = await this.prisma.recharge.findMany({
      where: {
        distributorId,
        status: RechargeStatus.PENDING,
      },
      select: {
        requestedAmount: true,
      },
    });

    const pendingRechargesCount = pendingRecharges.length;
    const pendingRechargesAmount = pendingRecharges.reduce(
      (sum, r) => sum + r.requestedAmount,
      0,
    );

    // Obtener ventas totales (movimientos de tipo EXPENSE)
    const totalSales = await this.prisma.accountMovement.aggregate({
      where: {
        distributorId,
        type: MovementType.EXPENSE,
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    return {
      success: true,
      summary: {
        distributor: {
          name: `${distributor.firstName} ${distributor.lastName}`,
        },
        balance: distributor.balance,
        pendingRecharges: {
          count: pendingRechargesCount,
          amount: pendingRechargesAmount,
        },
        sales: {
          count: totalSales._count,
          amount: Math.abs(totalSales._sum.amount || 0), // Convertir a positivo
        },
      },
    };
  }

  /**
   * Detecta la extensión del archivo desde el base64
   */
  private detectFileExtension(base64: string): string {
    // Detectar desde el prefijo data:image/jpeg;base64,
    if (base64.startsWith('data:')) {
      const mimeMatch = base64.match(/data:([^;]+);/);
      if (mimeMatch) {
        const mimeType = mimeMatch[1];
        const extensionMap: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp',
          'application/pdf': 'pdf',
        };
        return extensionMap[mimeType] || 'jpg';
      }
    }
    // Por defecto retornar jpg
    return 'jpg';
  }

  /**
   * ADMIN: Actualizar el número de recibo de una recarga
   */
  async updateRechargeNumberReceipt(rechargeId: string, numberReceipt: string) {
    try {
      const updatedRecharge = await this.prisma.recharge.update({
        where: { id: rechargeId },
        data: { numberReceipt },
      });

      return {
        success: true,
        message: 'Número de recibo actualizado correctamente',
        data: updatedRecharge,
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          `El número de recibo ${numberReceipt} ya está asignado a otra recarga`,
        );
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Recarga no encontrada');
      }

      throw error;
    }
  }
}
