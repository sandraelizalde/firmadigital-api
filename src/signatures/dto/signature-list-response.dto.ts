import { SignatureStatus } from '@prisma/client';

export class SignatureListItemDto {
  id: string;
  numero_tramite: string;
  perfil_firma: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  correo: string;
  celular: string;
  ruc: string | null;
  razon_social: string | null;
  status: SignatureStatus;
  providerCode: string | null;
  providerMessage: string | null;
  expiredDays: number | null;
  priceCharged: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedSignatureListResponseDto {
  data: SignatureListItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
