import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreditsService } from './credits.service';
import { CreateCreditDto } from './dto/create-credit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Créditos')
@Controller('credits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  /**
   * Crear un nuevo crédito para un distribuidor
   * Solo accesible para administradores
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo crédito para un distribuidor',
    description:
      'Permite a un administrador asignar un crédito a un distribuidor. El crédito se suma al balance del distribuidor y debe ser pagado antes de la fecha de vencimiento.',
  })
  @ApiResponse({
    status: 201,
    description: 'Crédito creado exitosamente',
    schema: {
      example: {
        message: 'Crédito creado exitosamente',
        data: {
          credit: {
            id: 'clx1234567890',
            distributorId: 'clx9876543210',
            usedAmount: 0,
            dueDate: '2026-02-14T23:59:59.999Z',
            status: 'ACTIVE',
            createdAt: '2024-06-01T12:00:00.000Z',
            updatedAt: '2024-06-01T12:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o fecha de vencimiento incorrecta',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo administradores',
  })
  async createCredit(@Body() createCreditDto: CreateCreditDto, @Request() req) {
    const adminName = req.user.firstName + ' ' + req.user.lastName;

    return this.creditsService.createCredit(createCreditDto, adminName);
  }
}
