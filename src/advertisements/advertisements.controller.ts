import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdvertisementsService } from './advertisements.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Publicidad')
@Controller('advertisements')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdvertisementsController {
  constructor(private readonly advertisementsService: AdvertisementsService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Crear nueva publicidad',
    description:
      'Permite al administrador crear una nueva publicidad subiendo una imagen en formato base64. La imagen se guarda en el servidor y se devuelve la URL.',
  })
  @ApiResponse({
    status: 201,
    description: 'Publicidad creada exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Publicidad creada exitosamente',
        advertisement: {
          id: 'clxxx123abc',
          imageUrl: '/uploads/ads/ad_1702894567890_abc123.jpeg',
          isActive: true,
          createdBy: 'admin123',
          createdAt: '2025-12-18T12:00:00.000Z',
          updatedAt: '2025-12-18T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Imagen requerida o formato inválido',
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos de ADMIN',
  })
  create(
    @Body() createAdvertisementDto: CreateAdvertisementDto,
    @Request() req,
  ) {
    const adminId = req.user.sub;
    return this.advertisementsService.create(createAdvertisementDto, adminId);
  }

  // Obtener todas las publicidades (Solo Admin)
  @Get()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Listar todas las publicidades',
    description:
      'Obtiene la lista completa de publicidades (activas e inactivas). Solo para administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de publicidades obtenida exitosamente',
    schema: {
      example: {
        success: true,
        count: 3,
        advertisements: [
          {
            id: 'clxxx123abc',
            imageUrl: '/uploads/ads/ad_1702894567890_abc123.jpeg',
            isActive: true,
            createdBy: 'admin123',
            createdAt: '2025-12-18T12:00:00.000Z',
            updatedAt: '2025-12-18T12:00:00.000Z',
          },
        ],
      },
    },
  })
  findAll() {
    return this.advertisementsService.findAll();
  }

  // Obtener solo publicidades activas (Distribuidores y Admin)
  @Get('active')
  @ApiOperation({
    summary: 'Listar publicidades activas',
    description:
      'Obtiene solo las publicidades activas ordenadas por orden y fecha de creación. Accesible para distribuidores y administradores. Estas publicidades también se incluyen automáticamente en el dashboard del distribuidor.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de publicidades activas obtenida exitosamente',
    schema: {
      example: {
        success: true,
        count: 2,
        advertisements: [
          {
            id: 'clxxx123abc',
            imageUrl: '/uploads/ads/ad_1702894567890_abc123.jpeg',
          },
          {
            id: 'clxxx789ghi',
            imageUrl: '/uploads/ads/ad_1702894567892_ghi789.jpeg',
          },
        ],
      },
    },
  })
  findActive() {
    return this.advertisementsService.findActive();
  }

  // Obtener una publicidad específica (Solo Admin)
  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Obtener una publicidad por ID',
    description:
      'Obtiene los detalles completos de una publicidad específica. Solo para administradores.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la publicidad',
    example: 'clxxx123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Publicidad obtenida exitosamente',
    schema: {
      example: {
        success: true,
        advertisement: {
          id: 'clxxx123abc',
          imageUrl: '/uploads/ads/ad_1702894567890_abc123.jpeg',
          isActive: true,
          createdBy: 'admin123',
          createdAt: '2025-12-18T12:00:00.000Z',
          updatedAt: '2025-12-18T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Publicidad no encontrada',
  })
  findOne(@Param('id') id: string) {
    return this.advertisementsService.findOne(id);
  }

  // Actualizar publicidad (Solo Admin)
  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Actualizar una publicidad',
    description:
      'Actualiza los datos de una publicidad existente. Si se proporciona una nueva imagen, la anterior se elimina automáticamente. Todos los campos son opcionales.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la publicidad a actualizar',
    example: 'clxxx123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Publicidad actualizada exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Publicidad actualizada exitosamente',
        advertisement: {
          id: 'clxxx123abc',
          imageUrl: '/uploads/ads/ad_1702894667890_xyz789.png',
          isActive: false,
          createdBy: 'admin123',
          createdAt: '2025-12-18T12:00:00.000Z',
          updatedAt: '2025-12-18T12:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Publicidad no encontrada',
  })
  update(
    @Param('id') id: string,
    @Body() updateAdvertisementDto: UpdateAdvertisementDto,
  ) {
    return this.advertisementsService.update(id, updateAdvertisementDto);
  }

  // Eliminar publicidad (Solo Admin)
  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Eliminar una publicidad',
    description:
      'Elimina permanentemente una publicidad y su imagen del servidor. Esta acción no se puede deshacer.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la publicidad a eliminar',
    example: 'clxxx123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Publicidad eliminada exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Publicidad eliminada exitosamente',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Publicidad no encontrada',
  })
  remove(@Param('id') id: string) {
    return this.advertisementsService.remove(id);
  }
}
