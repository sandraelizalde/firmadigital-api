import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MailService } from './mail.service';
import { TestContractDto } from './dto/test-contract.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Mail')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send-contract')
  @Public()
  @ApiOperation({
    summary: 'Enviar contrato por email',
    description: `
      Genera y envía por email un contrato PDF de prestación de servicios para 
      comercialización de firma electrónica basado en los datos proporcionados.
      
      El contrato incluye:
      - Todas las cláusulas legales completas (PRIMERA a VIGÉSIMA TERCERA)
      - Tabla de precios con los planes jurídicos (ANEXO 1)
      - Obligaciones de ambas partes
      - Términos de pago (diario con facturación semanal)
      - Confidencialidad (2 años post-terminación)
      - Arbitraje (Cámara de Comercio de Quito)
      - Información de contacto
      - Sección de firmas profesional
      
      El PDF se envía al email del distribuidor especificado en los datos.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Contrato enviado exitosamente por email',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos proporcionados',
  })
  @ApiResponse({
    status: 500,
    description: 'Error al enviar el contrato',
  })
  async sendContract(@Body() contractData: TestContractDto) {
    try {
      // Preparar distribuidor y planes para el servicio
      const distributor = {
        socialReason: contractData.distributorName,
        firstName: contractData.representativeName.split(' ')[0],
        lastName: contractData.representativeName.split(' ').slice(1).join(' '),
        identification: contractData.identification,
        email: contractData.email,
        phone: contractData.phone,
        address: contractData.address,
      };

      const juridicalPlans = contractData.plans.map((plan) => ({
        plan: {
          perfil: plan.perfil,
          duration: plan.duration,
          durationType: plan.durationType,
        },
        customPrice: plan.customPrice,
      }));

      // Enviar contrato por email
      await this.mailService.sendContract(distributor, juridicalPlans);

      return {
        statusCode: 200,
        message: 'Contrato enviado exitosamente por email',
        data: {
          distributorName: contractData.distributorName,
          email: contractData.email,
        },
      };
    } catch (error) {
      console.error('Error sending contract:', error);
      return {
        statusCode: 500,
        message: 'Error al enviar el contrato',
        error: error.message,
      };
    }
  }
}
