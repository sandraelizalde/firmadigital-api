import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Request,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Roles } from './decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateDistributorDto } from './dto/create-distributor.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Inicio de sesión para distribuidores',
    description:
      'Permite a los distribuidores autenticarse en el sistema usando su cédula/RUC y contraseña. Retorna un JWT token para acceder a los endpoints protegidos.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          description: 'JWT token para autenticación',
        },
        message: {
          type: 'string',
          example: '¡Hola, nos alegra verte otra vez!',
        },
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Credenciales inválidas o distribuidor no encontrado',
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos de login (rate limit excedido)',
  })
  @Post('login')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Public()
  async loginDistributor(@Body() data: LoginDto) {
    const accessToken = await this.authService.validateDistributor(data);
    if (!accessToken) {
      throw new HttpException('Credenciales inválidas', HttpStatus.NOT_FOUND);
    }
    return {
      accessToken,
      message: '¡Hola, nos alegra verte otra vez!',
      success: true,
    };
  }

  @ApiOperation({
    summary: 'Registro de nuevo distribuidor',
    description:
      'Endpoint exclusivo para administradores. Permite registrar un nuevo distribuidor en el sistema. La contraseña se encripta usando AES-256-CBC con PRIVATE_KEY_PASSWORD. Se registra automáticamente el ID y nombre del admin que crea el distribuidor.',
  })
  @ApiBody({ type: CreateDistributorDto })
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'Distribuidor registrado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Distribuidor registrado exitosamente.',
        },
        distributor: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clxxxxx' },
            firstName: { type: 'string', example: 'Luis Fernando' },
            lastName: { type: 'string', example: 'González' },
            email: {
              type: 'string',
              example: 'distribuidor@example.com',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT inválido o faltante',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Solo usuarios con rol ADMIN pueden acceder',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto - El distribuidor ya existe (identificación o email duplicado)',
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas solicitudes (rate limit excedido)',
  })
  @Post('register/distributor')
  @Roles(Role.ADMIN)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async registerDistributor(
    @Body() data: CreateDistributorDto,
    @Request() req: any,
  ) {
    return await this.authService.registerDistributor(data, req.user);
  }
}
