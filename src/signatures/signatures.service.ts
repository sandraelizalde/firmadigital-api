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
import {
  SignatureStatus,
  MovementType,
  PaymentMethod,
  BiometryStatus,
  SignatureType,
} from '@prisma/client';
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
      case tipoPersona === 'NATURAL' && usaToken:
        return this.createSignatureRequestUanatacaTokenNatural(
          distributorId,
          dto,
          video_face,
        );

      case tipoPersona === 'NATURAL' && documento === 'PASAPORTE':
        return this.createSignatureRequestUanatacaNatural(
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
        foto_frontal: dto.foto_frontal,
        foto_posterior: dto.foto_posterior,
        tipo_envio: 'EMAIL',
      };

      const providerResponse = await this.callSignatureProviderEnext(
        providerPayload,
        this.config.signProvider.baseUrlNatural,
        type,
      );

      // 5. Determinar estado — todas quedan en PENDING; el cron de biometría actualiza
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
          selfie: files.selfie_key || null,
          ruc: dto.ruc || null,
          razon_social: dto.razon_social?.toUpperCase() || null,
          rep_legal: dto.rep_legal?.toUpperCase() || null,
          cargo: dto.cargo?.toUpperCase() || null,
          nombramiento: files.nombramiento_key || null,
          pdf_sri: files.pdf_sri_key || null,
          tipo_envio: 'EMAIL',
          signatureType: SignatureType.NATURAL_CEDULA,
          distributorId,
          status,
          providerCode: providerResponse.token_biometria,
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
        foto_frontal: dto.foto_frontal,
        foto_posterior: dto.foto_posterior,
        tipo_envio: 'EMAIL',
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
          selfie: files.selfie_key || null,
          ruc: dto.ruc || null,
          razon_social: dto.razon_social?.toUpperCase() || null,
          rep_legal: dto.rep_legal?.toUpperCase() || null,
          cargo: dto.cargo?.toUpperCase() || null,
          nombramiento: files.nombramiento_key || null,
          pdf_sri: files.pdf_sri_key || null,
          tipo_envio: 'EMAIL',
          signatureType: SignatureType.JURIDICA_CEDULA,
          distributorId,
          status,
          providerCode: providerResponse.token_biometria,
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
      this.validateAgeAndVideo(dto.fecha_nacimiento, video_face, 65);
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
      if (!dto.nacionalidad) {
        throw new BadRequestException(
          'La nacionalidad es requerida para este tipo de firma',
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

      // 5. Preparar payload para Uanataca
      const providerPayload: any = {
        identificationType: this.mapIdentificationTypeUanataca(dto.documento),
        identification: identification,
        names: dto.nombres.toUpperCase(),
        lastName1,
        birthDate: this.formatDateForUanataca(dto.fecha_nacimiento),
        nationality: dto.nacionalidad.toUpperCase(),
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
          selfie: files.selfie_key || null,
          ruc: dto.ruc || null,
          razon_social: null,
          rep_legal: null,
          cargo: null,
          nombramiento: null,
          pdf_sri: null,
          tipo_envio: 'EMAIL',
          signatureType: SignatureType.NATURAL_PASAPORTE,
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
   */
  private async createSignatureRequestUanatacaJuridica(
    distributorId: string,
    dto: any,
    video_face?: Express.Multer.File,
  ) {
    // 1. Validaciones iniciales
    this.validateAgeAndVideo(dto.fecha_nacimiento, video_face, 65);
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

    if (!dto.nacionalidad) {
      throw new BadRequestException(
        'La nacionalidad es requerida para este tipo de firma',
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

    // 5. Preparar payload para Uanataca
    const providerPayload: any = {
      identificationType: this.mapIdentificationTypeUanataca(dto.documento),
      identification: identification,
      names: dto.nombres.toUpperCase(),
      lastName1,
      birthDate: this.formatDateForUanataca(dto.fecha_nacimiento),
      nationality: dto.nacionalidad.toUpperCase(),
      sex: dto.sexo.toUpperCase(),
      phoneNumber: dto.celular,
      email: dto.correo,
      province: dto.provincia.toUpperCase(),
      city: dto.ciudad.toUpperCase(),
      address: dto.direccion.toUpperCase(),
      productUuid: perfil_firma,
      // Campos de empresa (jurídica)
      ruc: dto.ruc || '',
      company: dto.razon_social?.toUpperCase() || '',
      position: dto.cargo?.toUpperCase() || '',
      department: 'GERENCIA',
      reason: 'Firma de documentos legales y tributarios',
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
      // Campos del representante legal (manager) - duplicados del titular
      identificationTypeManager: this.mapIdentificationTypeUanataca(
        dto.documento,
      ),
      identificationManager: identification,
      namesManager: dto.nombres.toUpperCase(),
      lastNameManager: dto.apellidos,
      // Campos específicos jurídica (DOCUMENTOS EN PDF)
      rucFile: {
        name: `ruc_${identification}.pdf`,
        type: 'application/pdf',
        base64: dto.pdf_sri_base64 || '',
      },
      appointment: {
        name: `nombramiento_${identification}.pdf`,
        type: 'application/pdf',
        base64: dto.nombramiento_base64 || '',
      },
      acceptanceAppointment: {
        name: `aceptacion_nombramiento_${identification}.pdf`,
        type: 'application/pdf',
        base64: dto.aceptacion_nombramiento_base64 || '',
      },
      constitution: {
        name: `constitucion_${identification}.pdf`,
        type: 'application/pdf',
        base64: dto.constitucion_base64 || '',
      },
      managerIdentification: {
        name: `id_rl_${identification}.jpg`,
        type: 'image/jpeg',
        base64: dto.foto_frontal || '',
      },
      authorization: {
        name: `autorizacion_${identification}.pdf`,
        type: 'application/pdf',
        base64: dto.nombramiento_base64 || '',
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
        selfie: files.selfie_key || null,
        ruc: dto.ruc || '',
        razon_social: dto.razon_social?.toUpperCase() || null,
        rep_legal: dto.rep_legal?.toUpperCase() || null,
        cargo: dto.cargo?.toUpperCase() || null,
        nombramiento: files.nombramiento_key || null,
        pdf_sri: files.pdf_sri_key || null,
        tipo_envio: 'EMAIL',
        signatureType: SignatureType.JURIDICA_PASAPORTE,
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
   * Envía el bloque tokenInfo al proveedor para gestionar el envío del token físico.
   */
  private async createSignatureRequestUanatacaTokenNatural(
    distributorId: string,
    dto: any,
    video_face?: Express.Multer.File,
  ) {
    try {
      // 1. Validaciones iniciales
      this.validateAgeAndVideo(dto.fecha_nacimiento, video_face, 65);
      const distributor = await this.validateDistributor(distributorId);

      if (!dto.sexo) {
        throw new BadRequestException(
          'El sexo es requerido para firma con token',
        );
      }
      if (!dto.selfie) {
        throw new BadRequestException(
          'La selfie es requerida para firma con token',
        );
      }
      if (!dto.nacionalidad) {
        throw new BadRequestException(
          'La nacionalidad es requerida para firma con token',
        );
      }
      if (!dto.token_info) {
        throw new BadRequestException(
          'La información de envío del token (token_info) es requerida',
        );
      }

      const tokenInfo = dto.token_info;

      this.validateTokenInfo(tokenInfo);

      const identification = dto.numero_identificacion;

      // Duplicar foto_frontal si no viene foto_posterior (caso pasaporte)
      if (!dto.foto_posterior) {
        dto.foto_posterior = dto.foto_frontal;
      }

      // 2. Obtener plan, perfil (productUuid) y precio
      const {
        planPrice,
        perfil_firma,
        priceToCharge: planPrice_,
      } = await this.getSignaturePlanPrice(
        distributorId,
        dto.plan_id,
        'perfilNaturalTokenUanataca',
        'PN con token',
      );

      // 2b. Calcular tarifa adicional de envío del token físico
      const deliveryFee = this.calculateTokenDeliveryFee(
        tokenInfo.shippingType,
      );
      const priceToCharge = planPrice_ + deliveryFee;

      // 3. Validar capacidad de pago (precio plan + envío)
      const { hasActiveCredit } = await this.validatePaymentCapability(
        distributorId,
        distributor.balance,
        priceToCharge,
      );

      const numero_tramite = this.generateNumeroTramite();

      // 4. Autenticarse con Uanataca
      const accessToken = await this.authenticateUanataca();

      // Separar apellidos
      const apellidosParts = dto.apellidos.toUpperCase().split(' ');
      const lastName1 = apellidosParts[0] || '';

      // 5. Preparar payload para Uanataca (igual que archivo + tokenInfo)
      const providerPayload: any = {
        identificationType: this.mapIdentificationTypeUanataca(dto.documento),
        identification: identification,
        names: dto.nombres.toUpperCase(),
        lastName1,
        birthDate: this.formatDateForUanataca(dto.fecha_nacimiento),
        nationality: dto.nacionalidad.toUpperCase(),
        sex: dto.sexo.toUpperCase(),
        phoneNumber: dto.celular,
        ...(dto.codigo_dactilar && { fingerprintCode: dto.codigo_dactilar }),
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
        tokenInfo: this.buildTokenInfoPayload(tokenInfo),
      };

      // Agregar video si existe (mayores de 65)
      if (video_face) {
        const videoExtension = this.getFileExtension(video_face.mimetype);
        const videoBase64 = video_face.buffer.toString('base64');
        providerPayload.seniorVideo = {
          name: `video_${identification}.${videoExtension}`,
          type: video_face.mimetype,
          base64: videoBase64,
        };
      }

      if (dto.ruc) {
        providerPayload.ruc = dto.ruc;
      }

      // 6. Llamar al proveedor Uanataca
      const providerResponse = await this.callUanatacaCertificateRequest(
        providerPayload,
        accessToken,
      );

      const isSuccess = providerResponse.success;
      const status: SignatureStatus = isSuccess
        ? SignatureStatus.PENDING
        : SignatureStatus.FAILED;

      // 7. Subir archivos al storage
      const files = await this.uploadSignatureFiles(
        distributorId,
        dto,
        video_face,
      );

      // 8. Transacción: pago + firma + TokenInfo
      const result = await this.processSignaturePayment({
        distributorId,
        distributorBalance: distributor.balance,
        hasActiveCredit,
        isSuccess,
        priceToCharge,
        perfil_firma,
        numero_tramite,
        dto,
        tokenInfo,
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
          selfie: files.selfie_key || null,
          ruc: dto.ruc || null,
          razon_social: null,
          rep_legal: null,
          cargo: null,
          nombramiento: null,
          pdf_sri: null,
          tipo_envio: 'EMAIL',
          signatureType: SignatureType.NATURAL_TOKEN,
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
   * Crea firma digital UANATACA TOKEN para persona JURIDICA
   * Envía el bloque tokenInfo al proveedor para gestionar el envío del token físico.
   */
  private async createSignatureRequestUanatacaTokenJuridica(
    distributorId: string,
    dto: any,
    video_face?: Express.Multer.File,
  ) {
    try {
      // 1. Validaciones iniciales
      this.validateAgeAndVideo(dto.fecha_nacimiento, video_face, 65);
      const distributor = await this.validateDistributor(distributorId);

      if (!dto.constitucion_base64) {
        throw new BadRequestException(
          'La escritura de constitución es requerida para firma jurídica con token',
        );
      }
      if (!dto.aceptacion_nombramiento_base64) {
        throw new BadRequestException(
          'La aceptación de nombramiento es requerida para firma jurídica con token',
        );
      }
      if (!dto.nacionalidad) {
        throw new BadRequestException(
          'La nacionalidad es requerida para firma jurídica con token',
        );
      }
      if (!dto.token_info) {
        throw new BadRequestException(
          'La información de envío del token (token_info) es requerida',
        );
      }

      const tokenInfo = dto.token_info;

      this.validateTokenInfo(tokenInfo);

      const identification = dto.numero_identificacion;

      if (!dto.foto_posterior) {
        dto.foto_posterior = dto.foto_frontal;
      }

      // 2. Obtener plan, perfil y precio
      const {
        planPrice,
        perfil_firma,
        priceToCharge: planPrice_,
      } = await this.getSignaturePlanPrice(
        distributorId,
        dto.plan_id,
        'perfilJuridicoTokenUanataca',
        'PJ con token',
      );

      // 2b. Calcular tarifa adicional de envío del token físico
      const deliveryFee = this.calculateTokenDeliveryFee(
        tokenInfo.shippingType,
      );
      const priceToCharge = planPrice_ + deliveryFee;

      // 3. Validar capacidad de pago (precio plan + envío)
      const { hasActiveCredit } = await this.validatePaymentCapability(
        distributorId,
        distributor.balance,
        priceToCharge,
      );

      const numero_tramite = this.generateNumeroTramite();

      // 4. Autenticarse con Uanataca
      const accessToken = await this.authenticateUanataca();

      // Separar apellidos
      const apellidosParts = dto.apellidos.toUpperCase().split(' ');
      const lastName1 = apellidosParts[0] || '';

      // 5. Payload para Uanataca (jurídica + tokenInfo)
      const providerPayload: any = {
        identificationType: this.mapIdentificationTypeUanataca(dto.documento),
        identification: identification,
        names: dto.nombres.toUpperCase(),
        lastName1,
        birthDate: this.formatDateForUanataca(dto.fecha_nacimiento),
        nationality: dto.nacionalidad.toUpperCase(),
        sex: dto.sexo?.toUpperCase() || 'HOMBRE',
        phoneNumber: dto.celular,
        email: dto.correo,
        fingerprintCode: dto.codigo_dactilar,
        province: dto.provincia.toUpperCase(),
        city: dto.ciudad.toUpperCase(),
        address: dto.direccion.toUpperCase(),
        productUuid: perfil_firma,
        ruc: dto.ruc || '',
        company: dto.razon_social?.toUpperCase() || '',
        position: dto.cargo?.toUpperCase() || '',
        department: 'GERENCIA',
        reason: 'Firma de documentos legales y tributarios',
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
        identificationTypeManager: this.mapIdentificationTypeUanataca(
          dto.documento,
        ),
        identificationManager: identification,
        namesManager: dto.nombres.toUpperCase(),
        lastNameManager: dto.apellidos.toUpperCase(),
        rucFile: {
          name: `ruc_${identification}.pdf`,
          type: 'application/pdf',
          base64: dto.pdf_sri_base64 || '',
        },
        appointment: {
          name: `nombramiento_${identification}.pdf`,
          type: 'application/pdf',
          base64: dto.nombramiento_base64 || '',
        },
        acceptanceAppointment: {
          name: `aceptacion_nombramiento_${identification}.pdf`,
          type: 'application/pdf',
          base64: dto.aceptacion_nombramiento_base64 || '',
        },
        constitution: {
          name: `constitucion_${identification}.pdf`,
          type: 'application/pdf',
          base64: dto.constitucion_base64 || '',
        },
        managerIdentification: {
          name: `id_rl_${identification}.jpg`,
          type: 'image/jpeg',
          base64: dto.foto_frontal || '',
        },
        authorization: {
          name: `autorizacion_${identification}.pdf`,
          type: 'application/pdf',
          base64: dto.nombramiento_base64 || '',
        },
        tokenInfo: this.buildTokenInfoPayload(tokenInfo),
      };

      if (video_face) {
        const videoExtension = this.getFileExtension(video_face.mimetype);
        const videoBase64 = video_face.buffer.toString('base64');
        providerPayload.seniorVideo = {
          name: `video_${identification}.${videoExtension}`,
          type: video_face.mimetype,
          base64: videoBase64,
        };
      }

      // 6. Llamar al proveedor
      const providerResponse = await this.callUanatacaCertificateRequest(
        providerPayload,
        accessToken,
      );

      const isSuccess = providerResponse.success;
      const status: SignatureStatus = isSuccess
        ? SignatureStatus.PENDING
        : SignatureStatus.FAILED;

      // 7. Subir archivos
      const files = await this.uploadSignatureFiles(
        distributorId,
        dto,
        video_face,
      );

      // 8. Transacción: pago + firma + TokenInfo
      const result = await this.processSignaturePayment({
        distributorId,
        distributorBalance: distributor.balance,
        hasActiveCredit,
        isSuccess,
        priceToCharge,
        perfil_firma,
        numero_tramite,
        dto,
        tokenInfo,
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
          selfie: files.selfie_key || null,
          ruc: dto.ruc || '',
          razon_social: dto.razon_social?.toUpperCase() || null,
          rep_legal: dto.rep_legal?.toUpperCase() || null,
          cargo: dto.cargo?.toUpperCase() || null,
          nombramiento: files.nombramiento_key || null,
          pdf_sri: files.pdf_sri_key || null,
          tipo_envio: 'EMAIL',
          signatureType: SignatureType.JURIDICA_TOKEN,
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

  // ----------------------------------------
  // HELPERS PARA TOKEN INFO
  // ----------------------------------------

  /**
   * Resuelve el shippingTypeUuid y deliveryMethod a partir del ShippingType enum.
   * Centraliza los UUIDs del proveedor Uanataca para que no se expongan al frontend.
   */
  private resolveShippingConfig(shippingType: string): {
    shippingTypeUuid: string;
    deliveryMethod: 'PICKUP' | 'DELIVERY';
  } {
    const uuids = this.config.uanatacaToken.shippingUuids;
    const configs: Record<
      string,
      { shippingTypeUuid: string; deliveryMethod: 'PICKUP' | 'DELIVERY' }
    > = {
      RETIRO_OFICINA: {
        shippingTypeUuid: uuids.retiroOficina,
        deliveryMethod: 'PICKUP',
      },
      ENVIO_ECUADOR_CONTINENTAL: {
        shippingTypeUuid: uuids.envioEcuadorContinental,
        deliveryMethod: 'DELIVERY',
      },
      ENVIO_GALAPAGOS: {
        shippingTypeUuid: uuids.envioGalapagos,
        deliveryMethod: 'DELIVERY',
      },
    };

    const config = configs[shippingType];
    if (!config) {
      throw new BadRequestException(
        `Tipo de envío inválido: ${shippingType}. Valores permitidos: RETIRO_OFICINA, ENVIO_ECUADOR_CONTINENTAL, ENVIO_GALAPAGOS`,
      );
    }
    return config;
  }

  /**
   * Calcula el costo adicional de envío del token físico en centavos.
   * - RETIRO_OFICINA:             tarifa fija (sin IVA)
   * - ENVIO_ECUADOR_CONTINENTAL:  tarifa base + IVA
   * - ENVIO_GALAPAGOS:            tarifa base + IVA
   */
  private calculateTokenDeliveryFee(shippingType: string): number {
    const fees = this.config.uanatacaToken.deliveryFees;
    const ivaRate = fees.ivaRate;
    // El token siempre cuesta $7 (700 centavos)
    const tokenCents = fees.retiroOficinaCents;

    switch (shippingType) {
      case 'RETIRO_OFICINA':
        // Solo el token ($7), sin costo adicional de envío
        return tokenCents;

      case 'ENVIO_ECUADOR_CONTINENTAL':
        // Token ($7) + envío con IVA ($4.00 * 1.15 = $4.60) = $11.60
        return (
          tokenCents +
          Math.round(fees.envioEcuadorContinentalCents * (1 + ivaRate))
        );

      case 'ENVIO_GALAPAGOS':
        // Token ($7) + envío con IVA
        return (
          tokenCents + Math.round(fees.envioGalapagosCents * (1 + ivaRate))
        );

      default:
        throw new BadRequestException(
          `Tipo de envío inválido para calcular tarifa: ${shippingType}`,
        );
    }
  }

  /**
   * Valida los campos requeridos de tokenInfo según el deliveryMethod
   */
  private validateTokenInfo(tokenInfo: any): void {
    if (!tokenInfo.shippingType) {
      throw new BadRequestException(
        'El campo shippingType es requerido en token_info. Valores: RETIRO_OFICINA, ENVIO_ECUADOR_CONTINENTAL, ENVIO_GALAPAGOS',
      );
    }
    if (!tokenInfo.contactName) {
      throw new BadRequestException('tokenInfo.contactName es requerido');
    }
    if (!tokenInfo.contactPhone) {
      throw new BadRequestException('tokenInfo.contactPhone es requerido');
    }

    const { deliveryMethod } = this.resolveShippingConfig(
      tokenInfo.shippingType,
    );

    if (deliveryMethod === 'DELIVERY') {
      const required = [
        'province',
        'city',
        'mainStreet',
        'houseNumber',
        'recipientIdentification',
        'recipientName',
      ] as const;
      for (const field of required) {
        if (!tokenInfo[field]) {
          throw new BadRequestException(
            `tokenInfo.${field} es requerido para envío a domicilio`,
          );
        }
      }
    }
  }

  /**
   * Construye el objeto tokenInfo que se envía al proveedor Uanataca.
   * Incluye solo los campos relevantes según el deliveryMethod.
   */
  private buildTokenInfoPayload(tokenInfo: any): Record<string, any> {
    const { shippingTypeUuid, deliveryMethod } = this.resolveShippingConfig(
      tokenInfo.shippingType,
    );

    const base: Record<string, any> = {
      shippingTypeUuid,
      deliveryMethod,
      contactName: tokenInfo.contactName.toUpperCase(),
      contactPhone: tokenInfo.contactPhone,
    };

    if (deliveryMethod === 'PICKUP') {
      base.office = 'QUITO';
    } else {
      // DELIVERY — aplica tanto para Ecuador continental como Galápagos
      base.province = tokenInfo.province.toUpperCase();
      base.city = tokenInfo.city.toUpperCase();
      base.mainStreet = tokenInfo.mainStreet.toUpperCase();
      base.houseNumber = tokenInfo.houseNumber.toUpperCase();
      if (tokenInfo.secondaryStreet) {
        base.secondaryStreet = tokenInfo.secondaryStreet.toUpperCase();
      }
      if (tokenInfo.reference) {
        base.reference = tokenInfo.reference.toUpperCase();
      }
      base.recipientIdentification = tokenInfo.recipientIdentification;
      base.recipientName = tokenInfo.recipientName.toUpperCase();
    }

    return base;
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
  ): Promise<{
    codigo: number;
    mensaje: string;
    token_biometria: string | null;
  }> {
    try {
      if (!providerUrl) {
        throw new Error(
          'URL del proveedor de firma no configurada en variables de entorno',
        );
      }

      // Usar credenciales de biometría para jurídicas, normales para naturales
      const authUsername = this.config.signProvider.authUsernameBiometria;
      const authPassword = this.config.signProvider.authPasswordBiometria;

      const basicAuth = Buffer.from(`${authUsername}:${authPassword}`).toString(
        'base64',
      );

      let response;

      if (this.config.environment === 'development') {
        response = {
          data: {
            codigo: 1,
            mensaje: 'SIMULACION Firma creada exitosamente',
            token_biometria: `sim-token-${Date.now()}`,
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

      const { codigo, mensaje, token_biometria } = response.data;

      if (typeof codigo === 'undefined' || typeof mensaje === 'undefined') {
        return {
          codigo: 0,
          mensaje: 'Formato de respuesta inválido del proveedor',
          token_biometria: null,
        };
      }

      return {
        codigo: Number(codigo),
        mensaje: String(mensaje),
        token_biometria: token_biometria ? String(token_biometria) : null,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.data?.codigo !== undefined) {
          const { codigo, mensaje, token_biometria } = error.response.data;

          return {
            codigo: Number(codigo),
            mensaje: String(mensaje || 'Error desconocido del proveedor'),
            token_biometria: token_biometria ? String(token_biometria) : null,
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
          token_biometria: null,
        };
      }

      this.logger.error(
        `Error inesperado al llamar al proveedor de firma: ${error.message}`,
        error.stack,
      );

      return {
        codigo: 0,
        mensaje: `Error interno: ${error.message}`,
        token_biometria: null,
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
    status?: string,
    personType?: string,
    startDate?: string,
    endDate?: string,
    search?: string,
  ): Promise<PaginatedSignatureListResponseDto> {
    const skip = (page - 1) * limit;

    // Construir condiciones de filtrado
    const where: any = { distributorId };

    // Filtro por estado
    if (status) {
      where.status = status;
    }

    // Filtro por tipo de persona
    if (personType) {
      if (personType === 'NATURAL') {
        where.razon_social = null;
      } else if (personType === 'JURIDICA') {
        where.razon_social = { not: null };
      }
    }

    // Filtro por rango de fechas (zona horaria de Ecuador: UTC-5)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(`${startDate}T00:00:00-05:00`);
      }
      if (endDate) {
        where.createdAt.lte = new Date(`${endDate}T23:59:59.999-05:00`);
      }
    }

    // Filtro por identificacion
    if (search) {
      where.OR = [
        { cedula: { contains: search } },
        { ruc: { contains: search } },
      ];
    }

    // Obtener el total de registros
    const total = await this.prisma.signatureRequest.count({
      where,
    });

    // Obtener las solicitudes paginadas con relación al plan
    const signatureRequests = await this.prisma.signatureRequest.findMany({
      where,
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
        biometryStatus: request.biometryStatus,
        signatureType: request.signatureType,
        providerCode: request.providerCode,
        providerMessage: request.providerMessage,
        durationType: plan ? plan.durationType : null,
        duration: plan ? plan.duration : null,
        expiredDays,
        priceCharged: request.priceCharged,
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
   * (Admin) Reenvía el link de biometría Enext al correo/celular registrado.
   * Llama a api_generar_link_biometria.php sin solo_generar para que Enext
   * envíe el link por correo y WhatsApp automáticamente.
   * Actualiza providerCode con el nuevo token_biometria retornado.
   */
  async resendEnextBiometricLink(signatureId: string): Promise<{
    success: boolean;
    message: string;
    newToken: string;
    link: string;
  }> {
    const generarLinkUrl = this.config.signProvider.generarLinkBiometriaUrl;
    if (!generarLinkUrl) {
      throw new BadRequestException(
        'URL de generación de link biométrico Enext no configurada',
      );
    }

    const signature = await this.prisma.signatureRequest.findUnique({
      where: { id: signatureId },
      select: {
        id: true,
        provider: true,
        providerCode: true,
        correo: true,
        status: true,
      },
    });

    if (!signature) {
      throw new BadRequestException('Firma no encontrada');
    }
    if (signature.provider !== 'ENEXT') {
      throw new BadRequestException(
        'Esta operación solo aplica para firmas ENEXT',
      );
    }
    if (!signature.providerCode) {
      throw new BadRequestException(
        'La firma no tiene token de biometría registrado',
      );
    }

    let responseData: any;

    if (this.config.environment === 'development') {
      // Simulación en desarrollo
      responseData = {
        token: `sim-token-resend-${Date.now()}`,
        link: `https://enext.online/biometria.php?token=sim-token-resend-${Date.now()}`,
        correo: signature.correo,
        soloGenerar: false,
      };
      this.logger.log(
        `[Biometría] SIMULACIÓN reenvío link para firma ${signatureId}`,
      );
    } else {
      try {
        const body = new URLSearchParams({
          token_actual: signature.providerCode,
          correo: signature.correo,
        }).toString();

        const response = await firstValueFrom(
          this.httpService.post(generarLinkUrl, body, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000,
          }),
        );

        if (!response.data?.success || !response.data?.data?.token) {
          throw new BadRequestException(
            response.data?.message ||
              'El proveedor no pudo generar el link de biometría',
          );
        }

        responseData = response.data.data;
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        this.logger.error(
          `[Biometría] Error al reenviar link de firma ${signatureId}: ${error.message}`,
        );
        throw new BadRequestException(
          `Error al comunicarse con el proveedor: ${error.message}`,
        );
      }
    }

    // Actualizar providerCode con el nuevo token
    await this.prisma.signatureRequest.update({
      where: { id: signatureId },
      data: { providerCode: responseData.token },
    });

    this.logger.log(
      `[Biometría] Link reenviado para firma ${signatureId}. Nuevo token guardado.`,
    );

    return {
      success: true,
      message: 'Link de biometría generado y enviado por correo y WhatsApp',
      newToken: responseData.token,
      link: responseData.link,
    };
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
        tokenInfo: true,
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

      let video_face_url: string | null = null;
      let pdf_sri_url: string | null = null;
      let nombramiento_url: string | null = null;
      let selfie_url: string | null = null;

      if (signatureRequest.video_face) {
        video_face_url = await this.filesService.getFileUrl(
          signatureRequest.video_face,
          'fotos-cedulas',
        );
      }

      if (signatureRequest.selfie) {
        selfie_url = await this.filesService.getFileUrl(
          signatureRequest.selfie,
          'fotos-cedulas',
        );
      }

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
        selfie_url,
        video_face_url,
        pdf_sri_url: pdf_sri_url ?? null,
        nombramiento_url: nombramiento_url ?? null,
        razon_social: signatureRequest.razon_social,
        rep_legal: signatureRequest.rep_legal,
        cargo: signatureRequest.cargo,
        ruc: signatureRequest.ruc,
        tipo_envio: signatureRequest.tipo_envio,
        status: signatureRequest.status,
        biometryStatus: signatureRequest.biometryStatus,
        signatureType: signatureRequest.signatureType,
        providerCode: signatureRequest.providerCode,
        providerMessage: signatureRequest.providerMessage,
        annulledNote: signatureRequest.annulledNote,
        activeNotification: signatureRequest.activeNotification,
        expirationDate,
        duration,
        durationType,
        priceCharged: signatureRequest.priceCharged,
        paymentMethod: signatureRequest.paymentMethod,
        tokenInfo: signatureRequest.tokenInfo ?? null,
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
          biometryStatus: request.biometryStatus,
          signatureType: request.signatureType,
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
        tokenInfo: true,
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

      let video_url: string | null = null;
      let pdf_sri_url: string | null = null;
      let nombramiento_url: string | null = null;
      let selfie_url: string | null = null;

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
      if (signatureRequest.video_face) {
        video_url = await this.filesService.getFileUrl(
          signatureRequest.video_face,
          'fotos-cedulas',
        );
      }

      if (signatureRequest.selfie) {
        selfie_url = await this.filesService.getFileUrl(
          signatureRequest.selfie,
          'fotos-cedulas',
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
        selfie_url,
        video_face: video_url,
        pdf_sri_url,
        nombramiento_url,
        razon_social: signatureRequest.razon_social,
        rep_legal: signatureRequest.rep_legal,
        cargo: signatureRequest.cargo,
        ruc: signatureRequest.ruc,
        tipo_envio: signatureRequest.tipo_envio,
        status: signatureRequest.status,
        biometryStatus: signatureRequest.biometryStatus,
        signatureType: signatureRequest.signatureType,
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
        tokenInfo: signatureRequest.tokenInfo ?? null,
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
   * Procesa el reembolso del dinero al distribuidor cuando una firma es rechazada automáticamente.
   * Reutiliza la misma lógica financiera que annulSignatureRequest pero sin cambiar el estado de la firma.
   * @param signatureId ID de la solicitud de firma rechazada
   * @param reason Motivo del rechazo para el registro del movimiento
   */
  private async processRefundForSignature(
    signatureId: string,
    reason: string,
  ): Promise<void> {
    const signatureRequest = await this.prisma.signatureRequest.findUnique({
      where: { id: signatureId },
      include: { distributor: true },
    });

    if (!signatureRequest || !signatureRequest.distributorId) {
      this.logger.warn(
        `[Reembolso] Firma ${signatureId} no encontrada o sin distribuidor asociado`,
      );
      return;
    }

    // Determinar si fue pagada por crédito
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
            distributorId: signatureRequest.distributorId,
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
          distributorId: signatureRequest.distributorId,
          cutoffDate: cutoffDate,
        },
      });

      if (targetCutoff) {
        wasAlreadyPaidInCutoff = targetCutoff.amountPaid >= refundAmount;
      }
    }

    if (refundAmount <= 0) {
      this.logger.warn(
        `[Reembolso] Firma ${signatureId} rechazada con monto de reembolso 0, no se procesa`,
      );
      return;
    }

    await this.prisma.$transaction(
      async (tx) => {
        const distributor = await tx.distributor.findUnique({
          where: { id: signatureRequest.distributorId! },
          select: { balance: true },
        });

        let newBalance = distributor?.balance || 0;

        if (isPaidViaCredit && targetCutoff) {
          let signatures: string[] = [];
          try {
            signatures = JSON.parse(targetCutoff.signaturesDetails || '[]');
          } catch {
            signatures = [];
          }

          signatures = signatures.filter((id) => id !== signatureId);

          let newAmountUsed = Math.max(
            0,
            targetCutoff.amountUsed - refundAmount,
          );
          let newAmountPaid = targetCutoff.amountPaid;

          if (wasAlreadyPaidInCutoff) {
            newAmountPaid = Math.max(0, targetCutoff.amountPaid - refundAmount);
            newBalance += refundAmount;

            await tx.distributor.update({
              where: { id: signatureRequest.distributorId! },
              data: { balance: newBalance },
            });

            await tx.accountMovement.create({
              data: {
                distributorId: signatureRequest.distributorId!,
                type: MovementType.INCOME,
                detail: `Reembolso por firma rechazada - Corte del ${new Date(targetCutoff.cutoffDate).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil', day: '2-digit', month: '2-digit', year: 'numeric' })}`,
                amount: refundAmount,
                balanceAfter: newBalance,
                signatureId: signatureRequest.id,
                note: reason,
              },
            });
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
        } else {
          // Reembolso directo al balance
          newBalance += refundAmount;

          await tx.distributor.update({
            where: { id: signatureRequest.distributorId! },
            data: { balance: newBalance },
          });

          await tx.accountMovement.create({
            data: {
              distributorId: signatureRequest.distributorId!,
              type: MovementType.INCOME,
              detail: `Reembolso por firma rechazada - ${signatureRequest.apellidos || signatureRequest.razon_social}`,
              amount: refundAmount,
              balanceAfter: newBalance,
              signatureId: signatureRequest.id,
              note: reason,
            },
          });
        }
      },
      { timeout: 300_000 },
    );

    if (isPaidViaCredit && targetCutoff) {
      try {
        await this.creditsService.checkAndUnblockAfterAnnulment(
          signatureRequest.distributorId!,
          targetCutoff.creditId,
        );
      } catch (error) {
        this.logger.error(
          `[Reembolso] Error al verificar desbloqueo tras rechazo de firma ${signatureId}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `[Reembolso] Reembolso de $${(refundAmount / 100).toFixed(2)} procesado para firma rechazada ${signatureId}`,
    );
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

    const result = await this.prisma.$transaction(
      async (tx) => {
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

            if (wasAlreadyPaidInCutoff) {
              this.logger.log(
                `Firma anulada ya había sido cobrada ($${(refundAmount / 100).toFixed(2)}). Se reembolsa al balance.`,
              );

              newAmountPaid = Math.max(
                0,
                targetCutoff.amountPaid - refundAmount,
              );

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
                  detail: `Reembolso por anulación de firma - Corte del ${new Date(targetCutoff.cutoffDate).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil', day: '2-digit', month: '2-digit', year: 'numeric' })})`,
                  amount: refundAmount,
                  balanceAfter: newBalance,
                  signatureId: signatureRequest.id,
                  adminName: adminName,
                  note: note || `Anulación de firma`,
                },
              });
              movementId = movement.id;
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
      },
      { timeout: 300_000 },
    );

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
    minAgeForVideo: number = 80,
  ): void {
    const age = this.calculateAge(dateOfBirth);

    // Validar que el video sea obligatorio según edad mínima del proveedor
    if (age >= minAgeForVideo && !video_face) {
      throw new BadRequestException(
        `El video facial es obligatorio para personas de ${minAgeForVideo} años o más`,
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
   * Verifica si la promoción está activa por fechas y retorna el precio promo.
   * Retorna null si no hay promo o si la promo está fuera del rango de fechas.
   */
  private getActivePromoPrice(planPrice: {
    customPricePromo: number | null;
    promoStartDate: Date | null;
    promoEndDate: Date | null;
  }): number | null {
    if (!planPrice.customPricePromo) return null;

    const now = new Date();

    // Si tiene fecha de inicio y aún no ha comenzado
    if (planPrice.promoStartDate && now < planPrice.promoStartDate) return null;

    // Si tiene fecha de fin y ya expiró
    if (planPrice.promoEndDate && now > planPrice.promoEndDate) return null;

    return planPrice.customPricePromo;
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

    const priceToCharge =
      this.getActivePromoPrice(planPrice) ?? planPrice.customPrice;

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
    if (this.config.environment === 'development') {
      this.logger.log('SIMULACION: Subida de archivos omitida en desarrollo');
      return {
        foto_frontal_key: 'dev-foto-frontal.jpg',
        foto_posterior_key: 'dev-foto-posterior.jpg',
        selfie_key: dto.selfie ? 'dev-selfie.jpg' : undefined,
        pdf_sri_key: dto.pdf_sri_base64 ? 'dev-pdf-sri.pdf' : undefined,
        nombramiento_key: dto.nombramiento_base64
          ? 'dev-nombramiento.pdf'
          : undefined,
        video_face_key: video_face ? 'dev-video-face.mp4' : undefined,
      };
    }

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
    let selfie_key: string | undefined;

    if (dto.selfie) {
      selfie_key = await this.filesService.uploadFile(
        dto.selfie,
        distributorId.toString(),
        'jpg',
        'fotos-distribuidores',
        'fotos-cedulas',
      );
    }

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
      selfie_key,
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
    tokenInfo?: any; // Datos de envío del token físico (solo firmas Uanataca token)
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
      tokenInfo,
    } = params;

    const result = await this.prisma.$transaction(
      async (tx) => {
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
            biometryStatus: BiometryStatus.PENDING,
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

        // Guardar TokenInfo dentro de la transacción (firmas Uanataca con token físico)
        if (tokenInfo) {
          const { shippingTypeUuid, deliveryMethod } =
            this.resolveShippingConfig(tokenInfo.shippingType);
          await tx.tokenInfo.create({
            data: {
              signatureRequestId: signatureRequest.id,
              shippingTypeUuid,
              deliveryMethod,
              office: deliveryMethod === 'PICKUP' ? 'QUITO' : null,
              contactName: tokenInfo.contactName.toUpperCase(),
              contactPhone: tokenInfo.contactPhone,
              province: tokenInfo.province?.toUpperCase() ?? null,
              city: tokenInfo.city?.toUpperCase() ?? null,
              mainStreet: tokenInfo.mainStreet?.toUpperCase() ?? null,
              houseNumber: tokenInfo.houseNumber?.toUpperCase() ?? null,
              secondaryStreet: tokenInfo.secondaryStreet?.toUpperCase() ?? null,
              reference: tokenInfo.reference?.toUpperCase() ?? null,
              recipientIdentification:
                tokenInfo.recipientIdentification ?? null,
              recipientName: tokenInfo.recipientName?.toUpperCase() ?? null,
            },
          });
        }

        return { signatureRequest, newBalance, priceCharged, usedCredit };
      },
      { timeout: 300_000 },
    );

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

    const payloadForLog = this.truncateBase64InObject(payload, 10);
    this.logger.log(
      `Enviando solicitud a Uanataca: ${JSON.stringify(payloadForLog, null, 2)}`,
    );

    if (this.config.environment === 'development') {
      this.logger.log('SIMULACION: Solicitud de certificado creada');
      // Imprimir payload con base64 truncados

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

      if (!location) {
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
        message: 'Proceso ingresado para revisión correctamente',
        providerUuid,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const errorData = error.response?.data;

        // Loguear respuesta completa para depuración
        console.log(
          'ERROR UANATACA FULL RESPONSE:',
          JSON.stringify(errorData, null, 2),
        );

        let errorMessage = 'Error al crear certificado';

        if (errorData && (errorData.message || errorData.error)) {
          errorMessage = errorData.message || errorData.error;
        } else if (status === 401 || status === 403) {
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

  /**
   * Trunca los valores base64 en un objeto de manera recursiva (para logs)
   * @param obj Objeto a procesar
   * @param maxLength Cantidad de caracteres a mostrar del base64
   */
  private truncateBase64InObject(obj: any, maxLength: number = 10): any {
    if (!obj) return obj;

    if (typeof obj === 'string') {
      // Si parece base64 (más de 100 caracteres), truncar
      if (obj.length > 100) {
        return `${obj.substring(0, maxLength)}...[${obj.length} chars]`;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.truncateBase64InObject(item, maxLength));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Si el campo se llama base64 o contiene base64 en el nombre, truncar
          if (key === 'base64' || key.toLowerCase().includes('base64')) {
            if (typeof obj[key] === 'string' && obj[key].length > maxLength) {
              result[key] =
                `${obj[key].substring(0, maxLength)}...[${obj[key].length} chars]`;
            } else {
              result[key] = obj[key];
            }
          } else {
            result[key] = this.truncateBase64InObject(obj[key], maxLength);
          }
        }
      }
      return result;
    }

    return obj;
  }

  /**
   * Cron cada minuto para verificar el estado de biometría de firmas ENEXT en PENDING.
   * Estados `biometria.estado`:
   *   0  → Pendiente (sin cambios)
   *   1  → Biometría Completa (PN: COMPLETED | PJ: depende de aprobacion.estadoTramite)
   *   2  → Bloqueada / Rechazada
   *   3  → Biometría OK pero falta clave (COMPLETED_MISSING_PASSWORD)
   *  -1  → No disponible / flujo anterior (sin cambios)
   *
   * `aprobacion.estadoTramite` (solo PJ):
   *   0  → En revisión
   *   1  → Completado
   *   2  → Rechazado
   *   3  → Docs aprobados – pendiente biometría
   */
  @Cron('* * * * *', {
    timeZone: 'America/Guayaquil',
  })
  async checkEnextBiometryStatus() {
    if (this.config.environment !== 'production') return;

    const biometriaUrl = this.config.signProvider.biometriaUrl;
    if (!biometriaUrl) {
      this.logger.warn('URL de biometría Enext no configurada');
      return;
    }

    // Buscar firmas ENEXT en PENDING con token_biometria guardado en providerCode
    const pendingSignatures = await this.prisma.signatureRequest.findMany({
      where: {
        provider: 'ENEXT',
        status: SignatureStatus.PENDING,
        providerCode: { not: null },
        biometryStatus: {
          notIn: [BiometryStatus.COMPLETED, BiometryStatus.REJECTED],
        },
      },
      select: { id: true, providerCode: true },
    });

    if (pendingSignatures.length === 0) return;

    for (const signature of pendingSignatures) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(
            biometriaUrl,
            new URLSearchParams({ token: signature.providerCode! }).toString(),
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              timeout: 10000,
            },
          ),
        );

        const data = response.data;

        if (!data?.success || !data?.data?.biometria) {
          this.logger.warn(
            `[Biometría] Respuesta inesperada para firma ${signature.id}: ${JSON.stringify(data)}`,
          );
          continue;
        }

        const { estado, mensaje } = data.data.biometria;
        const estadoNum = Number(estado);
        if (estadoNum === 0 || estadoNum === -1) {
          continue;
        }

        let newBiometryStatus: BiometryStatus | null = null;
        let newSignatureStatus: SignatureStatus | null = null;

        if (estadoNum === 1) {
          // Biometría completa.
          const aprobacion = data.data.aprobacion;

          if (aprobacion !== undefined && aprobacion !== null) {
            const estadoTramite = Number(aprobacion.estadoTramite);

            if (estadoTramite === 1) {
              newBiometryStatus = BiometryStatus.COMPLETED;
              newSignatureStatus = SignatureStatus.COMPLETED;
            } else if (estadoTramite === 2) {
              newBiometryStatus = BiometryStatus.REJECTED;
              newSignatureStatus = SignatureStatus.REJECTED;
            } else if (estadoTramite === 3) {
              newSignatureStatus = SignatureStatus.DOCS_APPROVED;
            } else {
              continue;
            }
          } else {
            newBiometryStatus = BiometryStatus.COMPLETED;
            newSignatureStatus = SignatureStatus.COMPLETED;
          }
        } else if (estadoNum === 2) {
          newBiometryStatus = BiometryStatus.REJECTED;
          newSignatureStatus = SignatureStatus.REJECTED;
        } else if (estadoNum === 3) {
          newBiometryStatus = BiometryStatus.COMPLETED_MISSING_PASSWORD;
        } else {
          continue;
        }

        await this.prisma.signatureRequest.update({
          where: { id: signature.id },
          data: {
            biometryStatus: newBiometryStatus,
            ...(newSignatureStatus && { status: newSignatureStatus }),
          },
        });

        this.logger.log(
          `[Biometría] Firma ${signature.id} actualizada → biometryStatus: ${newBiometryStatus}${newSignatureStatus ? `, status: ${newSignatureStatus}` : ''}`,
        );

        if (newSignatureStatus === SignatureStatus.REJECTED) {
          try {
            await this.processRefundForSignature(
              signature.id,
              'Firma rechazada automáticamente por biometría ENEXT',
            );
          } catch (refundError) {
            this.logger.error(
              `[Biometría] Error al procesar reembolso para firma ${signature.id}: ${refundError.message}`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `[Biometría] Error consultando estado de firma ${signature.id}: ${error.message}`,
        );
      }
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
   * Cron cada 30 minutos para verificar el estado de solicitudes UANATACA en PENDING.
   * Llama a GET /api/certificateRequests?uuid={uuid} con autenticación JWT.
   *
   * Mapeo de estados Uanataca → estados internos:
   *   NEW              → sin cambios (sigue PENDING)
   *   UPDATE_REQUESTED → sin cambios (sigue PENDING)
   *   APPROVED         → SignatureStatus: DOCS_APPROVED
   *   ISSUED           → SignatureStatus: COMPLETED, BiometryStatus: COMPLETED
   *   REJECTED         → SignatureStatus: REJECTED, BiometryStatus: REJECTED
   */
  @Cron('0 */30 * * * *', {
    timeZone: 'America/Guayaquil',
  })
  async checkUanatacaCertificateStatus() {
    if (this.config.environment !== 'production') return;

    const baseUrl = this.config.uanataca.baseUrl;
    if (!baseUrl) {
      this.logger.warn('[Uanataca Cron] URL base de Uanataca no configurada');
      return;
    }

    // Buscar firmas UANATACA en PENDING con UUID guardado en providerCode
    const pendingSignatures = await this.prisma.signatureRequest.findMany({
      where: {
        provider: 'UANATACA',
        status: SignatureStatus.PENDING,
        providerCode: { not: null },
      },
      select: { id: true, providerCode: true },
    });

    if (pendingSignatures.length === 0) return;

    this.logger.log(
      `[Uanataca Cron] Verificando ${pendingSignatures.length} firma(s) pendientes`,
    );

    // Autenticar una sola vez para todas las solicitudes
    let accessToken: string;
    try {
      accessToken = await this.authenticateUanataca();
    } catch (error) {
      this.logger.error(
        `[Uanataca Cron] Error al autenticar con Uanataca: ${error.message}`,
      );
      return;
    }

    for (const signature of pendingSignatures) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(`${baseUrl}/api/certificateRequests`, {
            params: { uuid: signature.providerCode },
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            timeout: 15000,
          }),
        );

        const data = response.data;

        // El estado puede estar en data.status, data.state o data.estado según el proveedor
        const uanatacaStatus: string | undefined =
          data?.status ?? data?.state ?? data?.estado;

        if (!uanatacaStatus) {
          this.logger.warn(
            `[Uanataca Cron] Respuesta sin estado para firma ${signature.id}: ${JSON.stringify(data)}`,
          );
          continue;
        }

        const statusUpper = uanatacaStatus.toUpperCase();

        // Ignorar estados que no implican cambio
        if (statusUpper === 'NEW' || statusUpper === 'UPDATE_REQUESTED') {
          continue;
        }

        let newSignatureStatus: SignatureStatus | null = null;
        let newBiometryStatus: BiometryStatus | null = null;

        switch (statusUpper) {
          case 'APPROVED':
            newSignatureStatus = SignatureStatus.DOCS_APPROVED;
            break;

          case 'ISSUED':
            newSignatureStatus = SignatureStatus.COMPLETED;
            newBiometryStatus = BiometryStatus.COMPLETED;
            break;

          case 'REJECTED':
            newSignatureStatus = SignatureStatus.REJECTED;
            newBiometryStatus = BiometryStatus.REJECTED;
            break;

          default:
            this.logger.warn(
              `[Uanataca Cron] Estado desconocido "${uanatacaStatus}" para firma ${signature.id}`,
            );
            continue;
        }

        await this.prisma.signatureRequest.update({
          where: { id: signature.id },
          data: {
            ...(newSignatureStatus && { status: newSignatureStatus }),
            ...(newBiometryStatus && { biometryStatus: newBiometryStatus }),
          },
        });

        this.logger.log(
          `[Uanataca Cron] Firma ${signature.id} actualizada → status: ${newSignatureStatus}${newBiometryStatus ? `, biometryStatus: ${newBiometryStatus}` : ''}`,
        );

        if (newSignatureStatus === SignatureStatus.REJECTED) {
          try {
            await this.processRefundForSignature(
              signature.id,
              'Firma rechazada',
            );
          } catch (refundError) {
            this.logger.error(
              `[Uanataca Cron] Error al procesar reembolso para firma ${signature.id}: ${refundError.message}`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `[Uanataca Cron] Error consultando estado de firma ${signature.id}: ${error.message}`,
        );
      }
    }
  }
}
