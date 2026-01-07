import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SignatureStatus } from '@prisma/client';
import { PaginationQueryDto } from './pagination-query.dto';

export class AdminSignatureFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por ID del distribuidor',
    example: 'clx1234567890',
  })
  @IsOptional()
  @IsString()
  distributorId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado de la firma',
    enum: SignatureStatus,
    example: 'COMPLETED',
  })
  @IsOptional()
  @IsEnum(SignatureStatus)
  status?: SignatureStatus;

  @ApiPropertyOptional({
    description: 'Buscar por cédula del solicitante',
    example: '1752549467',
  })
  @IsOptional()
  @IsString()
  cedula?: string;

  @ApiPropertyOptional({
    description: 'Buscar por identificación del distribuidor',
    example: '1752549467',
  })
  @IsOptional()
  @IsString()
  distributorIdentification?: string;
}
