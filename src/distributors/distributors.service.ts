import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBillingInfoDto } from './dto/create-billing-info.dto';
import { UpdateBillingInfoDto } from './dto/update-billing-info.dto';

@Injectable()
export class DistributorsService {
  constructor(private readonly prisma: PrismaService) {}

  // Obtener información de un distribuidor con su info de facturación
  async getDistributorById(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      include: {
        billingInfo: true,
        planPrices: {
          where: { isActive: true },
          include: {
            plan: true,
          },
        },
      },
    });

    if (!distributor) {
      throw new NotFoundException({
        message: 'Distribuidor no encontrado',
        error: 'DISTRIBUTOR_NOT_FOUND',
      });
    }

    return {
      success: true,
      distributor,
    };
  }

  // Crear información de facturación para un distribuidor
  async createBillingInfo(distributorId: string, data: CreateBillingInfoDto) {
    // Verificar que el distribuidor existe
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      include: { billingInfo: true },
    });

    if (!distributor) {
      throw new NotFoundException({
        message: 'Distribuidor no encontrado',
        error: 'DISTRIBUTOR_NOT_FOUND',
      });
    }

    // Verificar si ya tiene info de facturación
    if (distributor.billingInfo) {
      throw new ConflictException({
        message: 'El distribuidor ya tiene información de facturación',
        error: 'BILLING_INFO_EXISTS',
      });
    }

    // Crear info de facturación
    const billingInfo = await this.prisma.billingInfo.create({
      data: {
        distributorId,
        useDistributorData: data.useDistributorData,
        socialReason: data.useDistributorData ? null : data.socialReason,
        identificationType: data.useDistributorData
          ? null
          : data.identificationType,
        identification: data.useDistributorData ? null : data.identification,
        email: data.useDistributorData ? null : data.email,
        phone: data.useDistributorData ? null : data.phone,
        address: data.useDistributorData ? null : data.address,
      },
    });

    return {
      success: true,
      message: 'Información de facturación creada exitosamente',
      billingInfo,
    };
  }

  // Actualizar información de facturación
  async updateBillingInfo(distributorId: string, data: UpdateBillingInfoDto) {
    // Verificar que el distribuidor existe y tiene billing info
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      include: { billingInfo: true },
    });

    if (!distributor) {
      throw new NotFoundException({
        message: 'Distribuidor no encontrado',
        error: 'DISTRIBUTOR_NOT_FOUND',
      });
    }

    if (!distributor.billingInfo) {
      throw new NotFoundException({
        message: 'El distribuidor no tiene información de facturación',
        error: 'BILLING_INFO_NOT_FOUND',
      });
    }

    // Actualizar info de facturación
    const updatedBillingInfo = await this.prisma.billingInfo.update({
      where: { distributorId },
      data: {
        useDistributorData: data.useDistributorData,
        socialReason: data.socialReason,
        identificationType: data.identificationType,
        identification: data.identification,
        email: data.email,
        phone: data.phone,
        address: data.address,
      },
    });

    return {
      success: true,
      message: 'Información de facturación actualizada exitosamente',
      billingInfo: updatedBillingInfo,
    };
  }

  // Obtener información de facturación
  async getBillingInfo(distributorId: string) {
    const billingInfo = await this.prisma.billingInfo.findUnique({
      where: { distributorId },
      include: {
        distributor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            socialReason: true,
            identification: true,
            email: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    if (!billingInfo) {
      throw new NotFoundException({
        message: 'Información de facturación no encontrada',
        error: 'BILLING_INFO_NOT_FOUND',
      });
    }

    return {
      success: true,
      billingInfo,
    };
  }

  // Listar todos los distribuidores
  async getAllDistributors() {
    const distributors = await this.prisma.distributor.findMany({
      where: { active: true },
      include: {
        billingInfo: true,
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
      count: distributors.length,
      distributors,
    };
  }
}
