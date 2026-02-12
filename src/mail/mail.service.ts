import { Injectable, Logger } from '@nestjs/common';
import { render } from '@react-email/render';
import ContractEmail from './templates/ContractEmail';
import WelcomeDistributorEmail from './templates/WelcomeDistributorEmail';
import { Resend } from 'resend';
import { PdfGeneratorService } from './pdf-generator.service';

@Injectable()
export class MailService {
  private readonly resend = new Resend(process.env.RESEND_API_KEY);
  private readonly fromEmail = process.env.EMAIL_USER!;

  constructor(private readonly pdfGenerator: PdfGeneratorService) {}

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      await this.resend.emails.send({
        from: `Nexus Soluciones <${this.fromEmail}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      throw error;
    }
  }

  private async sendEmailWithFile(
    to: string,
    subject: string,
    html: string,
    fileBase64: string,
    fileName: string,
  ) {
    try {
      await this.resend.emails.send({
        from: `Nexus Soluciones <${this.fromEmail}>`,
        to,
        subject,
        html,
        attachments: [
          {
            content: fileBase64,
            filename: fileName,
          },
        ],
      });
    } catch (error) {
      throw error;
    }
  }

  async sendContract(distributor: any, juridicalPlans: any[]) {
    try {
      // Preparar datos para el contrato
      const contractData = {
        distributorName:
          distributor.socialReason ||
          `${distributor.firstName} ${distributor.lastName}`,
        identification: distributor.identification,
        email: distributor.email,
        phone: distributor.phone,
        address: distributor.address,
        city: distributor.city,
        representativeName: `${distributor.firstName} ${distributor.lastName}`,
        representativeId: distributor.identification,
        plans: juridicalPlans.map((plan) => ({
          customPrice: plan.customPrice,
          duration: plan.plan.duration,
          durationType: plan.plan.durationType,
        })),
        date: new Date(),
      };

      // Generar PDF del contrato
      const pdfBuffer = await this.pdfGenerator.generateContract(contractData);
      const pdfBase64 = pdfBuffer.toString('base64');

      // Generar HTML del email
      const html = await render(
        ContractEmail({
          distributorName: contractData.distributorName,
          identification: contractData.identification,
        }),
      );

      // Enviar email con contrato adjunto
      await this.sendEmailWithFile(
        this.fromEmail,
        `Nuevo Contrato de Distribuidor - ${contractData.distributorName}`,
        html,
        pdfBase64,
        `Contrato-${distributor.identification}-${Date.now()}.pdf`,
      );
    } catch (error) {
      console.error('Error al enviar contrato:', error);
      throw error;
    }
  }

  async sendWelcomeDistributor(
    distributorEmail: string,
    distributorName: string,
    identification: string,
    password: string,
  ) {
    try {
      // Generar HTML del email
      const html = await render(
        WelcomeDistributorEmail({
          distributorName,
          identification,
          password,
        }),
      );

      // Enviar email
      await this.sendEmail(
        distributorEmail,
        'Bienvenido/a como distribuidor de Nexus Soluciones',
        html,
      );
    } catch (error) {
      console.error('Error al enviar email de bienvenida:', error);
      throw error;
    }
  }

  // async sendContractSignedEmail(
  //   to: string,
  //   distributorName: string,
  //   fileBase64: string,
  //   fileName: string,
  // ) {
  //   const subject = 'Contrato firmado - Nexus Soluciones';
  //   const html = render(
  //     DocumentSignedEmail({ distributorName }),
  //   );

  //   await this.sendEmailWithFile(
  //     to,
  //     subject,
  //     html,
  //     fileBase64,
  //     fileName,
  //   );
  // }
}
