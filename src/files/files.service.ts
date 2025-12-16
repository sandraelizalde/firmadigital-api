import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class FilesService {
  private readonly s3Client: S3Client;
  private readonly bucketName = 'vouchers-nexus';
  private readonly logger = new Logger(FilesService.name);

  constructor() {
    const endpoint = process.env.WASABI_ENDPOINT;
    const region = process.env.WASABI_REGION;
    const accessKeyId = process.env.WASABI_ACCESS_KEY;
    const secretAccessKey = process.env.WASABI_SECRET_KEY;

    if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Faltan configuraciones de Wasabi en las variables de entorno',
      );
    }

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
   * Sube un voucher desde base64 al bucket de S3
   * @param base64 - Archivo en formato base64
   * @param rechargeId - ID de la recarga
   * @param extension - Extensión del archivo (jpg, png, pdf, etc.)
   * @returns URL del archivo subido
   */
  async uploadVoucher(
    base64: string,
    rechargeId: number,
    extension: string,
  ): Promise<string> {
    try {
      // Remover el prefijo data:image/jpeg;base64, si existe
      const base64Data = base64.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const timestamp = Date.now();
      const key = `vouchers/${rechargeId}-${timestamp}.${extension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: this.getContentType(extension),
      });

      await this.s3Client.send(command);
      const fileUrl = `${process.env.WASABI_ENDPOINT}/${this.bucketName}/${key}`;

      this.logger.log(`Voucher subido exitosamente: ${key}`);
      return fileUrl;
    } catch (error) {
      this.logger.error(`Error al subir voucher: ${error.message}`);
      throw new Error(`Error al subir voucher: ${error.message}`);
    }
  }

  /**
   * Obtiene un voucher del bucket de S3 en formato base64
   * @param url - URL completa del archivo en S3
   * @returns Archivo en formato base64
   */
  async getVoucher(url: string): Promise<string> {
    try {
      const key = this.extractKeyFromUrl(url);
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
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
      this.logger.error(`Error al obtener voucher: ${error.message}`);
      throw new Error(`Error al obtener voucher: ${error.message}`);
    }
  }

  /**
   * Elimina un voucher del bucket de S3
   * @param url - URL completa del archivo en S3
   */
  async deleteVoucher(url: string): Promise<void> {
    try {
      const key = this.extractKeyFromUrl(url);
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Voucher eliminado exitosamente: ${key}`);
    } catch (error) {
      this.logger.error(`Error al eliminar voucher: ${error.message}`);
      throw new Error(`Error al eliminar voucher: ${error.message}`);
    }
  }

  /**
   * Extrae la clave (key) de una URL completa de Wasabi
   * @param url - URL completa del archivo
   * @returns Clave del archivo en S3
   */
  private extractKeyFromUrl(url: string): string {
    const urlParts = url.split(`${this.bucketName}/`);
    return urlParts[1] || url;
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
    };

    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}
