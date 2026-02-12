import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AdvertisementsService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'ads');

  constructor(private readonly prisma: PrismaService) {
    // Crear directorio de uploads si no existe
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  // Crear una nueva publicidad
  async create(data: CreateAdvertisementDto, adminName?: string) {
    try {
      // Validar que la imagen en base64 esté presente
      if (!data.image) {
        throw new BadRequestException({
          message: 'La imagen es requerida',
          error: 'IMAGE_REQUIRED',
        });
      }

      // Guardar la imagen
      const imageUrl = await this.saveImage(data.image);

      // Crear la publicidad en la base de datos
      const advertisement = await this.prisma.advertisement.create({
        data: {
          imageUrl,
          isActive: data.isActive ?? true,
          createdBy: adminName || 'Desconocido',
        },
      });

      return {
        success: true,
        message: 'Publicidad creada exitosamente',
        advertisement,
      };
    } catch (error) {
      // Si hay error, eliminar la imagen si fue guardada
      throw error;
    }
  }

  // Obtener todas las publicidades (para admin)
  async findAll() {
    const advertisements = await this.prisma.advertisement.findMany();
    // Traer la url firmada de cada imagen si es necesario

    return {
      success: true,
      count: advertisements.length,
      advertisements,
    };
  }

  // Obtener solo publicidades activas (para distribuidores)
  async findActive() {
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
      count: advertisements.length,
      advertisements,
    };
  }

  // Obtener una publicidad por ID
  async findOne(id: string) {
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id },
    });

    if (!advertisement) {
      throw new NotFoundException({
        message: 'Publicidad no encontrada',
        error: 'ADVERTISEMENT_NOT_FOUND',
      });
    }

    return {
      success: true,
      advertisement,
    };
  }

  // Actualizar una publicidad
  async update(id: string, data: UpdateAdvertisementDto) {
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id },
    });

    if (!advertisement) {
      throw new NotFoundException({
        message: 'Publicidad no encontrada',
        error: 'ADVERTISEMENT_NOT_FOUND',
      });
    }

    let imageUrl = advertisement.imageUrl;

    // Si se proporciona nueva imagen, guardarla y eliminar la anterior
    if (data.image) {
      imageUrl = await this.saveImage(data.image);
      // Eliminar imagen anterior
      this.deleteImage(advertisement.imageUrl);
    }

    const updatedAdvertisement = await this.prisma.advertisement.update({
      where: { id },
      data: {
        imageUrl,
        isActive: data.isActive,
      },
    });

    return {
      success: true,
      message: 'Publicidad actualizada exitosamente',
      advertisement: updatedAdvertisement,
    };
  }

  // Eliminar una publicidad
  async remove(id: string) {
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id },
    });

    if (!advertisement) {
      throw new NotFoundException({
        message: 'Publicidad no encontrada',
        error: 'ADVERTISEMENT_NOT_FOUND',
      });
    }

    // Eliminar la imagen del sistema de archivos
    this.deleteImage(advertisement.imageUrl);

    // Eliminar de la base de datos
    await this.prisma.advertisement.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Publicidad eliminada exitosamente',
    };
  }

  // Guardar imagen desde base64
  private async saveImage(base64Image: string): Promise<string> {
    try {
      let extension = 'jpeg'; // Default extension
      let data = base64Image;

      // Intentar extraer el tipo de archivo y los datos base64 si viene con prefijo
      const matches = base64Image.match(/^data:image\/(\w+);base64,(.+)$/);

      if (matches) {
        // Formato completo: data:image/jpeg;base64,...
        extension = matches[1]; // jpg, png, etc.
        data = matches[2];
      } else {
        // Formato sin prefijo: /9j/4AAQSkZJRgABAQAA...
        // Detectar el tipo de imagen por los primeros bytes
        if (base64Image.startsWith('/9j/')) {
          extension = 'jpeg';
        } else if (base64Image.startsWith('iVBORw0KGgo')) {
          extension = 'png';
        } else if (base64Image.startsWith('R0lGOD')) {
          extension = 'gif';
        } else if (base64Image.startsWith('UklGR')) {
          extension = 'webp';
        }
        // Si no se puede detectar, usar jpeg por defecto
        data = base64Image;
      }

      // Generar nombre único para la imagen
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const filename = `ad_${timestamp}_${randomString}.${extension}`;
      const filepath = path.join(this.uploadsDir, filename);

      // Guardar la imagen
      const buffer = Buffer.from(data, 'base64');
      fs.writeFileSync(filepath, buffer);

      // Retornar la URL relativa
      return `/uploads/ads/${filename}`;
    } catch (error) {
      throw new BadRequestException({
        message: 'Error al guardar la imagen',
        error: 'IMAGE_SAVE_ERROR',
      });
    }
  }

  // Eliminar imagen del sistema de archivos
  private deleteImage(imageUrl: string): void {
    try {
      const filename = path.basename(imageUrl);
      const filepath = path.join(this.uploadsDir, filename);

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    } catch (error) {
      // Si hay error al eliminar, solo loggearlo pero no fallar la operación
      console.error('Error al eliminar imagen:', error);
    }
  }
}
