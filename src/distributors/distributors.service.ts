import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBillingInfoDto } from './dto/create-billing-info.dto';
import { UpdateBillingInfoDto } from './dto/update-billing-info.dto';
import { SignatureStatus, TypeClient } from '@prisma/client';
import { FilesService } from 'src/files/files.service';
import { UploadContractDto } from './dto/upload-contract.dto';
import { AuthService } from 'src/auth/auth.service';
import { MailService } from 'src/mail/mail.service';
import { CreditsService } from 'src/credits/credits.service';
import { WhatsappService } from '../notifications/whatsapp.service';

@Injectable()
export class DistributorsService {
  private readonly logger = new Logger(DistributorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
    private readonly creditsService: CreditsService,
    private readonly whatsappService: WhatsappService,
  ) { }

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
          where: {
            isActive: true,
            plan: {
              eligibleClientsType: {
                has: TypeClient.PERSONA_JURIDICA,
              },
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
          distributor.identification,
          decryptedPassword,
        );


      } catch (emailError) {
        // Si falla el envío del email, registrar el error pero no fallar la operación
        this.logger.error('Error al enviar email de bienvenida:', emailError);
      }

      // Enviar WhatsApp de bienvenida
      try {
        await this.whatsappService.sendTemplate(
          distributor.phone,
          'welcome_distributor',
          [distributor.firstName || distributorName],
          'es_EC',
        );
      } catch (whatsappError) {
        this.logger.error(
          `Error enviando WhatsApp de bienvenida: ${whatsappError.message}`,
        );
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

  // Listar todos los distribuidores con paginación y filtros
  async getAllDistributors(filterDto: {
    page?: number;
    limit?: number;
    identification?: string;
    name?: string;
  }) {
    const { page = 1, limit = 10, identification, name } = filterDto;
    const skip = (page - 1) * limit;

    // Construir condiciones de filtrado
    const where: any = {};

    if (identification) {
      where.identification = {
        contains: identification,
        mode: 'insensitive',
      };
    }

    if (name) {
      const nameParts = name.trim().split(/\s+/);

      where.AND = nameParts.map((part) => ({
        OR: [
          { firstName: { contains: part, mode: 'insensitive' } },
          { lastName: { contains: part, mode: 'insensitive' } },
          { socialReason: { contains: part, mode: 'insensitive' } },
        ],
      }));
    }

    // Obtener el total de distribuidores con los filtros aplicados
    const total = await this.prisma.distributor.count({ where });

    // Obtener distribuidores paginados con filtros
    const distributors = await this.prisma.distributor.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        distributorCredits: {
          where: {
            isActive: true,
          },
        },
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

    // Obtener información resumida del crédito para el dashboard
    const creditSummary =
      await this.creditsService.getCreditSummary(distributorId);

    let creditInfo: {
      title: string;
      amount: number;
      date: Date | null;
      canEmit: boolean;
    } | null = null;

    if (creditSummary.hasCredit) {
      // Si está bloqueado, mostrar deuda total
      if (creditSummary.isBlocked) {
        creditInfo = {
          title: 'Crédito Vencido',
          amount: creditSummary.totalOwed,
          date:
            creditSummary.unpaidCutoffs &&
              creditSummary.unpaidCutoffs.length > 0
              ? creditSummary.unpaidCutoffs[0].paymentDueDate
              : null,
          canEmit: false,
        };
      } else {
        const nextUnpaidCutoff = creditSummary.unpaidCutoffs?.find(
          (c) => !c.isOverdue,
        );

        if (nextUnpaidCutoff) {
          const amountOwed =
            nextUnpaidCutoff.amountUsed - nextUnpaidCutoff.amountPaid;
          creditInfo = {
            title: 'Próximo Corte',
            amount: amountOwed,
            date: nextUnpaidCutoff.paymentDueDate,
            canEmit: true,
          };
        } else if (
          creditSummary.unpaidCutoffs &&
          creditSummary.unpaidCutoffs.length === 0
        ) {
          // No tiene deudas pendientes
          creditInfo = {
            title: 'Crédito Activo',
            amount: 0,
            date: null,
            canEmit: true,
          };
        }
      }
    }

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
        credit: creditInfo,
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

  /**
   * Elimina un distribuidor y todos sus datos relacionados
   * @param distributorId ID del distribuidor a eliminar
   * @returns Resultado de la eliminación
   */
  async deleteDistributor(distributorId: string) {
    // Verificar que el distribuidor existe
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      include: {
        signatureRequests: {
          select: {
            id: true,
            foto_frontal: true,
            foto_posterior: true,
            pdf_sri: true,
            nombramiento: true,
          },
        },
        recargas: {
          select: {
            id: true,
            receiptFile: true,
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

    // Eliminar archivos del bucket S3
    const deletedFiles: string[] = [];
    const failedFiles: string[] = [];

    // 1. Eliminar contrato del distribuidor
    if (distributor.contractSignedUrl) {
      try {
        await this.filesService.deleteFile(
          distributor.contractSignedUrl,
          'contratos-distribuidores',
        );
        deletedFiles.push(`contrato: ${distributor.contractSignedUrl}`);
      } catch (error) {
        this.logger.warn(
          `No se pudo eliminar contrato: ${distributor.contractSignedUrl}`,
        );
        failedFiles.push(`contrato: ${distributor.contractSignedUrl}`);
      }
    }

    // 2. Eliminar fotos de identificación del distribuidor
    if (distributor.identificationFrontUrl) {
      try {
        await this.filesService.deleteFile(
          distributor.identificationFrontUrl,
          'fotos-cedulas',
        );
        deletedFiles.push(
          `foto frontal: ${distributor.identificationFrontUrl}`,
        );
      } catch (error) {
        this.logger.warn(
          `No se pudo eliminar foto frontal: ${distributor.identificationFrontUrl}`,
        );
        failedFiles.push(`foto frontal: ${distributor.identificationFrontUrl}`);
      }
    }

    if (distributor.identificationBackUrl) {
      try {
        await this.filesService.deleteFile(
          distributor.identificationBackUrl,
          'fotos-cedulas',
        );
        deletedFiles.push(
          `foto posterior: ${distributor.identificationBackUrl}`,
        );
      } catch (error) {
        this.logger.warn(
          `No se pudo eliminar foto posterior: ${distributor.identificationBackUrl}`,
        );
        failedFiles.push(
          `foto posterior: ${distributor.identificationBackUrl}`,
        );
      }
    }

    // 3. Eliminar archivos de las solicitudes de firma
    for (const signature of distributor.signatureRequests) {
      // Foto frontal de la firma
      if (signature.foto_frontal) {
        try {
          await this.filesService.deleteFile(
            signature.foto_frontal,
            'fotos-cedulas',
          );
          deletedFiles.push(`firma foto frontal: ${signature.foto_frontal}`);
        } catch (error) {
          this.logger.warn(
            `No se pudo eliminar foto frontal de firma: ${signature.foto_frontal}`,
          );
          failedFiles.push(`firma foto frontal: ${signature.foto_frontal}`);
        }
      }

      // Foto posterior de la firma
      if (signature.foto_posterior) {
        try {
          await this.filesService.deleteFile(
            signature.foto_posterior,
            'fotos-cedulas',
          );
          deletedFiles.push(
            `firma foto posterior: ${signature.foto_posterior}`,
          );
        } catch (error) {
          this.logger.warn(
            `No se pudo eliminar foto posterior de firma: ${signature.foto_posterior}`,
          );
          failedFiles.push(`firma foto posterior: ${signature.foto_posterior}`);
        }
      }

      // PDF SRI
      if (signature.pdf_sri) {
        try {
          await this.filesService.deleteFile(signature.pdf_sri, 'pdf-sri');
          deletedFiles.push(`firma pdf sri: ${signature.pdf_sri}`);
        } catch (error) {
          this.logger.warn(
            `No se pudo eliminar pdf sri de firma: ${signature.pdf_sri}`,
          );
          failedFiles.push(`firma pdf sri: ${signature.pdf_sri}`);
        }
      }

      // Nombramiento
      if (signature.nombramiento) {
        try {
          await this.filesService.deleteFile(
            signature.nombramiento,
            'pdf-nombramiento',
          );
          deletedFiles.push(`firma nombramiento: ${signature.nombramiento}`);
        } catch (error) {
          this.logger.warn(
            `No se pudo eliminar nombramiento de firma: ${signature.nombramiento}`,
          );
          failedFiles.push(`firma nombramiento: ${signature.nombramiento}`);
        }
      }
    }

    // 4. Eliminar vouchers de recargas
    for (const recharge of distributor.recargas) {
      if (recharge.receiptFile) {
        try {
          await this.filesService.deleteFile(
            recharge.receiptFile,
            'vouchers-recargas',
          );
          deletedFiles.push(`voucher recarga: ${recharge.receiptFile}`);
        } catch (error) {
          this.logger.warn(
            `No se pudo eliminar voucher de recarga: ${recharge.receiptFile}`,
          );
          failedFiles.push(`voucher recarga: ${recharge.receiptFile}`);
        }
      }
    }

    // Eliminar registros de la base de datos en una transacción
    await this.prisma.$transaction(async (tx) => {
      // Eliminar movimientos de cuenta (primero por las FK)
      await tx.accountMovement.deleteMany({
        where: { distributorId },
      });

      // Eliminar recargas
      await tx.recharge.deleteMany({
        where: { distributorId },
      });

      // Eliminar solicitudes de firma
      await tx.signatureRequest.deleteMany({
        where: { distributorId },
      });

      // Eliminar precios de planes (aunque tiene onDelete: Cascade, lo hacemos explícito)
      await tx.distributorPlanPrice.deleteMany({
        where: { distributorId },
      });

      // Eliminar información de facturación
      await tx.billingInfo.deleteMany({
        where: { distributorId },
      });

      // Finalmente eliminar el distribuidor
      await tx.distributor.delete({
        where: { id: distributorId },
      });
    });

    this.logger.log(
      `Distribuidor ${distributorId} eliminado exitosamente. Archivos eliminados: ${deletedFiles.length}, fallidos: ${failedFiles.length}`,
    );

    return {
      success: true,
      message: 'Distribuidor eliminado exitosamente',
      data: {
        distributorId,
        deletedFilesCount: deletedFiles.length,
        failedFilesCount: failedFiles.length,
        deletedSignatures: distributor.signatureRequests.length,
        deletedRecharges: distributor.recargas.length,
        failedFiles: failedFiles.length > 0 ? failedFiles : undefined,
      },
    };
  }

  /**
   * Obtener distribuidores que tienen asignado un plan específico por duration y durationType
   * @param duration Duración del plan
   * @param durationType Tipo de duración del plan
   * @returns Lista de distribuidores con sus precios personalizados
   */
  async getDistributorsByPlan(duration: string, durationType: string) {
    // Buscar todos los planes que coincidan con duration y durationType
    const plans = await this.prisma.plan.findMany({
      where: {
        duration,
        durationType,
        isActive: true,
      },
    });

    if (plans.length === 0) {
      return {
        success: true,
        distributors: [],
        message: `No se encontraron planes con duración ${duration} ${durationType}`,
      };
    }

    const planIds = plans.map((p) => p.id);

    // Obtener todos los distribuidores que tienen asignados estos planes
    const assignments = await this.prisma.distributorPlanPrice.findMany({
      where: {
        planId: { in: planIds },
        isActive: true,
        distributor: {
          active: true,
        },
      },
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
            balance: true,
          },
        },
        plan: {
          select: {
            id: true,
            perfil: true,
            eligibleClientsType: true,
          },
        },
      },
      orderBy: [
        {
          distributor: {
            firstName: 'asc',
          },
        },
        {
          distributor: {
            lastName: 'asc',
          },
        },
      ],
    });

    // Agrupar por distribuidor
    const distributorMap = new Map<
      string,
      {
        distributor: any;
        plans: Array<{
          planId: string;
          perfil: string;
          eligibleClientsType: any[];
          customPrice: number;
          customPricePromo: number | null;
        }>;
      }
    >();

    assignments.forEach((assignment) => {
      const distId = assignment.distributor.id;

      if (!distributorMap.has(distId)) {
        distributorMap.set(distId, {
          distributor: assignment.distributor,
          plans: [],
        });
      }

      distributorMap.get(distId)!.plans.push({
        planId: assignment.plan.id,
        perfil: assignment.plan.perfil,
        eligibleClientsType: assignment.plan.eligibleClientsType,
        customPrice: assignment.customPrice,
        customPricePromo: assignment.customPricePromo,
      });
    });

    // Convertir Map a array
    const distributors = Array.from(distributorMap.values()).map((entry) => ({
      ...entry.distributor,
      plans: entry.plans,
    }));

    return {
      success: true,
      distributors,
      total: distributors.length,
      duration,
      durationType,
    };
  }
}
