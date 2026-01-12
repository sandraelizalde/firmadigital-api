import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Cédula o RUC del distribuidor',
    example: '1752549468',
    type: String,
    minLength: 10,
    maxLength: 13,
  })
  @IsNotEmpty({ message: 'La identificación es requerida' })
  @IsString({ message: 'La identificación debe ser una cadena de texto' })
  identification: string;

  @ApiProperty({
    description: 'Password for authentication',
    example: 'Luisg123!',
    type: String,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  password: string;
}
