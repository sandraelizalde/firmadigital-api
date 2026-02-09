import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNaturalSignatureDto } from './dto/create-natural-signature.dto';
import { CreateJuridicalSignatureDto } from './dto/create-juridical-signature.dto';
import { SignatureStatus, MovementType, PaymentMethod } from '@prisma/client';
import { FilesService } from 'src/files/files.service';
import { WhatsappService } from 'src/notifications/whatsapp.service';
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

interface SignatureProviderResponse {
  codigo: number;
  mensaje: string;
}

@Injectable()
export class SignaturesService {
  private readonly logger = new Logger(SignaturesService.name);
  private readonly config: ReturnType<
    typeof import('../config/app.config').default
  >;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly filesService: FilesService,
    private readonly creditsService: CreditsService,
    private readonly whatsappService: WhatsappService,
  ) {
    this.config = this.configService.get('app')!;
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
    // Validar que el servicio de Wasabi esté disponible antes de procesar
    await this.filesService.checkWasabiConnection();

    // Determinar qué método llamar según el tipo de documento y si usa token
    const tipoPersona = 'NATURAL';

    return this.createSignatureRequestByType(
      distributorId,
      dto,
      tipoPersona,
      dto.documento,
      dto.usa_token === 'true',
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
    // Validar que el servicio de Wasabi esté disponible antes de procesar
    await this.filesService.checkWasabiConnection();

    // Determinar qué método llamar según el tipo de documento y si usa token
    const tipoPersona = 'JURIDICA';

    return this.createSignatureRequestByType(
      distributorId,
      dto,
      tipoPersona,
      dto.documento,
      dto.usa_token === 'true',
      video_face,
    );
  }

  /**
   * Método principal que enruta la creación de firma según tipo de persona, documento y token
   * @param distributorId ID del distribuidor
   * @param dto Datos de la solicitud
   * @param tipoPersona NATURAL o JURIDICA
   * @param documento CEDULA, PASAPORTE o null
   * @param usaToken Si usa token Uanataca
   * @param video_face Video facial opcional
   * @returns Solicitud de firma creada
   */
  private async createSignatureRequestByType(
    distributorId: string,
    dto: any,
    tipoPersona: 'NATURAL' | 'JURIDICA',
    documento: 'CEDULA' | 'PASAPORTE' | null,
    usaToken: boolean,
    video_face?: Express.Multer.File,
  ) {
    switch (true) {
      // ===== NATURAL =====
      case tipoPersona === 'NATURAL' && documento === 'PASAPORTE':
        return this.createSignatureRequestUanatacaNatural(
          distributorId,
          dto,
          video_face,
        );

      case tipoPersona === 'NATURAL' && usaToken:
        return this.createSignatureRequestUanatacaTokenNatural(
          distributorId,
          dto,
          video_face,
        );

      case tipoPersona === 'NATURAL':
        return this.createSignatureRequestEnextNatural(
          distributorId,
          dto,
          video_face,
        );

      // ===== JURIDICA =====
      case tipoPersona === 'JURIDICA' && usaToken:
        return this.createSignatureRequestUanatacaTokenJuridica(
          distributorId,
          dto,
          video_face,
        );

      case tipoPersona === 'JURIDICA' && documento === 'PASAPORTE':
        return this.createSignatureRequestUanatacaJuridica(
          distributorId,
          dto,
          video_face,
        );

      case tipoPersona === 'JURIDICA':
        return this.createSignatureRequestEnextJuridica(
          distributorId,
          dto,
          video_face,
        );

      default:
        throw new BadRequestException(
          'No se pudo determinar el proveedor para esta firma',
        );
    }
  }

  /**
   * ========================================
   * MÉTODOS ESPECÍFICOS POR PROVEEDOR
   * ========================================
   */

  /**
   * Crea firma digital ENEXT para persona NATURAL
   */
  private async createSignatureRequestEnextNatural(
    distributorId: string,
    dto: any,
    video_face?: Express.Multer.File,
  ) {
    const type: 'NATURAL' | 'JURIDICA' = 'NATURAL';
    try {
      // 1. Validaciones iniciales
      this.validateAgeAndVideo(dto.fecha_nacimiento, video_face);
      const distributor = await this.validateDistributor(distributorId);

      // Validar código dactilar
      this.validateCodigoDactilar(dto.codigo_dactilar);

      //numero_identificacion solo 10 numeros
      const idRegex = /^\d{10}$/;
      if (!idRegex.test(dto.numero_identificacion)) {
        throw new BadRequestException(
          'El número de identificación debe contener exactamente 10 dígitos numéricos',
        );
      }

      // 2. Obtener plan, perfil y precio
      const { planPrice, perfil_firma, priceToCharge } =
        await this.getSignaturePlanPrice(
          distributorId,
          dto.plan_id,
          'perfilNaturalEnext',
          'PN sin token',
        );

      // 3. Validar capacidad de pago
      const { hasActiveCredit } = await this.validatePaymentCapability(
        distributorId,
        distributor.balance,
        priceToCharge,
      );

      const numero_tramite = this.generateNumeroTramite();

      // 4. Llamar al proveedor
      const providerPayload: any = {
        numero_tramite,
        usuario: this.config.signProvider.user,
        password: this.config.signProvider.password,
        perfil_firma,
        nombres: dto.nombres.toUpperCase(),
        apellidos: dto.apellidos.toUpperCase(),
        cedula: dto.numero_identificacion,
        codigo_dactilar: dto.codigo_dactilar,
        correo: dto.correo,
        provincia: dto.provincia.toUpperCase(),
        ciudad: dto.ciudad.toUpperCase(),
        parroquia: dto.parroquia.toUpperCase(),
        direccion: dto.direccion.toUpperCase(),
        celular: dto.celular,
        ruc: dto.ruc || '',
        clavefirma: dto.clave_firma,
        foto_frontal: dto.foto_frontal,
        foto_posterior: dto.foto_posterior,
        pais: 'ECUADOR',
        tipo_envio: '1',
      };

      const providerResponse = await this.callSignatureProviderEnext(
        providerPayload,
        this.config.signProvider.baseUrlNatural,
        type,
      );

      // 5. Determinar estado
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

      // 6. Subir archivos
      const files = await this.uploadSignatureFiles(
        distributorId,
        dto,
        video_face,
      );

      // 7. Transacción de pago y creación de firma
      const result = await this.processSignaturePayment({
        distributorId,
        distributorBalance: distributor.balance,
        hasActiveCredit,
        isSuccess,
        priceToCharge,
        perfil_firma,
        numero_tramite,
        dto,
        signatureData: {
          numero_tramite,
          distributorPlanPriceId: planPrice.id,
          planId: dto.plan_id,
          perfil_firma,
          nombres: dto.nombres.toUpperCase(),
          apellidos: dto.apellidos.toUpperCase(),
          cedula: dto.numero_identificacion,
          correo: dto.correo,
          codigo_dactilar: dto.codigo_dactilar,
          celular: dto.celular,
          provincia: dto.provincia.toUpperCase(),
          ciudad: dto.ciudad.toUpperCase(),
          parroquia: dto.parroquia.toUpperCase(),
          direccion: dto.direccion.toUpperCase(),
          dateOfBirth: new Date(dto.fecha_nacimiento),
          foto_frontal: files.foto_frontal_key,
          foto_posterior: files.foto_posterior_key,
          video_face: files.video_face_key || null,
          clavefirma: dto.clave_firma,
          ruc: dto.ruc || null,
          razon_social: dto.razon_social?.toUpperCase() || null,
          rep_legal: dto.rep_legal?.toUpperCase() || null,
          cargo: dto.cargo?.toUpperCase() || null,
          nombramiento: files.nombramiento_key || null,
          pdf_sri: files.pdf_sri_key || null,
          tipo_envio: '1',
          pais: 'ECUADOR',
          distributorId,
          status,
          providerCode: providerResponse.codigo.toString(),
          providerMessage: providerResponse.mensaje,
        },
      });

      return {
        success: isSuccess,
        message: providerResponse.mensaje,
        data: {
          signatureId: result.signatureRequest.id,
          balance: result.newBalance,
          priceCharged: result.priceCharged,
          usedCredit: result.usedCredit,
        },
      };
    } catch (error) {
      this.handleSignatureError(error);
    }
  }

  /**
   * Crea firma digital ENEXT para persona JURIDICA
   */
  private async createSignatureRequestEnextJuridica(
    distributorId: string,
    dto: any,
    video_face?: Express.Multer.File,
  ) {
    const type: 'NATURAL' | 'JURIDICA' = 'JURIDICA';
    try {
      // 1. Validaciones iniciales
      this.validateAgeAndVideo(dto.fecha_nacimiento, video_face);
      const distributor = await this.validateDistributor(distributorId);

      // Validar código dactilar
      this.validateCodigoDactilar(dto.codigo_dactilar);

      // 2. Obtener plan, perfil y precio
      const { planPrice, perfil_firma, priceToCharge } =
        await this.getSignaturePlanPrice(
          distributorId,
          dto.plan_id,
          'perfilJuridicoEnext',
          'PJ sin token',
        );

      // 3. Validar capacidad de pago
      const { hasActiveCredit } = await this.validatePaymentCapability(
        distributorId,
        distributor.balance,
        priceToCharge,
      );

      const numero_tramite = this.generateNumeroTramite();

      // 4. Llamar al proveedor
      const providerPayload: any = {
        numero_tramite,
        usuario: this.config.signProvider.user,
        password: this.config.signProvider.password,
        perfil_firma,
        nombres: dto.nombres.toUpperCase(),
        apellidos: dto.apellidos.toUpperCase(),
        cedula: dto.numero_identificacion,
        codigo_dactilar: dto.codigo_dactilar,
        correo: dto.correo,
        provincia: dto.provincia.toUpperCase(),
        ciudad: dto.ciudad.toUpperCase(),
        parroquia: dto.parroquia.toUpperCase(),
        direccion: dto.direccion.toUpperCase(),
        celular: dto.celular,
        ruc: dto.ruc || '',
        clavefirma: dto.clave_firma,
        foto_frontal: dto.foto_frontal,
        foto_posterior: dto.foto_posterior,
        pais: 'ECUADOR',
        tipo_envio: '1',
        // Campos específicos jurídica
        callback: this.config.signProvider.callback || '',
        razon_social: dto.razon_social?.toUpperCase() || '',
        rep_legal: dto.rep_legal?.toUpperCase() || '',
        cargo: dto.cargo?.toUpperCase() || '',
        pdfSriBase64: dto.pdf_sri_base64 || '',
        nombramientoBase64: dto.nombramiento_base64 || '',
      };

      const providerResponse = await this.callSignatureProviderEnext(
        providerPayload,
        this.config.signProvider.baseUrlJuridica,
        type,
      );

      // 5. Determinar estado (jurídica queda en PENDING al éxito)
      const isSuccess = providerResponse.codigo === 1;
      const isRejected = providerResponse.codigo === 0;

      let status: SignatureStatus;
      if (isSuccess) {
        status = SignatureStatus.PENDING;
      } else if (isRejected) {
        status = SignatureStatus.REJECTED;
      } else {
        status = SignatureStatus.FAILED;
      }

      // 6. Subir archivos
      const files = await this.uploadSignatureFiles(
        distributorId,
        dto,
        video_face,
      );

      // 7. Transacción de pago y creación de firma
      const result = await this.processSignaturePayment({
        distributorId,
        distributorBalance: distributor.balance,
        hasActiveCredit,
        isSuccess,
        priceToCharge,
        perfil_firma,
        numero_tramite,
        dto,
        signatureData: {
          numero_tramite,
          distributorPlanPriceId: planPrice.id,
          planId: dto.plan_id,
          perfil_firma,
          nombres: dto.nombres.toUpperCase(),
          apellidos: dto.apellidos.toUpperCase(),
          cedula: dto.numero_identificacion,
          correo: dto.correo,
          codigo_dactilar: dto.codigo_dactilar,
          celular: dto.celular,
          provincia: dto.provincia.toUpperCase(),
          ciudad: dto.ciudad.toUpperCase(),
          parroquia: dto.parroquia.toUpperCase(),
          direccion: dto.direccion.toUpperCase(),
          dateOfBirth: new Date(dto.fecha_nacimiento),
          foto_frontal: files.foto_frontal_key,
          foto_posterior: files.foto_posterior_key,
          video_face: files.video_face_key || null,
          clavefirma: dto.clave_firma,
          ruc: dto.ruc || null,
          razon_social: dto.razon_social?.toUpperCase() || null,
          rep_legal: dto.rep_legal?.toUpperCase() || null,
          cargo: dto.cargo?.toUpperCase() || null,
          nombramiento: files.nombramiento_key || null,
          pdf_sri: files.pdf_sri_key || null,
          tipo_envio: '1',
          pais: 'ECUADOR',
          distributorId,
          status,
          providerCode: providerResponse.codigo.toString(),
          providerMessage: providerResponse.mensaje,
        },
      });

      return {
        success: isSuccess,
        message: providerResponse.mensaje,
        data: {
          signatureId: result.signatureRequest.id,
          balance: result.newBalance,
          priceCharged: result.priceCharged,
          usedCredit: result.usedCredit,
        },
      };
    } catch (error) {
      this.handleSignatureError(error);
    }
  }

  /**
   * Crea firma digital UANATACA ARCHIVO para persona NATURAL (pasaporte)
   */
  private async createSignatureRequestUanatacaNatural(
    distributorId: string,
    dto: any,
    video_face?: Express.Multer.File,
  ) {
    try {
      // 1. Validaciones iniciales
      this.validateAgeAndVideo(dto.fecha_nacimiento, video_face);
      const distributor = await this.validateDistributor(distributorId);

      if (!dto.sexo) {
        throw new BadRequestException(
          'El sexo es requerido para este tipo de firma',
        );
      }
      if (!dto.selfie) {
        throw new BadRequestException(
          'La selfie es requerida para este tipo de firma',
        );
      }

      const identification = dto.numero_identificacion;

      // Duplicar foto_frontal si no viene foto_posterior (caso pasaporte)
      if (!dto.foto_posterior) {
        dto.foto_posterior = dto.foto_frontal;
      }

      // 2. Obtener plan, perfil (productUuid) y precio
      const { planPrice, perfil_firma, priceToCharge } =
        await this.getSignaturePlanPrice(
          distributorId,
          dto.plan_id,
          'perfilNaturalUanataca',
          'PN sin token',
        );

      // 3. Validar capacidad de pago
      const { hasActiveCredit } = await this.validatePaymentCapability(
        distributorId,
        distributor.balance,
        priceToCharge,
      );

      const numero_tramite = this.generateNumeroTramite();

      // 4. Autenticarse con Uanataca (token dura 5 min)
      const accessToken = await this.authenticateUanataca();

      // Separar apellidos (el DTO tiene "apellidos" como campo único)
      const apellidosParts = dto.apellidos.toUpperCase().split(' ');
      const lastName1 = apellidosParts[0] || '';
      const lastName2 = apellidosParts.slice(1).join(' ') || '';

      // 5. Preparar payload para Uanataca
      const providerPayload: any = {
        identificationType: this.mapIdentificationTypeUanataca(dto.documento),
        identification: identification,
        names: dto.nombres.toUpperCase(),
        lastName1,
        birthDate: this.formatDateForUanataca(dto.fecha_nacimiento),
        nationality: 'ECUATORIANA',
        sex: dto.sexo.toUpperCase(),
        phoneNumber: dto.celular,
        email: dto.correo,
        province: dto.provincia.toUpperCase(),
        city: dto.ciudad.toUpperCase(),
        address: dto.direccion.toUpperCase(),
        productUuid: perfil_firma,
        frontIdentification: {
          name: `cedula_frontal_${identification}.jpg`,
          type: 'image/jpeg',
          base64: dto.foto_frontal,
        },
        backIdentification: {
          name: `cedula_reverso_${identification}.jpg`,
          type: 'image/jpeg',
          base64: dto.foto_posterior,
        },
        selfie: {
          name: `selfie_${identification}.jpg`,
          type: 'image/jpeg',
          base64: dto.selfie,
        },
      };

      // Agregar video si existe (para mayores de 80)
      if (video_face) {
        const videoExtension = this.getFileExtension(video_face.mimetype);
        const videoBase64 = video_face.buffer.toString('base64');
        providerPayload.seniorVideo = {
          name: `video_${identification}.${videoExtension}`,
          type: video_face.mimetype,
          base64: videoBase64,
        };
      }

      // Agregar RUC si existe
      if (dto.ruc) {
        providerPayload.ruc = dto.ruc;
      }

      // 6. Llamar al proveedor Uanataca
      const providerResponse = await this.callUanatacaCertificateRequest(
        providerPayload,
        accessToken,
      );

      // 7. Determinar estado
      const isSuccess = providerResponse.success;

      let status: SignatureStatus;
      if (isSuccess) {
        status = SignatureStatus.PENDING;
      } else {
        status = SignatureStatus.FAILED;
      }

      // 8. Subir archivos al storage
      const files = await this.uploadSignatureFiles(
        distributorId,
        dto,
        video_face,
      );

      // 9. Transacción de pago y creación de firma
      const result = await this.processSignaturePayment({
        distributorId,
        distributorBalance: distributor.balance,
        hasActiveCredit,
        isSuccess,
        priceToCharge,
        perfil_firma,
        numero_tramite,
        dto,
        signatureData: {
          numero_tramite,
          distributorPlanPriceId: planPrice.id,
          planId: dto.plan_id,
          perfil_firma,
          nombres: dto.nombres.toUpperCase(),
          apellidos: dto.apellidos.toUpperCase(),
          cedula: identification,
          correo: dto.correo,
          codigo_dactilar: dto.codigo_dactilar || '',
          celular: dto.celular,
          provincia: dto.provincia.toUpperCase(),
          ciudad: dto.ciudad.toUpperCase(),
          parroquia: dto.parroquia?.toUpperCase() || dto.ciudad.toUpperCase(),
          direccion: dto.direccion.toUpperCase(),
          dateOfBirth: new Date(dto.fecha_nacimiento),
          foto_frontal: files.foto_frontal_key,
          foto_posterior: files.foto_posterior_key,
          video_face: files.video_face_key || null,
          clavefirma: dto.clave_firma || '',
          ruc: dto.ruc || null,
          razon_social: null,
          rep_legal: null,
          cargo: null,
          nombramiento: null,
          pdf_sri: null,
          tipo_envio: '1',
          pais: 'ECUADOR',
          distributorId,
          status,
          providerCode:
            providerResponse.providerUuid || (isSuccess ? '1' : '0'),
          providerMessage: providerResponse.message,
          provider: 'UANATACA',
        },
      });

      return {
        success: isSuccess,
        message: providerResponse.message,
        data: {
          signatureId: result.signatureRequest.id,
          balance: result.newBalance,
          priceCharged: result.priceCharged,
          usedCredit: result.usedCredit,
        },
      };
    } catch (error) {
      this.handleSignatureError(error);
    }
  }

  /**
   * Crea firma digital UANATACA ARCHIVO para persona JURIDICA (pasaporte)
   * TODO: Implementar integración con Uanataca
   */
  private async createSignatureRequestUanatacaJuridica(
    distributorId: string,
    dto: any,
    video_face?: Express.Multer.File,
  ) {
    return new Error('Método PJ con pasaporte no implementado aún');

    // 1. Validaciones iniciales
    this.validateAgeAndVideo(dto.fecha_nacimiento, video_face);
    const distributor = await this.validateDistributor(distributorId);

    if (!dto.sexo) {
      throw new BadRequestException(
        'El sexo es requerido para este tipo de firma',
      );
    }
    if (!dto.selfie) {
      throw new BadRequestException(
        'La selfie es requerida para este tipo de firma',
      );
    }

    // Validar campos específicos de UANATACA para jurídicas
    if (!dto.constitucion_base64) {
      throw new BadRequestException(
        'El documento de constitución es requerido para firmas jurídicas con pasaporte',
      );
    }
    if (!dto.aceptacion_nombramiento_base64) {
      throw new BadRequestException(
        'El documento de aceptación del nombramiento es requerido para firmas jurídicas con pasaporte',
      );
    }
    if (!dto.identificacion_representante_base64) {
      throw new BadRequestException(
        'La identificación del representante legal es requerida para firmas jurídicas con pasaporte',
      );
    }

    const identification = dto.numero_identificacion;

    // Duplicar foto_frontal si no viene foto_posterior (caso pasaporte)
    if (!dto.foto_posterior) {
      dto.foto_posterior = dto.foto_frontal;
    }

    // 2. Obtener plan, perfil (productUuid) y precio
    const { planPrice, perfil_firma, priceToCharge } =
      await this.getSignaturePlanPrice(
        distributorId,
        dto.plan_id,
        'perfilJuridicoUanataca',
        'PJ sin token',
      );

    // 3. Validar capacidad de pago
    const { hasActiveCredit } = await this.validatePaymentCapability(
      distributorId,
      distributor.balance,
      priceToCharge,
    );

    const numero_tramite = this.generateNumeroTramite();

    // 4. Autenticarse con Uanataca (token dura 5 min)
    const accessToken = await this.authenticateUanataca();

    // Separar apellidos (el DTO tiene "apellidos" como campo único)
    const apellidosParts = dto.apellidos.toUpperCase().split(' ');
    const lastName1 = apellidosParts[0] || '';
    const lastName2 = apellidosParts.slice(1).join(' ') || '';

    // 5. Preparar payload para Uanataca
    const providerPayload: any = {
      identificationType: this.mapIdentificationTypeUanataca(dto.documento),
      identification: identification,
      names: dto.nombres.toUpperCase(),
      lastName1,
      lastName2,
      birthDate: this.formatDateForUanataca(dto.fecha_nacimiento),
      nationality: 'ECUATORIANA',
      sex: dto.sexo.toUpperCase(),
      phoneNumber: dto.celular,
      email: dto.correo,
      province: dto.provincia.toUpperCase(),
      city: dto.ciudad.toUpperCase(),
      address: dto.direccion.toUpperCase(),
      productUuid: perfil_firma,
      frontIdentification: {
        name: `cedula_frontal_${identification}.jpg`,
        type: 'image/jpeg',
        base64: dto.foto_frontal,
      },
      backIdentification: {
        name: `cedula_reverso_${identification}.jpg`,
        type: 'image/jpeg',
        base64: dto.foto_posterior,
      },
      selfie: {
        name: `selfie_${identification}.jpg`,
        type: 'image/jpeg',
        base64: dto.selfie,
      },
      // Campos específicos jurídica
      rucFile: {
        name: `ruc_${identification}.jpg`,
        type: 'image/jpeg',
        base64: dto.pdf_sri_base64 || '',
      },
      appointment: {
        name: `nombramiento_${identification}.jpg`,
        type: 'image/jpeg',
        base64: dto.nombramiento_base64 || '',
      },

      constitution: {
        name: `constitucion_${identification}.pdf`,
        type: 'application/pdf',
        base64: dto.constitucion_base64 || '',
      },
      managerIdentification: {
        name: `id_rl_${identification}.jpg`,
        type: 'image/jpeg',
        base64: dto.identificacion_representante_base64 || '',
      },
    };

    // 6. Llamar al proveedor Uanataca
    const providerResponse = await this.callUanatacaCertificateRequest(
      providerPayload,
      accessToken,
    );

    // 7. Determinar estado (jurídica queda en PENDING al éxito)
    const isSuccess = providerResponse.success;

    let status: SignatureStatus;
    if (isSuccess) {
      status = SignatureStatus.PENDING;
    } else {
      status = SignatureStatus.REJECTED;
    }

    // 8. Subir archivos al storage
    const files = await this.uploadSignatureFiles(
      distributorId,
      dto,
      video_face,
    );

    // 9. Transacción de pago y creación de firma
    const result = await this.processSignaturePayment({
      distributorId,
      distributorBalance: distributor.balance,
      hasActiveCredit,
      isSuccess,
      priceToCharge,
      perfil_firma,
      numero_tramite,
      dto,
      signatureData: {
        numero_tramite,
        distributorPlanPriceId: planPrice.id,
        planId: dto.plan_id,
        perfil_firma,
        nombres: dto.nombres.toUpperCase(),
        apellidos: dto.apellidos.toUpperCase(),
        cedula: identification,
        correo: dto.correo,
        codigo_dactilar: dto.codigo_dactilar || '',
        celular: dto.celular,
        provincia: dto.provincia.toUpperCase(),
        ciudad: dto.ciudad.toUpperCase(),
        parroquia: dto.parroquia?.toUpperCase() || dto.ciudad.toUpperCase(),
        direccion: dto.direccion.toUpperCase(),
        dateOfBirth: new Date(dto.fecha_nacimiento),
        foto_frontal: files.foto_frontal_key,
        foto_posterior: files.foto_posterior_key,
        video_face: files.video_face_key || null,
        clavefirma: dto.clave_firma || '',
        ruc: dto.ruc || '',
        razon_social: dto.razon_social?.toUpperCase() || null,
        rep_legal: dto.rep_legal?.toUpperCase() || null,
        cargo: dto.cargo?.toUpperCase() || null,
        nombramiento: files.nombramiento_key || null,
        pdf_sri: files.pdf_sri_key || null,
        tipo_envio: '1',
        pais: 'ECUADOR',
        distributorId,
        status,
        providerCode: providerResponse.providerUuid || (isSuccess ? '1' : '0'),
        providerMessage: providerResponse.message,
        provider: 'UANATACA',
      },
    });

    return {
      success: isSuccess,
      message: providerResponse.message,
      data: {
        signatureId: result.signatureRequest.id,
        balance: result.newBalance,
        priceCharged: result.priceCharged,
        usedCredit: result.usedCredit,
      },
    };
  }

  /**
   * Crea firma digital UANATACA TOKEN para persona NATURAL
   * TODO: Implementar integración con Uanataca Token
   */
  private async createSignatureRequestUanatacaTokenNatural(
    distributorId: string,
    dto: any,
    video_face?: Express.Multer.File,
  ) {
    throw new BadRequestException('Firma PN con token no implementada aún');
  }

  /**
   * Crea firma digital UANATACA TOKEN para persona JURIDICA
   * TODO: Implementar integración con Uanataca Token
   */
  private async createSignatureRequestUanatacaTokenJuridica(
    distributorId: string,
    dto: any,
    video_face?: Express.Multer.File,
  ) {
    throw new BadRequestException('Firma PJ con token no implementada aún');
  }

  /**
   * Llama al API del proveedor de firma digital
   * @param payload Datos a enviar al proveedor
   * @param providerUrl URL del proveedor (natural o jurídica)
   * @param type Tipo de firma: NATURAL o JURIDICA
   * @returns Respuesta del proveedor con formato {codigo: number, mensaje: string}
   */
  private async callSignatureProviderEnext(
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
          ? this.config.signProvider.authUsernameBiometria
          : this.config.signProvider.authUsername;
      const authPassword =
        type === 'JURIDICA'
          ? this.config.signProvider.authPasswordBiometria
          : this.config.signProvider.authPassword;

      const basicAuth = Buffer.from(`${authUsername}:${authPassword}`).toString(
        'base64',
      );

      let response;

      if (this.config.environment === 'development') {
        response = {
          data: {
            codigo: 1,
            mensaje: 'SIMULACION Firma creada exitosamente',
          },
        };
      } else {
        response = await firstValueFrom(
          this.httpService.post<SignatureProviderResponse>(
            providerUrl,
            payload,
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${basicAuth}`,
              },
            },
          ),
        );
      }

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

    // Obtener las solicitudes paginadas con relación al plan
    const signatureRequests = await this.prisma.signatureRequest.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        plan: true,
      },
    });

    // Procesar solicitudes y calcular días de expiración
    const data: SignatureListItemDto[] = signatureRequests.map((request) => {
      const plan = request.plan;
      let expiredDays: number | null = null;

      if (plan) {
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
        durationType: plan ? plan.durationType : null,
        duration: plan ? plan.duration : null,
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
      if (
        !this.config.emailVerification.apiUrl ||
        !this.config.emailVerification.apiKey
      ) {
        this.logger.warn(
          'URL o API Key para verificación de email no configurados',
        );
        return false;
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.config.emailVerification.apiUrl}`, {
          params: {
            email,
            apikey: this.config.emailVerification.apiKey,
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
   * Cron diario (12:00 PM) para notificar firmas próximas a vencer (5 días antes)
   * Solo para firmas de 1 a 5 años
   */
  @Cron('0 12 * * *', {
    timeZone: 'America/Guayaquil',
  })
  async notifyExpiringSignatures() {
    if (this.config.environment !== 'production') {
      this.logger.log(
        'Notificación de firmas por vencer omitida (Entorno no productivo)',
      );
      return;
    }

    this.logger.log('Iniciando verificación de firmas próximas a vencer...');

    try {
      const today = new Date();
      // Fecha de vencimiento objetivo: Hoy + 5 días
      const targetExpiration = new Date(today);
      targetExpiration.setDate(today.getDate() + 5);

      const expirationDateStr = targetExpiration.toLocaleDateString('es-EC', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      const yearsToCheck = [1, 2, 3, 4, 5];

      for (const years of yearsToCheck) {
        const targetUpdatedAt = new Date(targetExpiration);
        targetUpdatedAt.setFullYear(targetExpiration.getFullYear() - years);

        const startDate = new Date(targetUpdatedAt);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(targetUpdatedAt);
        endDate.setHours(23, 59, 59, 999);

        // Buscar firmas que expiran, filtrando por la relación con el plan
        const expiringSignatures = await this.prisma.signatureRequest.findMany({
          where: {
            status: SignatureStatus.COMPLETED,
            activeNotification: true,
            updatedAt: {
              gte: startDate,
              lte: endDate,
            },
            plan: {
              duration: years.toString(),
              durationType: { in: ['Y', 'YS'] },
              isActive: true,
            },
            distributor: {
              active: true,
              phone: { not: '' },
            },
          },
          include: {
            distributor: {
              select: {
                phone: true,
                firstName: true,
                lastName: true,
                socialReason: true,
              },
            },
          },
        });

        if (expiringSignatures.length > 0) {
          this.logger.log(
            `Encontradas ${expiringSignatures.length} firmas de ${years} año(s) que vencen el ${expirationDateStr}`,
          );

          // 4. Enviar notificaciones
          for (const signature of expiringSignatures) {
            await this.sendExpirationNotification(signature, expirationDateStr);
          }
        }
      }

      this.logger.log('Verificación de firmas próximas a vencer completada.');
    } catch (error) {
      this.logger.error(
        `Error en el cron de notificaciones de firma: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Envía la notificación de WhatsApp para una firma por vencer
   */
  private async sendExpirationNotification(
    signature: any,
    expirationDate: string,
  ) {
    try {
      if (!signature.distributor?.phone) return;

      const distributorName =
        signature.distributor.firstName ||
        signature.distributor.socialReason ||
        'Distribuidor';

      const clientName = signature.razon_social
        ? signature.razon_social
        : `${signature.nombres} ${signature.apellidos}`;

      const clientId = signature.ruc || signature.cedula;

      await this.whatsappService.sendTemplate(
        signature.distributor.phone,
        'renocaion_distribuidores',
        [distributorName, clientName, clientId, expirationDate],
        'es',
      );
    } catch (error) {
      this.logger.error(
        `Error enviando notificación de expiración ${signature.id}: ${error.message}`,
      );
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
      include: {
        plan: true,
      },
    });

    if (!signatureRequest) {
      throw new BadRequestException('Solicitud de firma no encontrada');
    }

    // Obtener el plan directamente de la relación
    const plan = signatureRequest.plan;

    // Calcular fecha de expiración y duración si el plan existe y la firma está completada
    let expirationDate: Date | null = null;
    let duration: string | null = null;
    let durationType: string | null = null;

    if (plan && signatureRequest.status === SignatureStatus.COMPLETED) {
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
        priceCharged: signatureRequest.priceCharged,
        paymentMethod: signatureRequest.paymentMethod,
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

    // Filtro por rango de fechas (zona horaria de Ecuador: UTC-5)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const startDateTime = new Date(startDate + 'T00:00:00-05:00');
        where.createdAt.gte = startDateTime;
      }
      if (endDate) {
        const endDateTime = new Date(endDate + 'T23:59:59.999-05:00');
        where.createdAt.lte = endDateTime;
      }
    }

    // Obtener el total de registros
    const total = await this.prisma.signatureRequest.count({ where });

    // Obtener las solicitudes paginadas con información del distribuidor y plan
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
        plan: true,
      },
    });

    // Procesar solicitudes y calcular días de expiración
    const data: AdminSignatureListItemDto[] = signatureRequests.map(
      (request) => {
        const plan = request.plan;
        let expiredDays: number | null = null;
        let duration: string | null = null;
        let durationType: string | null = null;

        if (plan) {
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
          priceCharged: request.priceCharged,
          paymentMethod: request.paymentMethod,
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
        plan: true,
      },
    });

    if (!signatureRequest) {
      throw new BadRequestException('Solicitud de firma no encontrada');
    }

    // Obtener el plan directamente de la relación
    const plan = signatureRequest.plan;

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
        priceCharged: signatureRequest.priceCharged,
        paymentMethod: signatureRequest.paymentMethod,
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

    if (signatureRequest.status === SignatureStatus.ANNULLED) {
      throw new BadRequestException('La solicitud de firma ya está anulada');
    }

    // 1. Determinar si fue pagada por crédito
    let isPaidViaCredit =
      signatureRequest.paymentMethod === PaymentMethod.CREDIT;
    let targetCutoff: any = null;
    let refundAmount = signatureRequest.priceCharged || 0;
    let wasAlreadyPaidInCutoff = false;

    if (!isPaidViaCredit) {
      const originalMovement = await this.prisma.accountMovement.findFirst({
        where: {
          signatureId: signatureRequest.id,
          type: MovementType.EXPENSE,
        },
      });
      if (originalMovement) {
        refundAmount = originalMovement.amount;
      } else if (refundAmount === 0) {
        const planPrice = await this.prisma.distributorPlanPrice.findFirst({
          where: {
            distributorId: signatureRequest.distributorId!,
            planId: signatureRequest.planId,
          },
        });
        refundAmount = planPrice?.customPrice || 0;
        isPaidViaCredit = true;
      }
    }

    if (isPaidViaCredit) {
      const sigDate = new Date(signatureRequest.createdAt);
      const ecuadorDateString = sigDate.toLocaleString('en-US', {
        timeZone: 'America/Guayaquil',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const [month, day, year] = ecuadorDateString.split('/');
      const cutoffDate = new Date(`${year}-${month}-${day}T23:59:59.999-05:00`);

      targetCutoff = await this.prisma.creditCutoff.findFirst({
        where: {
          distributorId: signatureRequest.distributorId!,
          cutoffDate: cutoffDate,
        },
      });

      if (targetCutoff) {
        wasAlreadyPaidInCutoff = targetCutoff.amountPaid >= refundAmount;
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const distributor = await tx.distributor.findUnique({
        where: { id: signatureRequest.distributorId! },
        select: { balance: true },
      });

      let newBalance = distributor?.balance || 0;

      await tx.signatureRequest.update({
        where: { id: signatureId },
        data: {
          status: SignatureStatus.ANNULLED,
          annulledBy: adminName,
          annulledNote: note || 'Anulada por administrador',
        },
      });

      let actualRefundedToBalance = 0;
      let discountedFromCredit = 0;
      let movementId: string | null = null;
      let paymentTransferredTo: string | null = null;

      if (generateRefund && refundAmount > 0) {
        if (isPaidViaCredit && targetCutoff) {
          let signatures: string[] = [];
          try {
            signatures = JSON.parse(targetCutoff.signaturesDetails || '[]');
          } catch (e) {
            signatures = [];
          }

          const signatureWasInCutoff = signatures.includes(signatureId);

          if (!signatureWasInCutoff) {
            this.logger.warn(
              `Firma ${signatureId} no encontrada en corte ${targetCutoff.id}`,
            );
          }

          // Remover la firma anulada del listado
          signatures = signatures.filter((id) => id !== signatureId);

          let newAmountUsed = Math.max(
            0,
            targetCutoff.amountUsed - refundAmount,
          );
          let newAmountPaid = targetCutoff.amountPaid;
          let shouldTransferPayment = false;

          if (wasAlreadyPaidInCutoff) {
            this.logger.log(
              `Firma anulada ya había sido cobrada ($${(refundAmount / 100).toFixed(2)})`,
            );

            const otherValidSignaturesInCutoff =
              await tx.signatureRequest.findMany({
                where: {
                  id: { in: signatures },
                  status: {
                    in: [SignatureStatus.COMPLETED],
                  },
                  paymentMethod: PaymentMethod.CREDIT,
                },
                select: {
                  id: true,
                  nombres: true,
                  apellidos: true,
                  razon_social: true,
                  priceCharged: true,
                },
                orderBy: {
                  createdAt: 'asc',
                },
              });

            if (otherValidSignaturesInCutoff.length > 0) {
              const targetSignature = otherValidSignaturesInCutoff[0];

              shouldTransferPayment = true;
              paymentTransferredTo = targetSignature.id;

              this.logger.log(
                `PAGO TRANSFERIDO: La firma válida ahora está considerada como pagada`,
              );
            } else {
              newAmountPaid = Math.max(
                0,
                targetCutoff.amountPaid - refundAmount,
              );
            }
          } else {
            newAmountPaid = Math.min(targetCutoff.amountPaid, newAmountUsed);
          }

          const isNowPaid = newAmountUsed <= newAmountPaid;

          await tx.creditCutoff.update({
            where: { id: targetCutoff.id },
            data: {
              amountUsed: newAmountUsed,
              amountPaid: newAmountPaid,
              signaturesCount: Math.max(0, targetCutoff.signaturesCount - 1),
              signaturesDetails: JSON.stringify(signatures),
              isPaid: isNowPaid,
              isOverdue: isNowPaid ? false : targetCutoff.isOverdue,
            },
          });
          discountedFromCredit = refundAmount;
        } else {
          // Reembolso directo al balance
          newBalance += refundAmount;
          actualRefundedToBalance = refundAmount;

          await tx.distributor.update({
            where: { id: signatureRequest.distributorId! },
            data: { balance: newBalance },
          });

          const movement = await tx.accountMovement.create({
            data: {
              distributorId: signatureRequest.distributorId!,
              type: MovementType.INCOME,
              detail: `Reembolso por anulación de firma - ${signatureRequest.apellidos || signatureRequest.razon_social}`,
              amount: refundAmount,
              balanceAfter: newBalance,
              signatureId: signatureRequest.id,
              adminName: adminName,
              note: note || `Anulación de firma`,
            },
          });
          movementId = movement.id;
        }
      }

      return {
        signatureId,
        distributorId: signatureRequest.distributorId,
        refundedAmount: actualRefundedToBalance,
        discountedFromCredit,
        newDistributorBalance: newBalance,
        movementId,
        targetCutoffId: targetCutoff?.id,
        wasAlreadyPaidInCutoff,
        paymentTransferredTo,
      };
    });

    if (isPaidViaCredit && targetCutoff) {
      try {
        const unblockResult =
          await this.creditsService.checkAndUnblockAfterAnnulment(
            signatureRequest.distributorId!,
            targetCutoff.creditId,
          );
      } catch (error) {
        this.logger.error(
          `Error al verificar desbloqueo después de anulación: ${error.message}`,
        );
      }
    }

    // Construir mensaje de respuesta
    let message = 'Firma anulada exitosamente';
    if (generateRefund) {
      if (result.refundedAmount > 0) {
        message += ` y se reembolsaron $${(result.refundedAmount / 100).toFixed(2)} al saldo del distribuidor.`;
      } else if (result.discountedFromCredit > 0) {
        if (result.paymentTransferredTo) {
          message += ` y el pago de $${(result.discountedFromCredit / 100).toFixed(2)} se transfirió a otra firma válida del mismo corte.`;
        } else {
          const paymentStatus = result.wasAlreadyPaidInCutoff
            ? 'cobrada'
            : 'pendiente de cobro';
          message += ` y se descontó el valor de $${(result.discountedFromCredit / 100).toFixed(2)} del corte de crédito (firma ${paymentStatus}).`;
        }
      } else {
        message += ' sin embargo no se generó reembolso (valor calculado 0).';
      }
    } else {
      message += ' sin generar reembolso.';
    }

    // Notificación WhatsApp
    try {
      if (signatureRequest.distributor && signatureRequest.distributor.phone) {
        const distName =
          signatureRequest.distributor.firstName || 'Distribuidor';
        const clientName = signatureRequest.perfil_firma.startsWith('PJ-')
          ? `${signatureRequest.razon_social}`
          : `${signatureRequest.nombres} ${signatureRequest.apellidos}` ||
            'Cliente';
        const reason = note || 'Anulada por administrador';

        await this.whatsappService.sendTemplate(
          signatureRequest.distributor.phone,
          'firmarechazada_pj',
          [distName, clientName, reason],
          'en',
        );
      }
    } catch (error) {
      this.logger.error(
        `Error enviando notificación de anulación de firma: ${error.message}`,
      );
    }

    return {
      success: true,
      message,
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
   * Valida el formato y tamaño de un archivo de video
   * @param video_face Archivo de video a validar
   * @throws BadRequestException si el video no cumple con los requisitos
   */
  private validateVideoFile(video_face?: Express.Multer.File): void {
    if (!video_face) return;

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
   * Valida la edad del solicitante y la obligatoriedad del video
   * @param dateOfBirth Fecha de nacimiento del solicitante
   * @param video_face Archivo de video opcional
   * @throws BadRequestException si edad >= 80 y no hay video
   */
  private validateAgeAndVideo(
    dateOfBirth: string | Date,
    video_face?: Express.Multer.File,
  ): void {
    const age = this.calculateAge(dateOfBirth);

    // Validar que el video sea obligatorio si edad >= 80
    if (age >= 80 && !video_face) {
      throw new BadRequestException(
        'El video facial es obligatorio para personas de 80 años o más',
      );
    }

    // Validar formato y tamaño del video
    this.validateVideoFile(video_face);
  }

  /**
   * Valida el formato del código dactilar
   * Formato esperado: Letra + 2-3 dígitos + Letra + 4 dígitos (ej: V43I4444, A123B5678)
   * @param codigo_dactilar Código dactilar a validar
   * @throws BadRequestException si el formato es inválido
   */
  private validateCodigoDactilar(codigo_dactilar: string): void {
    if (!codigo_dactilar) {
      throw new BadRequestException(
        'El código dactilar es requerido para firmas con cédula',
      );
    }
  }

  private calculateAge(dateOfBirth: string | Date): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }
  /**
   * Valida que el distribuidor existe y está activo
   */
  private async validateDistributor(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      throw new BadRequestException('Distribuidor no encontrado');
    }

    if (!distributor.active) {
      throw new BadRequestException('Distribuidor inactivo');
    }

    return distributor;
  }

  /**
   * Obtiene el plan asignado al distribuidor, su perfil de firma y el precio a cobrar
   * @param perfilField Campo del plan que contiene el perfil de firma (ej: perfilNaturalEnext)
   * @param perfilLabel Etiqueta descriptiva para el error (ej: "Natural Enext")
   */
  private async getSignaturePlanPrice(
    distributorId: string,
    planId: string,
    perfilField:
      | 'perfilNaturalEnext'
      | 'perfilJuridicoEnext'
      | 'perfilNaturalUanataca'
      | 'perfilJuridicoUanataca'
      | 'perfilNaturalTokenUanataca'
      | 'perfilJuridicoTokenUanataca',
    perfilLabel: string,
  ) {
    const planPrice = await this.prisma.distributorPlanPrice.findFirst({
      where: {
        distributorId,
        planId,
        isActive: true,
      },
      include: {
        plan: true,
      },
    });

    if (!planPrice) {
      throw new BadRequestException(
        'No se encontró el plan asignado al distribuidor',
      );
    }

    const perfil_firma = planPrice.plan[perfilField];
    if (!perfil_firma) {
      throw new BadRequestException(
        `El plan no tiene perfil configurado para ${perfilLabel}`,
      );
    }

    const priceToCharge = planPrice.customPricePromo
      ? planPrice.customPricePromo
      : planPrice.customPrice;

    return { planPrice, perfil_firma, priceToCharge };
  }

  /**
   * Valida que el distribuidor puede emitir firmas (crédito/balance)
   * Retorna si tiene crédito activo
   */
  private async validatePaymentCapability(
    distributorId: string,
    distributorBalance: number,
    priceToCharge: number,
  ) {
    const canEmit = await this.creditsService.canEmitSignature(distributorId);
    if (!canEmit) {
      throw new BadRequestException(
        'No puede emitir firmas. Tiene un crédito bloqueado por falta de pago.',
      );
    }

    const creditStatus =
      await this.creditsService.getCreditStatus(distributorId);
    const hasActiveCredit = creditStatus !== null && !creditStatus.isBlocked;

    if (!hasActiveCredit && distributorBalance < priceToCharge) {
      throw new BadRequestException(
        `Balance insuficiente. Se requieren $${(priceToCharge / 100).toFixed(2)} y tiene $${(distributorBalance / 100).toFixed(2)}`,
      );
    }

    return { hasActiveCredit };
  }

  /**
   * Sube todos los archivos de una solicitud de firma (fotos, PDFs, video)
   */
  private async uploadSignatureFiles(
    distributorId: string,
    dto: any,
    video_face?: Express.Multer.File,
  ) {
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

    if (dto.pdf_sri_base64) {
      pdf_sri_key = await this.filesService.uploadFile(
        dto.pdf_sri_base64,
        distributorId.toString(),
        'pdf',
        'pdfs-distribuidores',
        'pdf-sri',
      );
    }

    if (dto.nombramiento_base64) {
      nombramiento_key = await this.filesService.uploadFile(
        dto.nombramiento_base64,
        distributorId.toString(),
        'pdf',
        'pdfs-distribuidores',
        'pdf-nombramiento',
      );
    }

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

    return {
      foto_frontal_key,
      foto_posterior_key,
      pdf_sri_key,
      nombramiento_key,
      video_face_key,
    };
  }

  /**
   * Procesa el pago y crea la solicitud de firma en una transacción
   * Maneja tanto pago por balance como por crédito
   */
  private async processSignaturePayment(params: {
    distributorId: string;
    distributorBalance: number;
    hasActiveCredit: boolean;
    isSuccess: boolean;
    priceToCharge: number;
    signatureData: any;
    perfil_firma: string;
    numero_tramite: string;
    dto: any;
  }) {
    const {
      distributorId,
      distributorBalance,
      hasActiveCredit,
      isSuccess,
      priceToCharge,
      signatureData,
      perfil_firma,
      numero_tramite,
      dto,
    } = params;

    const result = await this.prisma.$transaction(async (tx) => {
      let newBalance = distributorBalance;
      let priceCharged = priceToCharge;
      let usedCredit = false;

      if (isSuccess) {
        if (hasActiveCredit) {
          usedCredit = true;
        } else {
          newBalance = distributorBalance - priceToCharge;
          usedCredit = false;

          await tx.distributor.update({
            where: { id: distributorId },
            data: { balance: newBalance },
          });
        }
      }

      const signatureRequest = await tx.signatureRequest.create({
        data: {
          ...signatureData,
          priceCharged,
          paymentMethod: usedCredit
            ? PaymentMethod.CREDIT
            : PaymentMethod.BALANCE,
        },
      });

      if (isSuccess && !usedCredit) {
        await tx.accountMovement.create({
          data: {
            distributorId,
            type: MovementType.EXPENSE,
            detail: `Firma digital - ${priceToCharge / 100} - ${dto.apellidos}`,
            amount: priceCharged,
            balanceAfter: newBalance,
            signatureId: signatureRequest.id,
            note: `Trámite: ${numero_tramite} - Cédula: ${dto.cedula}`,
          },
        });
      }

      return { signatureRequest, newBalance, priceCharged, usedCredit };
    });

    // Si usó crédito, registrar fuera de la transacción
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

    return result;
  }

  /**
   * Wrapper de error handling para los métodos de creación de firma
   */
  private handleSignatureError(error: any): never {
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
      error.message || 'Error interno al crear la solicitud de firma',
    );
  }

  // ========================================
  // MÉTODOS UANATACA
  // ========================================

  /**
   * Autentica con el API de Uanataca y obtiene un JWT token
   * El token dura ~5 minutos, se debe llamar antes de cada solicitud
   * @returns access_token JWT
   */
  private async authenticateUanataca(): Promise<string> {
    const baseUrl = this.config.uanataca.baseUrl;
    const username = this.config.uanataca.username;
    const password = this.config.uanataca.password;

    if (!baseUrl || !username || !password) {
      throw new BadRequestException(
        'Credenciales no configuradas en variables de entorno',
      );
    }

    if (this.config.environment === 'development') {
      this.logger.log('SIMULACION: Autenticación exitosa');
      return 'dev-simulated-token';
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/api/auth/login`,
          { username, password },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000,
          },
        ),
      );

      const { access_token } = response.data;

      if (!access_token) {
        throw new Error('No se recibió access_token del proveedor');
      }

      this.logger.log('Autenticación con proveedor exitosa');
      return access_token;
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          throw new BadRequestException('Credenciales del proveedor inválidas');
        }
        throw new BadRequestException(
          `Error de conexión con el proveedor: ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Llama al API de Uanataca para crear una solicitud de certificado
   * @param payload Datos del certificado
   * @param accessToken Token JWT de autenticación
   * @returns Objeto con éxito/fallo y mensaje
   */
  private async callUanatacaCertificateRequest(
    payload: any,
    accessToken: string,
  ): Promise<{ success: boolean; message: string; providerUuid?: string }> {
    const baseUrl = this.config.uanataca.baseUrl;

    if (this.config.environment === 'development') {
      this.logger.log('SIMULACION: Solicitud de certificado creada');
      const simulatedUuid = `simulated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        success: true,
        message: 'SIMULACION: Certificado creado exitosamente',
        providerUuid: simulatedUuid,
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${baseUrl}/api/certificateRequests`, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 30000,
          validateStatus: (status) => status >= 200 && status < 500,
        }),
      );

      const status = response.status;
      const responseData = response.data;

      // Verificar si hay error por status code
      if (status >= 400) {
        let errorMessage = 'Error al crear certificado';

        if (status === 401 || status === 403) {
          errorMessage = 'Token de autenticación expirado o inválido';
        } else if (status === 400) {
          errorMessage = `Datos inválidos: ${JSON.stringify(responseData) || 'Error de validación'}`;
        } else if (status === 422) {
          errorMessage = `Datos no procesables: ${JSON.stringify(responseData) || 'Error de validación'}`;
        }

        this.logger.error(`Error del proveedor [${status}]: ${errorMessage}`);

        return {
          success: false,
          message: errorMessage,
        };
      }

      // Extraer Location header
      const location =
        response.headers?.location || response.headers?.Location || null;

      // Status 2xx: Verificar si realmente es exitoso
      // Una creación exitosa DEBE tener el Location header
      if (!location) {
        // Si no hay Location header pero hay campos de error en el body
        const errorMessage =
          responseData?.error ||
          responseData?.errorMessage ||
          responseData?.message ||
          'Error desconocido del proveedor';

        this.logger.error(
          `Error en respuesta del proveedor [${status}]: sin Location header. ${JSON.stringify(responseData)}`,
        );

        return {
          success: false,
          message:
            typeof errorMessage === 'string'
              ? errorMessage
              : JSON.stringify(errorMessage),
        };
      }

      // Extraer UUID del Location header
      let providerUuid: string | undefined = undefined;
      const uuidMatch = location.match(/\/([a-f0-9-]{36})$/i);
      providerUuid = uuidMatch ? uuidMatch[1] : undefined;

      return {
        success: true,
        message: 'Certificado creado exitosamente',
        providerUuid,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const errorData = error.response?.data;

        let errorMessage = 'Error al crear certificado';

        if (status === 401 || status === 403) {
          errorMessage = 'Token de autenticación expirado o inválido';
        } else if (status === 400) {
          errorMessage = `Datos inválidos: ${JSON.stringify(errorData) || 'Error de validación'}`;
        } else if (status === 422) {
          errorMessage = `Datos no procesables: ${JSON.stringify(errorData) || 'Error de validación'}`;
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage = 'No se pudo conectar con el servicio de certificados';
        } else if (
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNABORTED'
        ) {
          errorMessage = 'Tiempo de espera agotado al crear certificado';
        }

        this.logger.error(
          `Error del proveedor [${status}]: ${errorMessage}`,
          error.stack,
        );

        return {
          success: false,
          message: errorMessage,
        };
      }

      this.logger.error(
        `Error inesperado al llamar al proveedor: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        message: `Error interno: ${error.message}`,
      };
    }
  }

  /**
   * Formatea la fecha de nacimiento de ISO (yyyy-MM-dd) a formato Uanataca (dd/MM/yyyy)
   */
  private formatDateForUanataca(dateOfBirth: string | Date): string {
    const date = new Date(dateOfBirth);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Convierte el tipo de documento del DTO al formato de Uanataca
   */
  private mapIdentificationTypeUanataca(
    documento: 'CEDULA' | 'PASAPORTE',
  ): string {
    const mapping: Record<string, string> = {
      CEDULA: 'CÉDULA',
      PASAPORTE: 'PASAPORTE',
    };
    return mapping[documento] || 'CÉDULA';
  }
}
