import { BiometryStatus, SignatureStatus, SignatureType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DistributorInfoDto {
  @ApiProperty({ example: 'clx1234567890' })
  id: string;

  @ApiPropertyOptional({ example: 'Luis' })
  firstName: string | null;

  @ApiPropertyOptional({ example: 'González' })
  lastName: string | null;

  @ApiPropertyOptional({ example: 'Distribuidora ABC S.A.' })
  socialReason: string | null;

  @ApiProperty({ example: '1752549467' })
  identification: string;

  @ApiProperty({ example: 'distribuidor@email.com' })
  email: string;

  @ApiProperty({ example: '0991234567' })
  phone: string;
}

export class AdminSignatureListItemDto {
  @ApiProperty({ example: 'clx1234567890' })
  id: string;

  @ApiProperty({ example: '17034425678900001' })
  numero_tramite: string;

  @ApiProperty({ example: 'PN-001' })
  perfil_firma: string;

  @ApiProperty({ example: 'LUIS XAVIER' })
  nombres: string;

  @ApiProperty({ example: 'GONZALEZ JIMENEZ' })
  apellidos: string;

  @ApiProperty({ example: '1752549467' })
  cedula: string;

  @ApiProperty({ example: 'correo@email.com' })
  correo: string;

  @ApiProperty({ example: '0991234567' })
  celular: string;

  @ApiPropertyOptional({ example: '1752549467001' })
  ruc: string | null;

  @ApiPropertyOptional({ example: 'DISTRIBUIDORA ABC S.A.' })
  razon_social: string | null;

  @ApiPropertyOptional({ example: 'LUIS XAVIER GONZALEZ' })
  rep_legal: string | null;

  @ApiProperty({ enum: SignatureStatus, example: 'COMPLETED' })
  status: SignatureStatus;

  @ApiPropertyOptional({ enum: BiometryStatus, example: 'PENDING' })
  biometryStatus: BiometryStatus | null;

  @ApiPropertyOptional({ enum: SignatureType, example: 'NATURAL_CEDULA' })
  signatureType: SignatureType | null;
  @ApiPropertyOptional({ example: '1' })
  providerCode: string | null;

  @ApiPropertyOptional({ example: 'Solicitud enviada correctamente' })
  providerMessage: string | null;

  @ApiPropertyOptional({ example: 'Admin Juan Perez' })
  annulledBy: string | null;

  @ApiPropertyOptional({ example: 'Solicitud anulada' })
  annulledNote: string | null;

  @ApiPropertyOptional({ example: 365 })
  expiredDays: number | null;

  @ApiProperty({ example: '2024-12-23T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-12-23T10:30:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: DistributorInfoDto })
  distributor: DistributorInfoDto | null;
}

export class PaginationInfoDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNextPage: boolean;

  @ApiProperty({ example: false })
  hasPrevPage: boolean;
}

export class PaginatedAdminSignatureListResponseDto {
  @ApiProperty({ type: [AdminSignatureListItemDto] })
  data: AdminSignatureListItemDto[];

  @ApiProperty({ type: PaginationInfoDto })
  pagination: PaginationInfoDto;
}
