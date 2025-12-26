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
  private readonly signProviderCallback: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
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
    this.signProviderCallback = this.configService.get<string>(
      'SIGN_PROVIDER_CALLBACK',
    );
  }

  /**
   * Crea una solicitud de firma digital para persona natural
   * @param distributorId ID del distribuidor que hace la solicitud
   * @param dto Datos de la solicitud de firma
   * @returns Solicitud de firma creada
   */
  async createNaturalSignatureRequest(
    distributorId: string,
    dto: CreateNaturalSignatureDto,
  ) {
    return this.createSignatureRequest(
      distributorId,
      {
        ...dto,
        ruc: undefined,
        razon_social: undefined,
        rep_legal: undefined,
        cargo: undefined,
        nombramiento: undefined,
      },
      'NATURAL',
    );
  }

  /**
   * Crea una solicitud de firma digital para persona jurídica
   * @param distributorId ID del distribuidor que hace la solicitud
   * @param dto Datos de la solicitud de firma
   * @returns Solicitud de firma creada
   */
  async createJuridicalSignatureRequest(
    distributorId: string,
    dto: CreateJuridicalSignatureDto,
  ) {
    return this.createSignatureRequest(
      distributorId,
      {
        ...dto,
      },
      'JURIDICA',
    );
  }

  /**
   * Crea una solicitud de firma digital (método privado compartido)
   * @param distributorId ID del distribuidor que hace la solicitud
   * @param dto Datos de la solicitud de firma
   * @param type Tipo de firma: NATURAL o JURIDICA
   * @returns Solicitud de firma creada
   */
  private async createSignatureRequest(
    distributorId: string,
    dto: any,
    type: 'NATURAL' | 'JURIDICA',
  ) {
    try {
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
      const priceToCharge =
        planPrice.plan.isPromo && planPrice.customPricePromo
          ? planPrice.customPricePromo
          : planPrice.customPrice;

      // Verificar que el distribuidor tenga balance suficiente
      if (distributor.balance < priceToCharge) {
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
        perfil_firma: dto.perfil_firma,
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

      // Procesar la solicitud en una transacción
      const result = await this.prisma.$transaction(async (tx) => {
        let newBalance = distributor.balance;
        let priceCharged = 0;

        // Solo cobrar si la solicitud fue exitosa
        if (isSuccess) {
          newBalance = distributor.balance - priceToCharge;
          priceCharged = priceToCharge;

          // Actualizar el balance del distribuidor
          await tx.distributor.update({
            where: { id: distributorId },
            data: { balance: newBalance },
          });
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
            foto_frontal: dto.foto_frontal,
            foto_posterior: dto.foto_posterior,
            clavefirma: dto.clavefirma,
            ruc: dto.ruc || null,
            razon_social: dto.razon_social?.toUpperCase() || null,
            rep_legal: dto.rep_legal?.toUpperCase() || null,
            cargo: dto.cargo?.toUpperCase() || null,
            nombramiento: dto.nombramientoBase64 || null,
            pdf_sri: dto.pdfSriBase64 || null,
            tipo_envio: '1',
            pais: 'ECUADOR',
            distributorId,
            status,
            providerCode: providerResponse.codigo.toString(),
            providerMessage: providerResponse.mensaje,
          },
        });

        // Crear el movimiento de cuenta solo si fue exitoso
        if (isSuccess) {
          await tx.accountMovement.create({
            data: {
              distributorId,
              type: MovementType.EXPENSE,
              detail: `Firma digital - Plan ${dto.perfil_firma} - ${dto.nombres} ${dto.apellidos}`,
              amount: priceCharged,
              balanceAfter: newBalance,
              signatureId: signatureRequest.id,
              note: `Trámite: ${numero_tramite} - Cédula: ${dto.cedula}`,
            },
          });
        }

        return {
          signatureRequest,
          newBalance,
          priceCharged,
        };
      });

      return {
        success: isSuccess,
        message: providerResponse.mensaje,
        data: result.signatureRequest,
        balance: result.newBalance,
        priceCharged: result.priceCharged,
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
   * @returns Respuesta del proveedor con formato {codigo: number, mensaje: string}
   */
  private async callSignatureProvider(
    payload: any,
    providerUrl: string | undefined,
  ): Promise<{ codigo: number; mensaje: string }> {
    try {
      if (!providerUrl) {
        throw new Error(
          'URL del proveedor de firma no configurada en variables de entorno',
        );
      }

      const basicAuth = Buffer.from(
        `${this.signProviderAuthUsername}:${this.signProviderAuthPassword}`,
      ).toString('base64');

      this.logger.log(
        `Llamando al proveedor de firma para trámite: ${payload.numero_tramite}`,
      );
      this.logger.debug(`Payload: ${JSON.stringify(payload)}`);

      const response = await firstValueFrom(
        this.httpService.post<SignatureProviderResponse>(providerUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${basicAuth}`,
          },
          timeout: 30000, // 30 segundos de timeout
        }),
      );

      const { codigo, mensaje } = response.data;

      this.logger.log(
        `Respuesta del proveedor - Código: ${codigo}, Mensaje: ${mensaje}`,
      );

      // Validar que la respuesta tenga el formato esperado
      if (typeof codigo === 'undefined' || typeof mensaje === 'undefined') {
        this.logger.warn(
          `Respuesta del proveedor con formato inesperado: ${JSON.stringify(response.data)}`,
        );
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
        // El proveedor puede devolver códigos HTTP 4xx/5xx pero con datos válidos en el body
        if (error.response?.data?.codigo !== undefined) {
          const { codigo, mensaje } = error.response.data;

          this.logger.warn(
            `Respuesta del proveedor con código HTTP ${error.response.status} - Código: ${codigo}, Mensaje: ${mensaje}`,
          );

          return {
            codigo: Number(codigo),
            mensaje: String(mensaje || 'Error desconocido del proveedor'),
          };
        }

        this.logger.error(
          `Error de comunicación con el proveedor: HTTP ${error.response?.status || 'sin respuesta'} - ${error.message}`,
          {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            code: error.code, // ECONNREFUSED, ETIMEDOUT, etc.
          },
        );

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
   * Obtiene las solicitudes de firma de un distribuidor
   * @param distributorId ID del distribuidor
   * @returns Lista de solicitudes de firma
   */
  async getDistributorSignatureRequests(distributorId: string) {
    return this.prisma.signatureRequest.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtiene una solicitud de firma específica
   * @param id ID de la solicitud
   * @param distributorId ID del distribuidor (para verificar permisos)
   * @returns Solicitud de firma
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

    return signatureRequest;
  }
}
