import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

/**
 * DTO para consultar datos de una cédula
 */
export class QueryCedulaDto {
  @IsNotEmpty({ message: 'La cédula es requerida' })
  @IsString({ message: 'La cédula debe ser un texto' })
  @Length(10, 10, { message: 'La cédula debe tener 10 dígitos' })
  @Matches(/^\d{10}$/, {
    message: 'La cédula debe contener solo números',
  })
  cedula: string;
}
