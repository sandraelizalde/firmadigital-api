import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetDistributorsByPlanDto {
  @ApiProperty({
    description: 'Duración del plan',
    example: '1',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  duration: string;

  @ApiProperty({
    description: 'Tipo de duración del plan',
    example: 'Y',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  durationType: string;
}
