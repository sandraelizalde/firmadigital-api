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
} from '@nestjs/swagger';
import { SignaturesService } from './signatures.service';
import { CreateNaturalSignatureDto } from './dto/create-natural-signature.dto';
import { CreateJuridicalSignatureDto } from './dto/create-juridical-signature.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
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
        'clave_firma',
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
        clave_firma: { type: 'string', example: 'GONZALEZ1752' },
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
        'clave_firma',
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
        clave_firma: { type: 'string', example: 'GONZALEZ1752' },
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
        foto_frontal_url: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
        foto_posterior_url: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
        video_face_url: null,
        pdf_sri_url: null,
        nombramiento_url: null,
        razon_social: null,
        rep_legal: null,
        cargo: null,
        pais: 'ECUADOR',
        clavefirma: 'GONZALEZ1752',
        ruc: null,
        tipo_envio: 'NATURAL',
        status: 'PENDING',
        providerCode: '200',
        providerMessage: 'Solicitud recibida',
        activeNotification: true,
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
    description:
      'Retorna todas las solicitudes de firma digital creadas por el distribuidor autenticado, con paginación.',
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
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.signaturesService.getAllSignatureRequests(
      req.user.userId,
      paginationQuery.page,
      paginationQuery.limit,
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
        video_face: 'https://s3.wasabisys.com/...',
        pdf_sri_url: null,
        nombramiento_url: null,
        razon_social: null,
        rep_legal: null,
        cargo: null,
        pais: 'ECUADOR',
        clavefirma: 'GONZALEZ1752',
        ruc: null,
        tipo_envio: 'NATURAL',
        status: 'COMPLETED',
        providerCode: '1',
        providerMessage: 'Solicitud enviada correctamente',
        annulledBy: 'Juan Perez',
        annulledNote: 'Solicitud anulada por error',
        activeNotification: true,
        expirationDate: '2025-12-23T10:30:00.000Z',
        duration: '1',
        durationType: 'Y',
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
}
