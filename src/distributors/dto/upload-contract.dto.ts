import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadContractDto {
  @ApiProperty({
    description:
      'Contrato en formato Base64 (puede incluir o no el prefijo data:application/pdf;base64,)',
    example: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwo...',
    type: String,
  })
  @IsNotEmpty({ message: 'El contrato es requerido' })
  @IsString()
  contractBase64: string;
}
