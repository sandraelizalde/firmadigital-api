import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBillingInfoDto } from './dto/create-billing-info.dto';
import { UpdateBillingInfoDto } from './dto/update-billing-info.dto';
import { SignatureStatus } from '@prisma/client';
import { FilesService } from 'src/files/files.service';
import { UploadContractDto } from './dto/upload-contract.dto';
import { AuthService } from 'src/auth/auth.service';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class DistributorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  // Buscar distribuidores por nombre para combobox
  async searchDistributors(name: string) {
    if (!name || name.trim().length < 2) {
      return {
        success: true,
        distributors: [],
      };
    }

    const searchTerm = name.trim();

    const distributors = await this.prisma.distributor.findMany({
      where: {
        active: true,
        OR: [
          {
            firstName: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            socialReason: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        socialReason: true,
      },
      take: 10,
      orderBy: {
        firstName: 'asc',
      },
    });

    return {
      success: true,
      distributors: distributors.map((d) => ({
        id: d.id,
        fullName: d.socialReason
          ? `${d.firstName} ${d.lastName} - ${d.socialReason}`
          : `${d.firstName} ${d.lastName}`,
      })),
    };
  }

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
            {
              plan: {
                perfil: 'asc',
              },
            },
          ],
        },
      },
    });

    if (!distributor) {
      throw new NotFoundException({
        message: 'Distribuidor no encontrado',
        error: 'DISTRIBUTOR_NOT_FOUND',
      });
    }

    // Obtener contrato en base64 si existe
    let contract_url: string | null = null;
    if (distributor.contractSignedUrl) {
      try {
        contract_url = await this.filesService.getFileUrl(
          distributor.contractSignedUrl,
          'contratos-distribuidores',
        );
      } catch (error) {
        // Si hay error al obtener el contrato, continuar sin él
        contract_url = null;
      }
    }

    // Obtener URLs firmadas de las fotos de identificación
    let identificationFront_url: string | null = null;
    let identificationBack_url: string | null = null;

    if (distributor.identificationFrontUrl) {
      try {
        identificationFront_url = await this.filesService.getFileUrl(
          distributor.identificationFrontUrl,
          'fotos-cedulas',
        );
      } catch (error) {
        identificationFront_url = null;
      }
    }

    if (distributor.identificationBackUrl) {
      try {
        identificationBack_url = await this.filesService.getFileUrl(
          distributor.identificationBackUrl,
          'fotos-cedulas',
        );
      } catch (error) {
        identificationBack_url = null;
      }
    }

    // Decodificar la contraseña
    const decryptedPassword = this.authService.decryptPassword(
      distributor.password,
    );

    return {
      success: true,
      distributor: {
        ...distributor,
        password: decryptedPassword,
        contract_url,
        identificationFront_url,
        identificationBack_url,
      },
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

  // Subir contrato de distribuidor
  async uploadContract(distributorId: string, data: UploadContractDto) {
    // Verificar que el distribuidor existe
    try {
      const distributor = await this.prisma.distributor.findUnique({
        where: { id: distributorId },
      });

      if (!distributor) {
        throw new NotFoundException({
          message: 'Distribuidor no encontrado',
          error: 'DISTRIBUTOR_NOT_FOUND',
        });
      }

      // Subir contrato a S3 y obtener la key
      const contractKey = await this.filesService.uploadFile(
        data.contractBase64,
        distributorId,
        'pdf',
        distributor.identification,
        'contratos-distribuidores',
      );

      // Obtener la contraseña desencriptada para enviarla por email
      const decryptedPassword = this.authService.decryptPassword(
        distributor.password,
      );

      // Actualizar el distribuidor con la key del contrato y activarlo en una transacción
      const updatedDistributor = await this.prisma.$transaction(async (tx) => {
        return await tx.distributor.update({
          where: { id: distributorId },
          data: {
            contractSignedUrl: contractKey,
            active: true,
          },
        });
      });

      // Enviar email de bienvenida con las credenciales
      const distributorName =
        distributor.socialReason ||
        `${distributor.firstName} ${distributor.lastName}`;

      try {
        await this.mailService.sendWelcomeDistributor(
          distributor.email,
          distributorName,
          decryptedPassword,
        );
      } catch (emailError) {
        // Si falla el envío del email, registrar el error pero no fallar la operación
        console.error('Error al enviar email de bienvenida:', emailError);
      }

      return {
        success: true,
        message: 'Contrato subido exitosamente y distribuidor activado',
        contractKey: updatedDistributor.contractSignedUrl,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al subir el contrato',
        error: error.message,
      };
    }
  }

  // Listar todos los distribuidores con paginación
  async getAllDistributors(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    // Obtener el total de distribuidores activos
    const total = await this.prisma.distributor.count({});

    // Obtener distribuidores paginados
    const distributors = await this.prisma.distributor.findMany({
      // include: {
      //   billingInfo: true,
      //   planPrices: {
      //     where: { isActive: true },
      //     include: {
      //       plan: true,
      //     },
      //   },
      // },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Calcular información de paginación
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: distributors,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    };
  }

  // Obtener información del dashboard del distribuidor
  async getDashboardInfo(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        identification: true,
        phone: true,
        address: true,
        balance: true,
        active: true,
      },
    });

    if (!distributor) {
      throw new NotFoundException({
        message: 'Distribuidor no encontrado',
        error: 'DISTRIBUTOR_NOT_FOUND',
      });
    }

    // Obtener total de firmas vendidas
    const totalSignatures = await this.prisma.signatureRequest.count({
      where: {
        distributorId,
        status: SignatureStatus.COMPLETED,
      },
    });

    // Obtener recargas del mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const monthlySpent = await this.prisma.recharge.aggregate({
      where: {
        distributorId,
        status: 'APPROVED',
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        creditedAmount: true,
      },
    });

    // Obtener últimos 2 movimientos de cuenta
    const recentMovements = await this.prisma.accountMovement.findMany({
      where: {
        distributorId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 2,
      select: {
        id: true,
        type: true,
        detail: true,
        amount: true,
        createdAt: true,
      },
    });

    // Obtener publicidad activa
    const advertisements = await this.prisma.advertisement.findMany({
      where: { isActive: true },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        imageUrl: true,
      },
    });

    return {
      success: true,
      dashboard: {
        distributor: {
          id: distributor.id,
          firstName: distributor.firstName,
          lastName: distributor.lastName,
          email: distributor.email,
          identification: distributor.identification,
          phone: distributor.phone,
          address: distributor.address,
        },
        balance: distributor.balance,
        totalSignatures,
        monthlySpent: monthlySpent._sum.creditedAmount || 0,
        advertisements,
        recentMovements: recentMovements.map((movement) => ({
          id: movement.id,
          type: movement.type,
          detail: movement.detail,
          amount: movement.amount,
          date: movement.createdAt,
        })),
      },
    };
  }
}
