import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
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
    description: 'Buscar por identificación del solicitante (RUC o cédula)',
    example: '1752549467',
  })
  @IsOptional()
  @IsString()
  identification?: string;

  @ApiPropertyOptional({
    description: 'Buscar por identificación del distribuidor',
    example: '1752549467',
  })
  @IsOptional()
  @IsString()
  distributorIdentification?: string;

  @ApiPropertyOptional({
    description: 'Fecha de inicio del rango (formato ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del rango (formato ISO 8601)',
    example: '2026-01-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
