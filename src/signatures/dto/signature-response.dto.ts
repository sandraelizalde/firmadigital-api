import { SignatureStatus } from '@prisma/client';

export class SignatureResponseDto {
  id: string;
  numero_tramite: string;
  perfil_firma: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  correo: string;
  codigo_dactilar: string;
  celular: string;
  provincia: string;
  ciudad: string;
  parroquia: string;
  direccion: string;
  dateOfBirth: Date;
  foto_frontal_base64: string;
  foto_posterior_base64: string;
  video_face?: string | null;
  pdf_sri_base64?: string | null;
  nombramiento_base64?: string | null;
  razon_social?: string | null;
  rep_legal?: string | null;
  cargo?: string | null;
  pais: string;
  ruc?: string | null;
  tipo_envio: string;
  status: SignatureStatus;
  providerCode?: string | null;
  providerMessage?: string | null;
  activeNotification: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedSignaturesResponseDto {
  data: SignatureResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
