import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RechargeMethod,
  RechargeStatus,
  MovementType,
  Role,
} from '@prisma/client';
import { CreateRechargeDto } from './dto/create-recharge.dto';
import { ManualRechargeDto } from './dto/manual-recharge.dto';
import { ReviewRechargeDto } from './dto/review-recharge.dto';

@Injectable()
export class RechargesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crear una nueva solicitud de recarga
   * - Si es TRANSFER: queda en PENDING hasta aprobación del admin
   * - Si es CARD: se crea en PENDING y se debe integrar con Payphone
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

    // Crear la recarga
    const recharge = await this.prisma.recharge.create({
      data: {
        distributorId,
        method: dto.method,
        requestedAmount: dto.requestedAmount,
        status: RechargeStatus.PENDING,
        paymentReference: dto.paymentReference,
        transferDate: dto.transferDate,
        receiptFile: dto.receiptFile,
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

    // Si es con tarjeta, aquí se integraría con Payphone
    // Por ahora retornamos la recarga para procesar el pago
    if (dto.method === RechargeMethod.CARD) {
      // TODO: Integrar con Payphone
      // Se debería generar un link de pago o procesar la transacción
      // y actualizar el estado según la respuesta
    }

    return recharge;
  }

  /**
   * Obtener historial de recargas del distribuidor autenticado
   */
  async getMyRecharges(distributorId: string) {
    return this.prisma.recharge.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
      include: {
        accountMovements: true,
      },
    });
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

    return recharge;
  }

  /**
   * ADMIN: Obtener todas las recargas pendientes o todas
   */
  async getAllRecharges(status?: RechargeStatus) {
    return this.prisma.recharge.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
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

    return recharge;
  }

  /**
   * ADMIN: Aprobar o rechazar una recarga por transferencia
   * - Si se aprueba: aumenta el balance del distribuidor
   * - Si se rechaza: no afecta el balance
   */
  async reviewRecharge(
    rechargeId: string,
    adminId: string,
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
    return this.prisma.$transaction(async (tx) => {
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
            adminId,
            note: dto.adminNote,
          },
        });
      }

      // Actualizar la recarga
      const updatedRecharge = await tx.recharge.update({
        where: { id: rechargeId },
        data: {
          status: dto.status,
          adminId,
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
  }

  /**
   * ADMIN: Asignar recarga manual a un distribuidor
   * Similar a aprobar una recarga, pero sin solicitud previa
   */
  async createManualRecharge(adminId: string, dto: ManualRechargeDto) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: dto.distributorId },
    });

    if (!distributor) {
      throw new NotFoundException('Distribuidor no encontrado');
    }

    return this.prisma.$transaction(async (tx) => {
      const newBalance = distributor.balance + dto.amount;

      // Crear la recarga
      const recharge = await tx.recharge.create({
        data: {
          distributorId: dto.distributorId,
          method: RechargeMethod.TRANSFER, // Por defecto
          requestedAmount: dto.amount,
          creditedAmount: dto.amount,
          commission: 0,
          status: RechargeStatus.APPROVED,
          adminId,
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
          adminId,
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
  }

  /**
   * Webhook de Payphone para actualizar estado de pagos con tarjeta
   * Este método se llamará cuando Payphone notifique el resultado del pago
   */
  async handlePayphoneWebhook(data: any) {
    // TODO: Validar firma/token de Payphone para seguridad

    const rechargeId = data.clientTransactionId;
    const recharge = await this.prisma.recharge.findUnique({
      where: { id: rechargeId },
      include: { distributor: true },
    });

    if (!recharge) {
      throw new NotFoundException('Recarga no encontrada');
    }

    if (recharge.method !== RechargeMethod.CARD) {
      throw new BadRequestException('La recarga no es por tarjeta');
    }

    // Mapear estado de Payphone a nuestro sistema
    let status: RechargeStatus;
    if (data.status === 'Approved' || data.status === 'approved') {
      status = RechargeStatus.APPROVED;
    } else if (data.status === 'Rejected' || data.status === 'rejected') {
      status = RechargeStatus.REJECTED;
    } else {
      status = RechargeStatus.FAILED;
    }

    return this.prisma.$transaction(async (tx) => {
      let newBalance = recharge.distributor.balance;
      let creditedAmount = 0;

      if (status === RechargeStatus.APPROVED) {
        // Calcular comisión (ejemplo: 3% para tarjetas) - redondeado para evitar decimales
        const commission = Math.round(recharge.requestedAmount * 0.03);
        creditedAmount = recharge.requestedAmount - commission;
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
            note: `Transacción Payphone: ${data.transactionId}`,
          },
        });
      }

      // Actualizar recarga
      return tx.recharge.update({
        where: { id: rechargeId },
        data: {
          status,
          creditedAmount,
          commission:
            status === RechargeStatus.APPROVED
              ? recharge.requestedAmount - creditedAmount
              : null,
          paymentReference: data.transactionId,
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
        },
      });
    });
  }

  /**
   * Obtener movimientos de cuenta del distribuidor
   */
  async getAccountMovements(distributorId: string) {
    return this.prisma.accountMovement.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
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
  }

  /**
   * ADMIN: Obtener movimientos de cuenta de un distribuidor
   */
  async getDistributorAccountMovements(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      throw new NotFoundException('Distribuidor no encontrado');
    }

    return this.getAccountMovements(distributorId);
  }
}
