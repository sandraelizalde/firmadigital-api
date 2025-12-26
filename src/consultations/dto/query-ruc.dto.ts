import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

/**
 * DTO para consultar datos de un RUC
 */
export class QueryRucDto {
  @IsNotEmpty({ message: 'El RUC es requerido' })
  @IsString({ message: 'El RUC debe ser un texto' })
  @Length(13, 13, { message: 'El RUC debe tener 13 dígitos' })
  @Matches(/^\d{13}$/, {
    message: 'El RUC debe contener solo números',
  })
  ruc: string;
}
