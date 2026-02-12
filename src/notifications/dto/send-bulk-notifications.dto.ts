import { IsArray, IsNotEmpty, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendBulkNotificationsDto {
  @ApiProperty({
    description: 'IDs de los distribuidores a notificar',
    example: ['clxxxxx1', 'clxxxxx2', 'clxxxxx3'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'Debe proporcionar al menos un distribuidor',
  })
  @IsString({ each: true })
  distributorIds: string[];

  @ApiProperty({
    description:
      'Mensaje de notificación que se enviará a los distribuidores. ' +
      'Se usa la plantilla "notificaciones_distribuidores" de WhatsApp que incluye el nombre del distribuidor y este mensaje.',
    example:
      'Se le informa que tiene una nueva promoción disponible en su cuenta.',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
