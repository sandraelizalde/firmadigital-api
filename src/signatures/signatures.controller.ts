import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { SignaturesService } from './signatures.service';
import { CreateNaturalSignatureDto } from './dto/create-natural-signature.dto';
import { CreateJuridicalSignatureDto } from './dto/create-juridical-signature.dto';
import { AdminSignatureFilterDto } from './dto/admin-signature-filter.dto';
import { AnnulSignatureDto } from './dto/annul-signature.dto';
import { ApproveSignatureDto } from './dto/approve-signature.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Firmas Digitales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('signatures')
export class SignaturesController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Post('natural')
  @Roles(Role.DISTRIBUTOR)
  @UseInterceptors(FileInterceptor('video_face'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Crear solicitud de firma digital para persona natural',
    description:
      'Permite a un distribuidor crear una solicitud de firma digital para persona natural. Los datos son enviados al proveedor ENEXT. Se valida el balance del distribuidor y se cobra automáticamente si la solicitud es exitosa. El video es opcional pero obligatorio si la persona tiene 80 años o más.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'nombres',
        'apellidos',
        'cedula',
        'codigo_dactilar',
        'correo',
        'provincia',
        'ciudad',
        'parroquia',
        'direccion',
        'celular',
        'foto_frontal',
        'foto_posterior',
        'plan_id',
        'fecha_nacimiento',
      ],
      properties: {
        nombres: { type: 'string', example: 'LUIS XAVIER' },
        apellidos: { type: 'string', example: 'GONZALEZ JIMENEZ' },
        numero_identificacion: { type: 'string', example: '1752549467' },
        codigo_dactilar: { type: 'string', example: 'V43I4444' },
        correo: { type: 'string', example: 'luisg@solucionesnexus.com' },
        provincia: { type: 'string', example: 'PICHINCHA' },
        ciudad: { type: 'string', example: 'QUITO' },
        parroquia: { type: 'string', example: 'IÑAQUITO' },
        direccion: { type: 'string', example: 'QUITUS COLONIAL' },
        celular: { type: 'string', example: '0990602199' },
        foto_frontal: { type: 'string', example: 'base64_string...' },
        foto_posterior: { type: 'string', example: 'base64_string...' },
        plan_id: { type: 'string', example: 'clx123abc456' },
        fecha_nacimiento: { type: 'string', example: '1990-05-15' },
        ruc: { type: 'string', example: '1752549467001' },
        video_face: {
          type: 'string',
          format: 'binary',
          description:
            'Video facial (opcional, obligatorio si edad >= 80 años). Formatos: mp4, mov, avi, webm',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Solicitud de firma creada exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Solicitud enviada correctamente',
        data: {
          id: 'clx1234567890',
          numero_tramite: '17034425678900001',
          perfil_firma: 'PN-001',
          nombres: 'LUIS XAVIER',
          apellidos: 'GONZALEZ JIMENEZ',
          cedula: '1752549467',
          ruc: '1752549467001',
          status: 'COMPLETED',
          providerCode: '1',
          providerMessage: 'Solicitud enviada correctamente',
        },
        balance: 450000,
        priceCharged: 79900,
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Solicitud rechazada por el proveedor (guardada en BD sin cobro)',
    schema: {
      example: {
        success: false,
        message: 'El código dactilar no corresponde a la cédula ingresada',
        data: {
          id: 'clx1234567890',
          numero_tramite: '17034425678900002',
          status: 'REJECTED',
          providerCode: '0',
        },
        balance: 450000,
        priceCharged: 0,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Balance insuficiente, plan no asignado, distribuidor inactivo o video requerido para persona mayor de 80 años',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo para distribuidores' })
  async createNaturalSignature(
    @Request() req,
    @Body() dto: CreateNaturalSignatureDto,
    @UploadedFile() video_face?: Express.Multer.File,
  ) {
    return this.signaturesService.createNaturalSignatureRequest(
      req.user.userId,
      dto,
      video_face,
    );
  }

  @Post('juridica')
  @Roles(Role.DISTRIBUTOR)
  @UseInterceptors(FileInterceptor('video_face'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Crear solicitud de firma digital para persona jurídica',
    description:
      'Permite a un distribuidor crear una solicitud de firma digital para empresa/persona jurídica. Requiere datos adicionales como RUC, razón social, representante legal y nombramiento. Se valida el balance y se cobra automáticamente si es exitosa. El video es opcional pero obligatorio si el representante legal tiene 80 años o más.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'nombres',
        'apellidos',
        'cedula',
        'codigo_dactilar',
        'correo',
        'provincia',
        'ciudad',
        'parroquia',
        'direccion',
        'celular',
        'foto_frontal',
        'foto_posterior',
        'plan_id',
        'fecha_nacimiento',
        'ruc',
        'razon_social',
        'rep_legal',
        'cargo',
        'pdf_sri_base64',
        'nombramiento_base64',
      ],
      properties: {
        nombres: { type: 'string', example: 'LUIS XAVIER' },
        apellidos: { type: 'string', example: 'GONZALEZ JIMENEZ' },
        numero_identificacion: { type: 'string', example: '1752549467' },
        codigo_dactilar: { type: 'string', example: 'V43I4444' },
        correo: { type: 'string', example: 'luisg@solucionesnexus.com' },
        provincia: { type: 'string', example: 'PICHINCHA' },
        ciudad: { type: 'string', example: 'QUITO' },
        parroquia: { type: 'string', example: 'IÑAQUITO' },
        direccion: { type: 'string', example: 'QUITUS COLONIAL' },
        celular: { type: 'string', example: '0990602199' },
        foto_frontal: { type: 'string', example: 'base64_string...' },
        foto_posterior: { type: 'string', example: 'base64_string...' },
        plan_id: { type: 'string', example: 'clx123abc456' },
        fecha_nacimiento: { type: 'string', example: '1990-05-15' },
        ruc: { type: 'string', example: '1752549467001' },
        razon_social: {
          type: 'string',
          example: 'DISTRIBUIDORA GONZALEZ S.A.',
        },
        rep_legal: { type: 'string', example: 'LUIS XAVIER GONZALEZ JIMENEZ' },
        cargo: { type: 'string', example: 'GERENTE GENERAL' },
        pdf_sri_base64: { type: 'string', example: 'base64_string...' },
        nombramiento_base64: { type: 'string', example: 'base64_string...' },
        video_face: {
          type: 'string',
          format: 'binary',
          description:
            'Video facial (opcional, obligatorio si edad >= 80 años). Formatos: mp4, mov, avi, webm',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Solicitud de firma creada exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Solicitud enviada correctamente',
        data: {
          id: 'clx1234567890',
          numero_tramite: '17034425678900001',
          perfil_firma: 'PJ-003',
          nombres: 'LUIS XAVIER',
          apellidos: 'GONZALEZ JIMENEZ',
          cedula: '1752549467',
          ruc: '1752549467001',
          razon_social: 'DISTRIBUIDORA GONZALEZ S.A.',
          rep_legal: 'LUIS XAVIER GONZALEZ JIMENEZ',
          cargo: 'GERENTE GENERAL',
          status: 'COMPLETED',
          providerCode: '1',
          providerMessage: 'Solicitud enviada correctamente',
        },
        balance: 300000,
        priceCharged: 149900,
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Solicitud rechazada por el proveedor (guardada en BD sin cobro)',
    schema: {
      example: {
        success: false,
        message: 'El RUC no es válido',
        data: {
          id: 'clx1234567890',
          numero_tramite: '17034425678900002',
          status: 'REJECTED',
          providerCode: '0',
        },
        balance: 450000,
        priceCharged: 0,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Balance insuficiente, plan no asignado, distribuidor inactivo o video requerido para persona mayor de 80 años',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo para distribuidores' })
  async createJuridicalSignature(
    @Request() req,
    @Body() dto: CreateJuridicalSignatureDto,
    @UploadedFile() video_face?: Express.Multer.File,
  ) {
    return this.signaturesService.createJuridicalSignatureRequest(
      req.user.userId,
      dto,
      video_face,
    );
  }

  @Get('unique')
  @Roles(Role.DISTRIBUTOR)
  @ApiOperation({
    summary: 'Obtener detalle completo de una solicitud de firma por ID',
    description:
      'Retorna los detalles completos de una solicitud de firma específica del distribuidor autenticado, incluyendo todas las fotos y documentos convertidos a Base64 desde Wasabi S3.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Detalle completo de la solicitud de firma con fotos en Base64',
    schema: {
      example: {
        id: 'clx1234567890',
        numero_tramite: 'DIST1703342567890001',
        perfil_firma: '018',
        nombres: 'FERNANDO MATIAS',
        apellidos: 'TURIZO FERNANDEZ',
        cedula: '1752549468',
        correo: 'luisg@solucionesnexus.com',
        codigo_dactilar: 'V43I4444',
        celular: '0990602199',
        provincia: 'PICHINCHA',
        ciudad: 'QUITO',
        parroquia: 'IÑAQUITO',
        direccion: 'QUITUS COLONIAL',
        dateOfBirth: '1990-05-15T00:00:00.000Z',
        foto_frontal_url: 'https://s3.wasabisys.com/...',
        foto_posterior_url: 'https://s3.wasabisys.com/...',
        selfie_url: 'https://s3.wasabisys.com/...',
        video_face_url: null,
        pdf_sri_url: null,
        nombramiento_url: null,
        razon_social: null,
        rep_legal: null,
        cargo: null,
        ruc: null,
        tipo_envio: 'EMAIL',
        status: 'PENDING',
        biometryStatus: 'PENDING',
        signatureType: 'NATURAL_CEDULA',
        providerCode: '200',
        providerMessage: 'Solicitud recibida',
        annulledNote: null,
        activeNotification: true,
        expirationDate: null,
        duration: '1',
        durationType: 'Y',
        priceCharged: 79900,
        paymentMethod: 'BALANCE',
        tokenInfo: null,
        createdAt: '2024-12-23T10:30:00.000Z',
        updatedAt: '2024-12-23T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitud no encontrada o error al obtener las imágenes',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo para distribuidores',
  })
  async getSignatureRequest(@Request() req, @Query('id') id: string) {
    if (!id) {
      throw new BadRequestException('El parámetro id es requerido');
    }
    return this.signaturesService.getSignatureRequest(id, req.user.userId);
  }

  @Get('all')
  @Roles(Role.DISTRIBUTOR)
  @ApiOperation({
    summary: 'Obtener todas las solicitudes de firma del distribuidor',
    description:
      'Retorna todas las solicitudes de firma digital creadas por el distribuidor autenticado, con paginación y filtros opcionales.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'COMPLETED', 'REJECTED', 'FAILED', 'ANNULLED'],
    description: 'Filtrar por estado de la solicitud',
  })
  @ApiQuery({
    name: 'personType',
    required: false,
    enum: ['NATURAL', 'JURIDICA'],
    description: 'Filtrar por tipo de persona',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Fecha de inicio (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Fecha de fin (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Buscar por cédula o RUC',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de solicitudes de firma digital',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo para distribuidores',
  })
  async getAllSignatureRequests(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('personType') personType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.signaturesService.getAllSignatureRequests(
      req.user.userId,
      page || 1,
      limit || 10,
      status,
      personType,
      startDate,
      endDate,
      search,
    );
  }

  @Post('validate-email')
  @Roles(Role.DISTRIBUTOR)
  @ApiOperation({
    summary: 'Validar si un correo electrónico es válido y activo',
    description:
      'Permite a un distribuidor validar si un correo electrónico proporcionado es válido y está activo utilizando un servicio externo de verificación de correos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la validación del correo electrónico',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo para distribuidores' })
  async validateEmail(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('El correo electrónico es requerido');
    }
    return this.signaturesService.verifyEmailBounce(email);
  }

  // ========================
  // ENDPOINTS PARA ADMINISTRADOR
  // ========================

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener todas las solicitudes de firma (Admin)',
    description:
      'Retorna todas las solicitudes de firma digital con información del distribuidor, con filtros y paginación. Solo para administradores.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista paginada de solicitudes de firma digital con info del distribuidor',
    schema: {
      example: {
        data: [
          {
            id: 'clx1234567890',
            numero_tramite: '17034425678900001',
            perfil_firma: 'PN-001',
            nombres: 'LUIS XAVIER',
            apellidos: 'GONZALEZ JIMENEZ',
            cedula: '1752549467',
            correo: 'correo@email.com',
            celular: '0991234567',
            ruc: null,
            razon_social: null,
            status: 'COMPLETED',
            providerCode: '1',
            providerMessage: 'Solicitud enviada correctamente',
            expiredDays: 365,
            createdAt: '2024-12-23T10:30:00.000Z',
            updatedAt: '2024-12-23T10:30:00.000Z',
            distributor: {
              id: 'clx9876543210',
              firstName: 'Luis',
              lastName: 'González',
              socialReason: null,
              identification: '1752549467',
              email: 'distribuidor@email.com',
              phone: '0991234567',
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 100,
          totalPages: 10,
          hasNextPage: true,
          hasPrevPage: false,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo para administradores',
  })
  async getAllSignatureRequestsAdmin(
    @Query() filterDto: AdminSignatureFilterDto,
  ) {
    return this.signaturesService.getAllSignatureRequestsAdmin(filterDto);
  }

  @Get('admin/unique')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Obtener detalle completo de una solicitud de firma por ID (Admin)',
    description:
      'Retorna los detalles completos de una solicitud de firma específica, incluyendo todas las fotos, documentos e información del distribuidor. Solo para administradores.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Detalle completo de la solicitud de firma con fotos e info del distribuidor',
    schema: {
      example: {
        id: 'clx1234567890',
        numero_tramite: 'DIST1703342567890001',
        perfil_firma: '018',
        nombres: 'FERNANDO MATIAS',
        apellidos: 'TURIZO FERNANDEZ',
        cedula: '1752549468',
        correo: 'luisg@solucionesnexus.com',
        codigo_dactilar: 'V43I4444',
        celular: '0990602199',
        provincia: 'PICHINCHA',
        ciudad: 'QUITO',
        parroquia: 'IÑAQUITO',
        direccion: 'QUITUS COLONIAL',
        dateOfBirth: '1990-05-15T00:00:00.000Z',
        foto_frontal_url: 'https://s3.wasabisys.com/...',
        foto_posterior_url: 'https://s3.wasabisys.com/...',
        selfie_url: 'https://s3.wasabisys.com/...',
        video_face: 'https://s3.wasabisys.com/...',
        pdf_sri_url: null,
        nombramiento_url: null,
        razon_social: null,
        rep_legal: null,
        cargo: null,
        ruc: null,
        tipo_envio: 'EMAIL',
        status: 'COMPLETED',
        biometryStatus: null,
        signatureType: 'JURIDICA_TOKEN',
        providerCode: 'uuid-proveedor-123',
        providerMessage: 'Solicitud enviada correctamente',
        annulledBy: null,
        annulledNote: null,
        activeNotification: true,
        expirationDate: '2025-12-23T10:30:00.000Z',
        duration: '1',
        durationType: 'Y',
        priceCharged: 89900,
        paymentMethod: 'CREDIT',
        tokenInfo: {
          id: 'clxtoken123',
          shippingTypeUuid: 'uuid-envio-continental',
          deliveryMethod: 'DELIVERY',
          office: null,
          contactName: 'LUIS GONZALEZ',
          contactPhone: '0990602199',
          province: 'PICHINCHA',
          city: 'QUITO',
          mainStreet: 'AV. AMAZONAS',
          houseNumber: 'N35-26',
          secondaryStreet: 'PATRIA',
          reference: 'EDIFICIO COFIEC',
          recipientIdentification: '1752549467',
          recipientName: 'LUIS GONZALEZ',
          createdAt: '2024-12-23T10:30:00.000Z',
          updatedAt: '2024-12-23T10:30:00.000Z',
        },
        createdAt: '2024-12-23T10:30:00.000Z',
        updatedAt: '2024-12-23T10:30:00.000Z',
        distributor: {
          id: 'clx9876543210',
          firstName: 'Luis',
          lastName: 'González',
          socialReason: null,
          identification: '1752549467',
          identificationType: 'CEDULA',
          email: 'distribuidor@email.com',
          phone: '0991234567',
          address: 'Quito, Ecuador',
          balance: 450000,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitud no encontrada o error al obtener las imágenes',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo para administradores',
  })
  async getSignatureRequestAdmin(@Query('id') id: string) {
    if (!id) {
      throw new BadRequestException('El parámetro id es requerido');
    }
    return this.signaturesService.getSignatureRequestAdmin(id);
  }

  @Post('admin/annul')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Anular una solicitud de firma y reembolsar al distribuidor',
    description:
      'Permite al administrador anular una solicitud de firma digital. Si la firma había sido cobrada, se reembolsa automáticamente el monto al balance del distribuidor y se crea el movimiento correspondiente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Firma anulada exitosamente con reembolso procesado',
    schema: {
      example: {
        success: true,
        message:
          'Firma anulada exitosamente y se reembolsaron $7.99 al distribuidor',
        data: {
          signatureId: 'clx1234567890',
          distributorId: 'clx9876543210',
          refundedAmount: 79900,
          newDistributorBalance: 529900,
          movementId: 'clx1122334455',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Firma no encontrada, ya anulada o en estado no válido para anulación',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo para administradores',
  })
  async annulSignatureRequest(@Request() req, @Body() dto: AnnulSignatureDto) {
    return this.signaturesService.annulSignatureRequest(
      dto.signatureId,
      req.user.firstName + ' ' + req.user.lastName,
      dto.generateRefund,
      dto.note,
    );
  }

  @Post('admin/approve')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Aprobar una solicitud de firma jurídica',
    description:
      'Permite al administrador aprobar una solicitud de firma jurídica que está en estado PENDING. Solo cambia el estado a COMPLETED, no afecta el balance del distribuidor.',
  })
  @ApiResponse({
    status: 200,
    description: 'Firma jurídica aprobada exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Firma jurídica aprobada exitosamente',
        data: {
          signatureId: 'clx1234567890',
          previousStatus: 'PENDING',
          newStatus: 'COMPLETED',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Firma no encontrada, no es jurídica o no está en estado PENDING',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo para administradores',
  })
  async approveJuridicalSignature(
    @Request() req,
    @Body() dto: ApproveSignatureDto,
  ) {
    return this.signaturesService.approveJuridicalSignature(
      dto.signatureId,
      req.user.firstName + ' ' + req.user.lastName,
      dto.note,
    );
  }

  @Post('admin/resend-biometric-link')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Reenviar link de biometría Enext (Admin)',
    description:
      'Genera un nuevo link de biometría para una firma ENEXT en proceso y lo envía automáticamente al correo y WhatsApp del cliente. Solo para administradores. Actualiza el token guardado en la firma.',
  })
  @ApiQuery({
    name: 'signatureId',
    required: true,
    type: String,
    description: 'ID de la solicitud de firma ENEXT',
  })
  @ApiResponse({
    status: 201,
    description: 'Link generado y enviado exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Link de biometría generado y enviado por correo y WhatsApp',
        newToken: 'abc123xyz...',
        link: 'https://enext.online/',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Firma no encontrada, no es ENEXT, ya completada o sin token registrado',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo para administradores',
  })
  async resendBiometricLink(@Query('signatureId') signatureId: string) {
    if (!signatureId) {
      throw new BadRequestException('El parámetro signatureId es requerido');
    }
    return this.signaturesService.resendEnextBiometricLink(signatureId);
  }
}
