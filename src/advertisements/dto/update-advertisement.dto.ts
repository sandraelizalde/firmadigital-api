import { IsString, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAdvertisementDto {
  @ApiPropertyOptional({
    description:
      'Nueva imagen en formato base64. Si se proporciona, reemplaza la imagen anterior',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({
    description: 'Cambiar estado activo/inactivo',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}
