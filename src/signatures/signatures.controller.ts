import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { SignaturesService } from './signatures.service';
import { CreateNaturalSignatureDto } from './dto/create-natural-signature.dto';
import { CreateJuridicalSignatureDto } from './dto/create-juridical-signature.dto';
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
  @ApiOperation({
    summary: 'Crear solicitud de firma digital para persona natural',
    description:
      'Permite a un distribuidor crear una solicitud de firma digital para persona natural. Los datos son enviados al proveedor ENEXT. Se valida el balance del distribuidor y se cobra automáticamente si la solicitud es exitosa.',
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
      'Balance insuficiente, plan no asignado o distribuidor inactivo',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo para distribuidores' })
  async createNaturalSignature(
    @Request() req,
    @Body() dto: CreateNaturalSignatureDto,
  ) {
    return this.signaturesService.createNaturalSignatureRequest(
      req.user.userId,
      dto,
    );
  }

  @Post('juridica')
  @Roles(Role.DISTRIBUTOR)
  @ApiOperation({
    summary: 'Crear solicitud de firma digital para persona jurídica',
    description:
      'Permite a un distribuidor crear una solicitud de firma digital para empresa/persona jurídica. Requiere datos adicionales como RUC, razón social, representante legal y nombramiento. Se valida el balance y se cobra automáticamente si es exitosa.',
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
      'Balance insuficiente, plan no asignado o distribuidor inactivo',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Solo para distribuidores' })
  async createJuridicalSignature(
    @Request() req,
    @Body() dto: CreateJuridicalSignatureDto,
  ) {
    return this.signaturesService.createJuridicalSignatureRequest(
      req.user.userId,
      dto,
    );
  }

  @Get()
  @Roles(Role.DISTRIBUTOR)
  @ApiOperation({
    summary: 'Obtener solicitudes de firma del distribuidor',
    description:
      'Retorna todas las solicitudes de firma digital creadas por el distribuidor autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes de firma',
    schema: {
      example: [
        {
          id: 'clx1234567890',
          numero_tramite: 'DIST1703342567890001',
          perfil_firma: '018',
          nombres: 'FERNANDO MATIAS',
          apellidos: 'TURIZO FERNANDEZ',
          cedula: '1752549468',
          status: 'PENDING',
          createdAt: '2024-12-23T10:30:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo para distribuidores',
  })
  async getMySignatureRequests(@Request() req) {
    return this.signaturesService.getDistributorSignatureRequests(req.user.id);
  }

  @Get(':id')
  @Roles(Role.DISTRIBUTOR)
  @ApiOperation({
    summary: 'Obtener detalle de una solicitud de firma',
    description:
      'Retorna los detalles completos de una solicitud de firma específica del distribuidor autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la solicitud de firma',
    example: 'clx1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la solicitud de firma',
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
        foto_frontal: 'https://example.com/frontal.jpg',
        foto_posterior: 'https://example.com/posterior.jpg',
        clavefirma: 'GONZALEZ1752',
        ruc: null,
        pais: 'ECUADOR',
        status: 'PENDING',
        providerCode: '200',
        providerMessage: 'Solicitud recibida',
        createdAt: '2024-12-23T10:30:00.000Z',
        updatedAt: '2024-12-23T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitud no encontrada',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo para distribuidores',
  })
  async getSignatureRequest(@Request() req, @Param('id') id: string) {
    return this.signaturesService.getSignatureRequest(id, req.user.id);
  }
}
