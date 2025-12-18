import { IsString, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdvertisementDto {

  @ApiProperty({
    description:
      'Imagen en formato base64 (con o sin prefijo data:image/...;base64,)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...',
  })
  @IsString()
  image: string; // Base64 de la imagen

  @ApiPropertyOptional({
    description: 'Si la publicidad está activa',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
