import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class FilesService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(FilesService.name);

  // Caché para validación de conexión (válido por 5 minutos)
  private lastConnectionCheck: number = 0;
  private readonly CONNECTION_CACHE_MS = 5 * 60 * 1000; // 5 minutos

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('app.wasabi.endpoint');
    const region = this.configService.get<string>('app.wasabi.region');
    const accessKeyId = this.configService.get<string>('app.wasabi.accessKeyId');
    const secretAccessKey = this.configService.get<string>('app.wasabi.secretAccessKey');
    const bucket = this.configService.get<string>('app.wasabi.bucket');

    if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        'Faltan configuraciones de Wasabi en las variables de entorno',
      );
    }

    this.bucket = bucket;

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  /**
   * Sube un archivo desde base64 al bucket de S3
   * @param base64 - Archivo en formato base64
   * @param ownerId - ID del dueño
   * @param extension - Extensión del archivo (jpg, png, pdf, etc.)
   * @param folder - Carpeta dentro del bucket
   * @returns Key del archivo subido
   */
  async uploadFile(
    base64: string,
    ownerId: number | string,
    extension: string,
    folder: string,
  ): Promise<string> {
    try {
      // Remover el prefijo data:image/jpeg;base64, si existe
      const base64Data = base64.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const timestamp = Date.now();
      const key = `${folder}/${ownerId}/${ownerId}-${timestamp}.${extension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: this.getContentType(extension),
      });

      await this.s3Client.send(command);

      this.logger.log(`Archivo subido exitosamente: ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Error al subir archivo: ${error.message}`);
      throw new Error(`Error al subir archivo: ${error.message}`);
    }
  }

  /**
   * Obtiene un archivo del bucket de S3 en formato base64
   * @param key - Key del archivo en S3
   * @returns Archivo en formato base64
   */
  async getFile(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];

      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      const base64 = buffer.toString('base64');

      return base64;
    } catch (error) {
      this.logger.error(`Error al obtener ${key}: ${error.message}`);
      throw new Error(`Error al obtener ${key}: ${error.message}`);
    }
  }

  async getFileUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      // Generar URL firmada con expiración de 1 hora (3600 segundos)
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600,
      });

      return signedUrl;
    } catch (error) {
      this.logger.error(`Error al obtener URL de ${key}: ${error.message}`);
      throw new Error(`Error al obtener URL de ${key}: ${error.message}`);
    }
  }

  /**
   * Elimina un archivo del bucket de S3
   * @param key - Key del archivo en S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Archivo eliminado exitosamente: ${key}`);
    } catch (error) {
      this.logger.error(`Error al eliminar ${key}: ${error.message}`);
      throw new Error(`Error al eliminar ${key}: ${error.message}`);
    }
  }

  /**
   * Sube un archivo desde Buffer (para multipart/form-data) al bucket de S3
   * @param buffer - Buffer del archivo
   * @param ownerId - ID del dueño
   * @param extension - Extensión del archivo (jpg, png, pdf, mp4, etc.)
   * @param folder - Carpeta dentro del bucket
   * @returns Key del archivo subido
   */
  async uploadFileFromBuffer(
    buffer: Buffer,
    ownerId: number | string,
    extension: string,
    folder: string,
  ): Promise<string> {
    try {
      const timestamp = Date.now();
      const key = `${folder}/${ownerId}/${ownerId}-${timestamp}.${extension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: this.getContentType(extension),
      });

      await this.s3Client.send(command);

      this.logger.log(`Archivo subido exitosamente: ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Error al subir archivo: ${error.message}`);
      throw new Error(`Error al subir archivo: ${error.message}`);
    }
  }

  /**
   * Valida que el servicio de Wasabi esté disponible y funcionando
   * Usa caché de 5 minutos para evitar validaciones excesivas
   * @returns true si está disponible
   * @throws Error si hay problemas de conexión
   */
  async checkWasabiConnection(): Promise<boolean> {
    try {
      // Si la última validación fue hace menos de 5 minutos, asumir que está OK
      const now = Date.now();
      if (now - this.lastConnectionCheck < this.CONNECTION_CACHE_MS) {
        return true;
      }

      const command = new HeadBucketCommand({
        Bucket: this.bucket,
      });

      await this.s3Client.send(command);

      // Actualizar timestamp de última validación exitosa
      this.lastConnectionCheck = now;

      this.logger.log('Conexión con Wasabi verificada exitosamente');
      return true;
    } catch (error) {
      // Invalidar caché en caso de error
      this.lastConnectionCheck = 0;

      this.logger.error(
        `Error al verificar conexión con Wasabi: ${error.message}`,
      );
      throw new Error(
        `El servicio de almacenamiento (Wasabi) no está disponible. Por favor, intente más tarde.`,
      );
    }
  }

  /**
   * Obtiene el Content-Type según la extensión del archivo
   * @param extension - Extensión del archivo
   * @returns Content-Type
   */
  private getContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      pdf: 'application/pdf',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      webm: 'video/webm',
    };

    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}
