import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from './pagination-query.dto';

export class DistributorFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Buscar por identificación del distribuidor (cédula o RUC)',
    example: '1752549467',
  })
  @IsOptional()
  @IsString()
  identification?: string;

  @ApiPropertyOptional({
    description: 'Buscar por nombre o apellido del distribuidor',
    example: 'Juan Pérez',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
