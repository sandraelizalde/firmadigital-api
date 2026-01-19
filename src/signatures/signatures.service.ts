import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNaturalSignatureDto } from './dto/create-natural-signature.dto';
import { CreateJuridicalSignatureDto } from './dto/create-juridical-signature.dto';
import { SignatureStatus, MovementType } from '@prisma/client';
import { FilesService } from 'src/files/files.service';
import { CreditsService } from 'src/credits/credits.service';
import {
  SignatureListItemDto,
  PaginatedSignatureListResponseDto,
} from './dto/signature-list-response.dto';
import {
  AdminSignatureListItemDto,
  PaginatedAdminSignatureListResponseDto,
} from './dto/admin-signature-list.dto';
import { AdminSignatureFilterDto } from './dto/admin-signature-filter.dto';

/**
 * Interface para la respuesta del proveedor de firmas
 */
interface SignatureProviderResponse {
  codigo: number;
  mensaje: string;
}

@Injectable()
export class SignaturesService {
  private readonly logger = new Logger(SignaturesService.name);
  private readonly signProviderBaseUrlNatural: string | undefined;
  private readonly signProviderBaseUrlJuridica: string | undefined;
  private readonly signProviderUser: string | undefined;
  private readonly signProviderPassword: string | undefined;
  private readonly signProviderAuthUsername: string | undefined;
  private readonly signProviderAuthPassword: string | undefined;
  private readonly signProviderAuthUsernameBiometria: string | undefined;
  private readonly signProviderAuthPasswordBiometria: string | undefined;
  private readonly signProviderCallback: string | undefined;
  private readonly emailVerificationApiUrl: string | undefined;
  private readonly emailVerificationApiKey: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly filesService: FilesService,
    private readonly creditsService: CreditsService,
  ) {
    this.signProviderBaseUrlNatural = this.configService.get<string>(
      'SIGN_PROVIDER_BASE_URL_NATURAL',
    );
    this.signProviderBaseUrlJuridica = this.configService.get<string>(
      'SIGN_PROVIDER_BASE_URL_JURIDICA',
    );
    this.signProviderUser =
      this.configService.get<string>('SIGN_PROVIDER_USER');
    this.signProviderPassword = this.configService.get<string>(
      'SIGN_PROVIDER_PASSWORD',
    );
    this.signProviderAuthUsername = this.configService.get<string>(
      'SIGN_PROVIDER_AUTH_USERNAME',
    );
    this.signProviderAuthPassword = this.configService.get<string>(
      'SIGN_PROVIDER_AUTH_PASSWORD',
    );
    this.signProviderAuthUsernameBiometria = this.configService.get<string>(
      'SIGN_PROVIDER_AUTH_USERNAME_BIOMETRIA',
    );
    this.signProviderAuthPasswordBiometria = this.configService.get<string>(
      'SIGN_PROVIDER_AUTH_PASSWORD_BIOMETRIA',
    );
    this.signProviderCallback = this.configService.get<string>(
      'SIGN_PROVIDER_CALLBACK',
    );
    this.emailVerificationApiUrl = this.configService.get<string>(
      'EMAIL_VERIFICATION_API_URL',
    );
    this.emailVerificationApiKey = this.configService.get<string>(
      'EMAIL_VERIFICATION_API_KEY',
    );
  }

  /**
   * Crea una solicitud de firma digital para persona natural
   * @param distributorId ID del distribuidor que hace la solicitud
   * @param dto Datos de la solicitud de firma
   * @param video_face Video facial opcional (obligatorio si edad >= 80)
   * @returns Solicitud de firma creada
   */
  async createNaturalSignatureRequest(
    distributorId: string,
    dto: CreateNaturalSignatureDto,
    video_face?: Express.Multer.File,
  ) {
    return this.createSignatureRequest(
      distributorId,
      {
        ...dto,
        ruc: dto.ruc || undefined,
        razon_social: undefined,
        rep_legal: undefined,
        cargo: undefined,
        nombramiento: undefined,
      },
      'NATURAL',
      video_face,
    );
  }

  /**
   * Crea una solicitud de firma digital para persona jurídica
   * @param distributorId ID del distribuidor que hace la solicitud
   * @param dto Datos de la solicitud de firma
   * @param video_face Video facial opcional (obligatorio si edad >= 80)
   * @returns Solicitud de firma creada
   */
  async createJuridicalSignatureRequest(
    distributorId: string,
    dto: CreateJuridicalSignatureDto,
    video_face?: Express.Multer.File,
  ) {
    return this.createSignatureRequest(
      distributorId,
      {
        ...dto,
      },
      'JURIDICA',
      video_face,
    );
  }

  /**
   * Crea una solicitud de firma digital (método privado compartido)
   * @param distributorId ID del distribuidor que hace la solicitud
   * @param dto Datos de la solicitud de firma
   * @param type Tipo de firma: NATURAL o JURIDICA
   * @param video_face Video facial opcional (obligatorio si edad >= 80)
   * @returns Solicitud de firma creada
   */
  private async createSignatureRequest(
    distributorId: string,
    dto: any,
    type: 'NATURAL' | 'JURIDICA',
    video_face?: Express.Multer.File,
  ) {
    try {
      // Calcular edad del solicitante
      const birthDate = new Date(dto.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      // Validar que el video sea obligatorio si edad >= 80
      if (age >= 80 && !video_face) {
        throw new BadRequestException(
          'El video facial es obligatorio para personas de 80 años o más',
        );
      }

      // Validar formato de video si se proporciona
      if (video_face) {
        const allowedMimeTypes = [
          'video/mp4',
          'video/quicktime',
          'video/x-msvideo',
          'video/webm',
        ];
        if (!allowedMimeTypes.includes(video_face.mimetype)) {
          throw new BadRequestException(
            'Formato de video no válido. Use: mp4, mov, avi o webm',
          );
        }

        // Validar tamaño (máximo 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (video_face.size > maxSize) {
          throw new BadRequestException('El video no puede superar los 50MB');
        }
      }

      // Verificar que el distribuidor existe y está activo
      const distributor = await this.prisma.distributor.findUnique({
        where: { id: distributorId },
        include: {
          planPrices: {
            where: {
              plan: {
                perfil: dto.perfil_firma,
              },
              isActive: true,
            },
            include: {
              plan: true,
            },
          },
        },
      });

      if (!distributor) {
        throw new BadRequestException('Distribuidor no encontrado');
      }

      if (!distributor.active) {
        throw new BadRequestException('Distribuidor inactivo');
      }

      // Obtener el precio del plan para este distribuidor
      const planPrice = distributor.planPrices[0];
      if (!planPrice) {
        throw new BadRequestException(
          `No se encontró el plan ${dto.perfil_firma} asignado al distribuidor`,
        );
      }

      // Determinar el precio a cobrar (si hay promo, usar promo, sino usar normal)
      const priceToCharge = planPrice.customPricePromo
        ? planPrice.customPricePromo
        : planPrice.customPrice;

      // Verificar si el distribuidor puede emitir firmas (no está bloqueado por crédito)
      const canEmit = await this.creditsService.canEmitSignature(distributorId);
      if (!canEmit) {
        throw new BadRequestException(
          'No puede emitir firmas. Tiene un crédito bloqueado por falta de pago.',
        );
      }

      // Obtener estado del crédito para saber si opera con crédito o balance directo
      const creditStatus =
        await this.creditsService.getCreditStatus(distributorId);
      const hasActiveCredit = creditStatus !== null && !creditStatus.isBlocked;

      // Si NO tiene crédito activo, verificar que tenga balance suficiente
      if (!hasActiveCredit && distributor.balance < priceToCharge) {
        throw new BadRequestException(
          `Balance insuficiente. Se requieren $${(priceToCharge / 100).toFixed(2)} y tiene $${(distributor.balance / 100).toFixed(2)}`,
        );
      }

      const numero_tramite = this.generateNumeroTramite();

      // Determinar la URL del proveedor según el tipo
      const providerUrl =
        type === 'NATURAL'
          ? this.signProviderBaseUrlNatural
          : this.signProviderBaseUrlJuridica;

      // Preparar el payload para el proveedor
      const providerPayload: any = {
        numero_tramite,
        usuario: this.signProviderUser,
        password: this.signProviderPassword,
        perfil_firma: this.cleanPerfilFirma(dto.perfil_firma),
        nombres: dto.nombres.toUpperCase(),
        apellidos: dto.apellidos.toUpperCase(),
        cedula: dto.cedula,
        codigo_dactilar: dto.codigo_dactilar,
        correo: dto.correo,
        provincia: dto.provincia.toUpperCase(),
        ciudad: dto.ciudad.toUpperCase(),
        parroquia: dto.parroquia.toUpperCase(),
        direccion: dto.direccion.toUpperCase(),
        celular: dto.celular,
        ruc: dto.ruc || '',
        clavefirma: dto.clavefirma,
        foto_frontal: dto.foto_frontal,
        foto_posterior: dto.foto_posterior,
        pais: 'ECUADOR',
        tipo_envio: '1',
      };

      // Agregar campos específicos para persona jurídica
      if (type === 'JURIDICA') {
        providerPayload.callback = this.signProviderCallback || '';
        providerPayload.razon_social = dto.razon_social?.toUpperCase() || '';
        providerPayload.rep_legal = dto.rep_legal?.toUpperCase() || '';
        providerPayload.cargo = dto.cargo?.toUpperCase() || '';
        providerPayload.pdfSriBase64 = dto.pdfSriBase64 || '';
        providerPayload.nombramientoBase64 = dto.nombramientoBase64 || '';
      }

      // Llamar al proveedor de firma
      const providerResponse = await this.callSignatureProvider(
        providerPayload,
        providerUrl,
        type,
      );

      // Determinar el estado basado en el código del proveedor
      const isSuccess = providerResponse.codigo === 1;
      const isRejected = providerResponse.codigo === 0;

      let status: SignatureStatus;
      if (isSuccess) {
        status = SignatureStatus.COMPLETED;
      } else if (isRejected) {
        status = SignatureStatus.REJECTED;
      } else {
        status = SignatureStatus.FAILED;
      }
      if (type === 'JURIDICA' && isSuccess) {
        status = SignatureStatus.PENDING;
      }

      // Subir archivos ANTES de la transacción para evitar timeout
      const foto_frontal_key = await this.filesService.uploadFile(
        dto.foto_frontal,
        distributorId.toString(),
        'jpg',
        'fotos-distribuidores',
        'fotos-cedulas',
      );

      const foto_posterior_key = await this.filesService.uploadFile(
        dto.foto_posterior,
        distributorId.toString(),
        'jpg',
        'fotos-distribuidores',
        'fotos-cedulas',
      );

      let pdf_sri_key: string | undefined;
      let nombramiento_key: string | undefined;
      let video_face_key: string | undefined;

      if (dto.pdfSriBase64) {
        pdf_sri_key = await this.filesService.uploadFile(
          dto.pdfSriBase64,
          distributorId.toString(),
          'pdf',
          'pdfs-distribuidores',
          'pdf-sri',
        );
      }

      if (dto.nombramientoBase64) {
        nombramiento_key = await this.filesService.uploadFile(
          dto.nombramientoBase64,
          distributorId.toString(),
          'pdf',
          'pdfs-distribuidores',
          'pdf-nombramiento',
        );
      }

      // Subir video si existe
      if (video_face) {
        const videoExtension = this.getFileExtension(video_face.mimetype);
        video_face_key = await this.filesService.uploadFileFromBuffer(
          video_face.buffer,
          distributorId.toString(),
          videoExtension,
          'fotos-distribuidores',
          'fotos-cedulas',
        );
      }

      const result = await this.prisma.$transaction(async (tx) => {
        let newBalance = distributor.balance;
        let priceCharged = 0;
        let usedCredit = false;

        // Solo cobrar si la solicitud fue exitosa
        if (isSuccess) {
          priceCharged = priceToCharge;

          if (hasActiveCredit) {
            // Tiene crédito activo: registrar en corte (no descuenta balance)
            usedCredit = true;
          } else {
            // NO tiene crédito: descontar del balance
            newBalance = distributor.balance - priceToCharge;
            usedCredit = false;

            // Actualizar el balance del distribuidor
            await tx.distributor.update({
              where: { id: distributorId },
              data: { balance: newBalance },
            });
          }
        }

        // Crear la solicitud de firma (siempre, sin importar el resultado)
        const signatureRequest = await tx.signatureRequest.create({
          data: {
            numero_tramite,
            perfil_firma: dto.perfil_firma,
            nombres: dto.nombres.toUpperCase(),
            apellidos: dto.apellidos.toUpperCase(),
            cedula: dto.cedula,
            correo: dto.correo,
            codigo_dactilar: dto.codigo_dactilar,
            celular: dto.celular,
            provincia: dto.provincia.toUpperCase(),
            ciudad: dto.ciudad.toUpperCase(),
            parroquia: dto.parroquia.toUpperCase(),
            direccion: dto.direccion.toUpperCase(),
            dateOfBirth: new Date(dto.dateOfBirth),
            foto_frontal: foto_frontal_key,
            foto_posterior: foto_posterior_key,
            video_face: video_face_key || null,
            clavefirma: dto.clavefirma,
            ruc: dto.ruc || null,
            razon_social: dto.razon_social?.toUpperCase() || null,
            rep_legal: dto.rep_legal?.toUpperCase() || null,
            cargo: dto.cargo?.toUpperCase() || null,
            nombramiento: nombramiento_key || null,
            pdf_sri: pdf_sri_key || null,
            tipo_envio: '1',
            pais: 'ECUADOR',
            distributorId,
            status,
            providerCode: providerResponse.codigo.toString(),
            providerMessage: providerResponse.mensaje,
          },
        });

        // Si usó crédito, registrar en corte. Si no, crear movimiento de cuenta
        if (isSuccess) {
          if (usedCredit) {
            // El registro en el corte se hace DESPUÉS de esta transacción
            // (ver líneas más abajo, fuera del $transaction)
          } else {
            // Crear movimiento de cuenta (pago directo con balance)
            await tx.accountMovement.create({
              data: {
                distributorId,
                type: MovementType.EXPENSE,
                detail: `Firma digital - Plan ${dto.perfil_firma} - ${dto.apellidos}`,
                amount: priceCharged,
                balanceAfter: newBalance,
                signatureId: signatureRequest.id,
                note: `Trámite: ${numero_tramite} - Cédula: ${dto.cedula}`,
              },
            });
          }
        }

        return {
          signatureRequest,
          newBalance,
          priceCharged,
          usedCredit,
        };
      });

      // Si usó crédito, registrar en el corte (fuera de la transacción anterior)
      if (isSuccess && result.usedCredit) {
        try {
          await this.creditsService.registerSignatureInCredit(
            distributorId,
            priceToCharge,
            result.signatureRequest.id,
          );
        } catch (error) {
          this.logger.error(
            `Error al registrar firma en crédito: ${error.message}`,
          );
        }
      }

      return {
        success: isSuccess,
        message: providerResponse.mensaje,
        data: result.signatureRequest,
        balance: result.newBalance,
        priceCharged: result.priceCharged,
        usedCredit: result.usedCredit,
      };
    } catch (error) {
      this.logger.error(
        `Error al crear solicitud de firma: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof BadRequestException ||
        error.name === 'BadRequestException'
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al procesar la solicitud de firma',
      );
    }
  }

  /**
   * Llama al API del proveedor de firma digital
   * @param payload Datos a enviar al proveedor
   * @param providerUrl URL del proveedor (natural o jurídica)
   * @param type Tipo de firma: NATURAL o JURIDICA
   * @returns Respuesta del proveedor con formato {codigo: number, mensaje: string}
   */
  private async callSignatureProvider(
    payload: any,
    providerUrl: string | undefined,
    type: 'NATURAL' | 'JURIDICA',
  ): Promise<{ codigo: number; mensaje: string }> {
    try {
      if (!providerUrl) {
        throw new Error(
          'URL del proveedor de firma no configurada en variables de entorno',
        );
      }

      // Usar credenciales de biometría para jurídicas, normales para naturales
      const authUsername =
        type === 'JURIDICA'
          ? this.signProviderAuthUsernameBiometria
          : this.signProviderAuthUsername;
      const authPassword =
        type === 'JURIDICA'
          ? this.signProviderAuthPasswordBiometria
          : this.signProviderAuthPassword;

      const basicAuth = Buffer.from(`${authUsername}:${authPassword}`).toString(
        'base64',
      );

      const response = await firstValueFrom(
        this.httpService.post<SignatureProviderResponse>(providerUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${basicAuth}`,
          },
        }),
      );
      // response para testing sin llamar al proveedor
      // const response = {
      //   data: {
      //     codigo: 1,
      //     mensaje: 'SIMULACION Firma creada exitosamente',
      //   },
      // };

      const { codigo, mensaje } = response.data;

      if (typeof codigo === 'undefined' || typeof mensaje === 'undefined') {
        return {
          codigo: 0,
          mensaje: 'Formato de respuesta inválido del proveedor',
        };
      }

      return {
        codigo: Number(codigo),
        mensaje: String(mensaje),
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.data?.codigo !== undefined) {
          const { codigo, mensaje } = error.response.data;

          return {
            codigo: Number(codigo),
            mensaje: String(mensaje || 'Error desconocido del proveedor'),
          };
        }

        // Determinar mensaje de error según el tipo de fallo
        let errorMessage = 'Error de comunicación con el proveedor';
        if (error.code === 'ECONNREFUSED') {
          errorMessage = 'No se pudo conectar con el proveedor de firma';
        } else if (
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNABORTED'
        ) {
          errorMessage = 'Tiempo de espera agotado al contactar al proveedor';
        } else if (error.response?.status) {
          errorMessage = `El proveedor respondió con error HTTP ${error.response.status}`;
        }

        return {
          codigo: 0,
          mensaje: errorMessage,
        };
      }

      this.logger.error(
        `Error inesperado al llamar al proveedor de firma: ${error.message}`,
        error.stack,
      );

      return {
        codigo: 0,
        mensaje: `Error interno: ${error.message}`,
      };
    }
  }

  /**
   * Genera un número de trámite único
   * @returns Número de trámite
   */
  private generateNumeroTramite(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${timestamp}${random}`;
  }

  /**
   * Obtiene las solicitudes de firma de un distribuidor con paginación
   * @param distributorId ID del distribuidor
   * @param page Número de página
   * @param limit Cantidad de resultados por página
   * @returns Lista paginada de solicitudes de firma (sin fotos para rendimiento)
   */
  async getAllSignatureRequests(
    distributorId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedSignatureListResponseDto> {
    const skip = (page - 1) * limit;

    // Obtener el total de registros
    const total = await this.prisma.signatureRequest.count({
      where: { distributorId },
    });

    // Obtener las solicitudes paginadas
    const signatureRequests = await this.prisma.signatureRequest.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const perfilInfo = await this.prisma.plan.findMany({
      where: {
        perfil: { in: signatureRequests.map((sr) => sr.perfil_firma) },
      },
    });

    const planMap = new Map(perfilInfo.map((plan) => [plan.perfil, plan]));

    // Procesar solicitudes y calcular días de expiración
    const data: SignatureListItemDto[] = signatureRequests.map((request) => {
      const plan = planMap.get(request.perfil_firma);
      let expiredDays: number | null = null;

      if (plan && request.status === SignatureStatus.COMPLETED) {
        const updatedDate = new Date(request.updatedAt);
        const durationInDays = this.parseDuration(
          plan.duration,
          plan.durationType,
        );

        if (durationInDays) {
          const expirationDate = new Date(updatedDate);
          expirationDate.setDate(expirationDate.getDate() + durationInDays);

          // Calcular días restantes
          const today = new Date();
          const diffTime = expirationDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          expiredDays = diffDays;
        }
      }

      return {
        id: request.id,
        numero_tramite: request.numero_tramite,
        perfil_firma: request.perfil_firma,
        nombres: request.nombres,
        apellidos: request.apellidos,
        rep_legal: request.rep_legal,
        cedula: request.cedula,
        correo: request.correo,
        celular: request.celular,
        ruc: request.ruc,
        razon_social: request.razon_social,
        status: request.status,
        providerCode: request.providerCode,
        providerMessage: request.providerMessage,
        expiredDays,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      };
    });

    // Calcular información de paginación
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data,
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

  /**
   * Verifica si un email es válido y seguro para enviar
   * @param email Email a verificar
   * @returns Objeto con información de validez o false si hay error
   */
  async verifyEmailBounce(email: string): Promise<boolean | false> {
    try {
      if (!this.emailVerificationApiUrl || !this.emailVerificationApiKey) {
        this.logger.warn(
          'URL o API Key para verificación de email no configurados',
        );
        return false;
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.emailVerificationApiUrl}`, {
          params: {
            email,
            apikey: this.emailVerificationApiKey,
          },
          timeout: 10000, // 10 segundos de timeout
        }),
      );

      const data = response.data;

      // Verificar que la API respondió exitosamente
      if (data.success === 'false' || data.success === false) {
        this.logger.warn(
          `Error de API de verificación de email: ${data.message || 'Sin mensaje'}`,
        );
        return false;
      }

      // Determinar si el email es válido y seguro
      const isValid = data.result === 'valid';
      const safeToSend =
        data.safe_to_send === 'true' || data.safe_to_send === true;
      const disposable = data.disposable === 'true' || data.disposable === true;

      return isValid;
    } catch (error) {
      this.logger.error(
        `Error al verificar rebote de email ${email}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Convierte la duración del plan a días
   * @param duration Duración (número como string)
   * @param durationType Tipo de duración (D, M, MS, Y, YS)
   * @returns Número de días
   */
  private parseDuration(duration: string, durationType: string): number | null {
    const durationValue = parseInt(duration, 10);
    if (isNaN(durationValue)) return null;

    switch (durationType) {
      case 'D': // Días
        return durationValue;
      case 'M': // Meses
        return durationValue * 30;
      case 'MS': // Meses (plural)
        return durationValue * 30;
      case 'Y': // Año
        return durationValue * 365;
      case 'YS': // Años (plural)
        return durationValue * 365;
      default:
        return null;
    }
  }

  /**
   * Obtiene una solicitud de firma específica
   * @param id ID de la solicitud
   * @param distributorId ID del distribuidor (para verificar permisos)
   * @returns Solicitud de firma con fotos en Base64, fecha de expiración y duración
   */
  async getSignatureRequest(id: string, distributorId: string) {
    const signatureRequest = await this.prisma.signatureRequest.findFirst({
      where: {
        id,
        distributorId,
      },
    });

    if (!signatureRequest) {
      throw new BadRequestException('Solicitud de firma no encontrada');
    }

    // Buscar el plan del distribuidor con el perfil de la firma
    const distributorPlan = await this.prisma.distributorPlanPrice.findFirst({
      where: {
        distributorId,
        isActive: true,
        plan: {
          perfil: signatureRequest.perfil_firma,
          isActive: true,
        },
      },
      include: {
        plan: true,
      },
    });

    // Calcular fecha de expiración y duración si el plan existe y la firma está completada
    let expirationDate: Date | null = null;
    let duration: string | null = null;
    let durationType: string | null = null;

    if (
      distributorPlan &&
      signatureRequest.status === SignatureStatus.COMPLETED
    ) {
      const plan = distributorPlan.plan;
      duration = plan.duration;
      durationType = plan.durationType;

      // Calcular fecha de expiración basada en updatedAt
      const updatedDate = new Date(signatureRequest.updatedAt);
      const durationInDays = this.parseDuration(
        plan.duration,
        plan.durationType,
      );

      if (durationInDays) {
        expirationDate = new Date(updatedDate);
        expirationDate.setDate(expirationDate.getDate() + durationInDays);
      }
    }

    // Convertir las fotos de S3 a Base64
    try {
      const [foto_frontal_url, foto_posterior_url] = await Promise.all([
        this.filesService.getFileUrl(
          signatureRequest.foto_frontal,
          'fotos-cedulas',
        ),
        this.filesService.getFileUrl(
          signatureRequest.foto_posterior,
          'fotos-cedulas',
        ),
        Promise.resolve(null),
      ]);

      let video_face_url;

      if (signatureRequest.video_face) {
        video_face_url = await this.filesService.getFileUrl(
          signatureRequest.video_face,
          'fotos-cedulas',
        );
      }

      let pdf_sri_url;
      let nombramiento_url;

      if (signatureRequest.pdf_sri || signatureRequest.nombramiento) {
        pdf_sri_url = signatureRequest.pdf_sri
          ? await this.filesService.getFileUrl(
              signatureRequest.pdf_sri,
              'pdf-sri',
            )
          : null;

        nombramiento_url = signatureRequest.nombramiento
          ? await this.filesService.getFileUrl(
              signatureRequest.nombramiento,
              'pdf-nombramiento',
            )
          : null;
      }

      return {
        id: signatureRequest.id,
        numero_tramite: signatureRequest.numero_tramite,
        perfil_firma: signatureRequest.perfil_firma,
        nombres: signatureRequest.nombres,
        apellidos: signatureRequest.apellidos,
        cedula: signatureRequest.cedula,
        correo: signatureRequest.correo,
        codigo_dactilar: signatureRequest.codigo_dactilar,
        celular: signatureRequest.celular,
        provincia: signatureRequest.provincia,
        ciudad: signatureRequest.ciudad,
        parroquia: signatureRequest.parroquia,
        direccion: signatureRequest.direccion,
        dateOfBirth: signatureRequest.dateOfBirth,
        foto_frontal_url,
        foto_posterior_url,
        video_face_url,
        pdf_sri_url,
        nombramiento_url,
        razon_social: signatureRequest.razon_social,
        rep_legal: signatureRequest.rep_legal,
        cargo: signatureRequest.cargo,
        pais: signatureRequest.pais,
        clavefirma: signatureRequest.clavefirma,
        ruc: signatureRequest.ruc,
        tipo_envio: signatureRequest.tipo_envio,
        status: signatureRequest.status,
        providerCode: signatureRequest.providerCode,
        providerMessage: signatureRequest.providerMessage,
        annulledNote: signatureRequest.annulledNote,
        activeNotification: signatureRequest.activeNotification,
        expirationDate,
        duration,
        durationType,
        createdAt: signatureRequest.createdAt,
        updatedAt: signatureRequest.updatedAt,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener fotos de S3 para solicitud ${id}: ${error.message}`,
      );
      throw new BadRequestException(
        'Error al obtener las imágenes de la solicitud',
      );
    }
  }

  private cleanPerfilFirma(perfil: string): string {
    //Limpiar PN- y PJ- al inicio del perfil
    if (perfil.startsWith('PN-') || perfil.startsWith('PJ-')) {
      return perfil.slice(3);
    }
    return perfil;
  }

  // ========================
  // MÉTODOS PARA ADMINISTRADOR
  // ========================

  /**
   * Obtiene todas las solicitudes de firma para el administrador con paginación y filtros
   * @param filterDto Filtros y paginación
   * @returns Lista paginada de solicitudes de firma con información del distribuidor
   */
  async getAllSignatureRequestsAdmin(
    filterDto: AdminSignatureFilterDto,
  ): Promise<PaginatedAdminSignatureListResponseDto> {
    const {
      page = 1,
      limit = 10,
      distributorId,
      status,
      identification,
      distributorIdentification,
      startDate,
      endDate,
    } = filterDto;
    const skip = (page - 1) * limit;

    // Construir condiciones de filtrado
    const where: any = {};

    if (distributorId) {
      where.distributorId = distributorId;
    }

    if (status) {
      where.status = status;
    }

    // Buscar por identificación: si tiene RUC busca en ruc, sino en cédula
    if (identification) {
      where.OR = [
        { ruc: { contains: identification, mode: 'insensitive' } },
        { cedula: { contains: identification, mode: 'insensitive' } },
      ];
    }

    if (distributorIdentification) {
      where.distributor = {
        identification: {
          contains: distributorIdentification,
          mode: 'insensitive',
        },
      };
    }

    console.log({ startDate, endDate });

    // Filtro por rango de fechas
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const startDateTime = new Date(startDate + 'T00:00:00');
        where.createdAt.gte = startDateTime;
      }
      if (endDate) {
        const endDateTime = new Date(endDate + 'T23:59:59.999');
        where.createdAt.lte = endDateTime;
      }
    }

    // Obtener el total de registros
    const total = await this.prisma.signatureRequest.count({ where });

    // Obtener las solicitudes paginadas con información del distribuidor
    const signatureRequests = await this.prisma.signatureRequest.findMany({
      where,
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
            identification: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const perfilInfo = await this.prisma.plan.findMany({
      where: {
        perfil: { in: signatureRequests.map((sr) => sr.perfil_firma) },
      },
    });

    const planMap = new Map(perfilInfo.map((plan) => [plan.perfil, plan]));

    // Procesar solicitudes y calcular días de expiración
    const data: AdminSignatureListItemDto[] = signatureRequests.map(
      (request) => {
        const plan = planMap.get(request.perfil_firma);
        let expiredDays: number | null = null;
        let duration: string | null = null;
        let durationType: string | null = null;

        if (plan && request.status === SignatureStatus.COMPLETED) {
          duration = plan.duration;
          durationType = plan.durationType;

          const updatedDate = new Date(request.updatedAt);
          const durationInDays = this.parseDuration(
            plan.duration,
            plan.durationType,
          );

          if (durationInDays) {
            const expirationDate = new Date(updatedDate);
            expirationDate.setDate(expirationDate.getDate() + durationInDays);

            const today = new Date();
            const diffTime = expirationDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            expiredDays = diffDays;
          }
        }

        return {
          id: request.id,
          numero_tramite: request.numero_tramite,
          perfil_firma: request.perfil_firma,
          nombres: request.nombres,
          apellidos: request.apellidos,
          rep_legal: request.rep_legal,
          cedula: request.cedula,
          correo: request.correo,
          celular: request.celular,
          ruc: request.ruc,
          razon_social: request.razon_social,
          status: request.status,
          providerCode: request.providerCode,
          providerMessage: request.providerMessage,
          annulledBy: request.annulledBy,
          annulledNote: request.annulledNote,
          expiredDays,
          duration,
          durationType,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
          distributor: request.distributor
            ? {
                id: request.distributor.id,
                firstName: request.distributor.firstName,
                lastName: request.distributor.lastName,
                socialReason: request.distributor.socialReason,
                identification: request.distributor.identification,
                email: request.distributor.email,
                phone: request.distributor.phone,
              }
            : null,
        };
      },
    );

    // Calcular información de paginación
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data,
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

  /**
   * Obtiene una solicitud de firma específica para el administrador (sin restricción de distribuidor)
   * @param id ID de la solicitud
   * @returns Solicitud de firma con fotos en Base64, fecha de expiración, duración e info del distribuidor
   */
  async getSignatureRequestAdmin(id: string) {
    const signatureRequest = await this.prisma.signatureRequest.findFirst({
      where: { id },
      include: {
        distributor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            socialReason: true,
            identification: true,
            identificationType: true,
            email: true,
            phone: true,
            address: true,
            balance: true,
          },
        },
      },
    });

    if (!signatureRequest) {
      throw new BadRequestException('Solicitud de firma no encontrada');
    }

    // Buscar el plan para calcular duración
    const plan = await this.prisma.plan.findFirst({
      where: {
        perfil: signatureRequest.perfil_firma,
        isActive: true,
      },
    });

    // Calcular fecha de expiración y duración si el plan existe y la firma está completada
    let expirationDate: Date | null = null;
    let duration: string | null = null;
    let durationType: string | null = null;

    if (plan && signatureRequest.status === SignatureStatus.COMPLETED) {
      duration = plan.duration;
      durationType = plan.durationType;

      const updatedDate = new Date(signatureRequest.updatedAt);
      const durationInDays = this.parseDuration(
        plan.duration,
        plan.durationType,
      );

      if (durationInDays) {
        expirationDate = new Date(updatedDate);
        expirationDate.setDate(expirationDate.getDate() + durationInDays);
      }
    }

    // Convertir las fotos de S3 a URLs
    try {
      const [foto_frontal_url, foto_posterior_url] = await Promise.all([
        this.filesService.getFileUrl(
          signatureRequest.foto_frontal,
          'fotos-cedulas',
        ),
        this.filesService.getFileUrl(
          signatureRequest.foto_posterior,
          'fotos-cedulas',
        ),
      ]);

      let pdf_sri_url: string | null = null;
      let nombramiento_url: string | null = null;

      if (signatureRequest.pdf_sri) {
        pdf_sri_url = await this.filesService.getFileUrl(
          signatureRequest.pdf_sri,
          'pdf-sri',
        );
      }

      if (signatureRequest.nombramiento) {
        nombramiento_url = await this.filesService.getFileUrl(
          signatureRequest.nombramiento,
          'pdf-nombramiento',
        );
      }

      return {
        id: signatureRequest.id,
        numero_tramite: signatureRequest.numero_tramite,
        perfil_firma: signatureRequest.perfil_firma,
        nombres: signatureRequest.nombres,
        apellidos: signatureRequest.apellidos,
        cedula: signatureRequest.cedula,
        correo: signatureRequest.correo,
        codigo_dactilar: signatureRequest.codigo_dactilar,
        celular: signatureRequest.celular,
        provincia: signatureRequest.provincia,
        ciudad: signatureRequest.ciudad,
        parroquia: signatureRequest.parroquia,
        direccion: signatureRequest.direccion,
        dateOfBirth: signatureRequest.dateOfBirth,
        foto_frontal_url,
        foto_posterior_url,
        video_face: signatureRequest.video_face,
        pdf_sri_url,
        nombramiento_url,
        razon_social: signatureRequest.razon_social,
        rep_legal: signatureRequest.rep_legal,
        cargo: signatureRequest.cargo,
        pais: signatureRequest.pais,
        clavefirma: signatureRequest.clavefirma,
        ruc: signatureRequest.ruc,
        tipo_envio: signatureRequest.tipo_envio,
        status: signatureRequest.status,
        providerCode: signatureRequest.providerCode,
        providerMessage: signatureRequest.providerMessage,
        annulledBy: signatureRequest.annulledBy,
        annulledNote: signatureRequest.annulledNote,
        activeNotification: signatureRequest.activeNotification,
        expirationDate,
        duration,
        durationType,
        createdAt: signatureRequest.createdAt,
        updatedAt: signatureRequest.updatedAt,
        distributor: signatureRequest.distributor,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener fotos de S3 para solicitud ${id}: ${error.message}`,
      );
      throw new BadRequestException(
        'Error al obtener las imágenes de la solicitud',
      );
    }
  }

  /**
   * Anula una solicitud de firma y reembolsa el dinero al distribuidor
   * @param signatureId ID de la solicitud de firma
   * @param adminId ID del administrador que realiza la anulación
   * @param note Nota opcional con el motivo de la anulación
   * @returns Resultado de la anulación con información del reembolso
   */
  async annulSignatureRequest(
    signatureId: string,
    adminId: string,
    adminName: string,
    generateRefund: boolean,
    note?: string,
  ) {
    // Buscar la solicitud de firma
    const signatureRequest = await this.prisma.signatureRequest.findUnique({
      where: { id: signatureId },
      include: {
        distributor: true,
      },
    });

    if (!signatureRequest) {
      throw new BadRequestException('Solicitud de firma no encontrada');
    }

    if (!signatureRequest.distributorId || !signatureRequest.distributor) {
      throw new BadRequestException(
        'La solicitud de firma no tiene un distribuidor asociado',
      );
    }

    // Verificar que la firma no esté ya anulada
    if (signatureRequest.status === SignatureStatus.ANNULLED) {
      throw new BadRequestException('La solicitud de firma ya está anulada');
    }

    // // Verificar que la firma esté en estado COMPLETED o PENDING para poder anular
    // if (
    //   signatureRequest.status !== SignatureStatus.COMPLETED &&
    //   signatureRequest.status !== SignatureStatus.PENDING
    // ) {
    //   throw new BadRequestException(
    //     `No se puede anular una firma en estado ${signatureRequest.status}. Solo se pueden anular firmas COMPLETED o PENDING`,
    //   );
    // }

    // Buscar el precio que se cobró al distribuidor por esta firma
    const originalMovement = await this.prisma.accountMovement.findFirst({
      where: {
        signatureId: signatureRequest.id,
        type: MovementType.EXPENSE,
      },
    });

    // Si no hay movimiento de cobro, significa que no se cobró (ej: fue rechazada)
    const refundAmount = originalMovement ? originalMovement.amount : 0;

    // Ejecutar la anulación en una transacción
    const result = await this.prisma.$transaction(async (tx) => {
      let newBalance = signatureRequest.distributor!.balance;

      // Actualizar el estado de la firma a ANNULLED
      await tx.signatureRequest.update({
        where: { id: signatureId },
        data: {
          status: SignatureStatus.ANNULLED,
          annulledBy: adminName,
          annulledNote: note || 'Anulada por administrador',
        },
      });

      // Si hay monto a reembolsar Y se debe generar el reembolso, actualizar balance y crear movimiento
      let movement: { id: string } | null = null;
      let actualRefundAmount = 0;

      if (generateRefund && refundAmount > 0) {
        newBalance = signatureRequest.distributor!.balance + refundAmount;
        actualRefundAmount = refundAmount;

        // Actualizar el balance del distribuidor
        await tx.distributor.update({
          where: { id: signatureRequest.distributorId! },
          data: { balance: newBalance },
        });

        // Crear el movimiento de reembolso (INCOME)
        movement = await tx.accountMovement.create({
          data: {
            distributorId: signatureRequest.distributorId!,
            type: MovementType.INCOME,
            detail: `Reembolso por anulación de firma - ${signatureRequest.apellidos}`,
            amount: refundAmount,
            balanceAfter: newBalance,
            signatureId: signatureRequest.id,
            adminName: adminName,
            note: note || `Anulación de firma`,
          },
        });
      }

      return {
        signatureId,
        distributorId: signatureRequest.distributorId,
        refundedAmount: actualRefundAmount,
        newDistributorBalance: newBalance,
        movementId: movement?.id || null,
      };
    });

    return {
      success: true,
      message:
        generateRefund && result.refundedAmount > 0
          ? `Firma anulada exitosamente y se reembolsaron $${(result.refundedAmount / 100).toFixed(2)} al distribuidor`
          : 'Firma anulada exitosamente sin reembolso',
      data: result,
    };
  }

  /**
   * Aprueba una solicitud de firma jurídica (cambia estado de PENDING a COMPLETED)
   * @param signatureId ID de la solicitud de firma
   * @param adminId ID del administrador que realiza la aprobación
   * @param note Nota opcional sobre la aprobación
   * @returns Resultado de la aprobación
   */
  async approveJuridicalSignature(
    signatureId: string,
    adminName: string,
    note?: string,
  ) {
    // Buscar la solicitud de firma
    const signatureRequest = await this.prisma.signatureRequest.findUnique({
      where: { id: signatureId },
    });

    if (!signatureRequest) {
      throw new BadRequestException('Solicitud de firma no encontrada');
    }

    // Verificar que sea una firma jurídica (tipo_envio '1' con campos de jurídica o perfil PJ-)
    const isJuridica =
      signatureRequest.razon_social !== null ||
      signatureRequest.rep_legal !== null ||
      signatureRequest.perfil_firma.startsWith('PJ-');

    if (!isJuridica) {
      throw new BadRequestException(
        'Solo se pueden aprobar solicitudes de firma jurídica',
      );
    }

    // Verificar que la firma esté en estado PENDING
    if (signatureRequest.status !== SignatureStatus.PENDING) {
      throw new BadRequestException(
        `Solo se pueden aprobar firmas en estado PENDING. Estado actual: ${signatureRequest.status}`,
      );
    }

    const previousStatus = signatureRequest.status;

    // Actualizar el estado de la firma a COMPLETED
    await this.prisma.signatureRequest.update({
      where: { id: signatureId },
      data: {
        status: SignatureStatus.COMPLETED,
        providerMessage:
          note + ' ' + adminName
            ? `Aprobada por ${adminName}: ${note}`
            : 'Aprobada por administrador',
      },
    });

    return {
      success: true,
      message: 'Firma jurídica aprobada exitosamente',
      data: {
        signatureId,
        previousStatus,
        newStatus: SignatureStatus.COMPLETED,
      },
    };
  }

  /**
   * Obtiene la extensión del archivo basado en el mimetype
   * @param mimetype MIME type del archivo
   * @returns Extensión del archivo
   */
  private getFileExtension(mimetype: string): string {
    const mimeToExt: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'video/webm': 'webm',
    };

    return mimeToExt[mimetype] || 'mp4';
  }
}
