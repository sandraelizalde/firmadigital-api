import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

interface ContractData {
  distributorName: string;
  identification: string;
  email: string;
  phone: string;
  address: string;
  plans: Array<{
    perfil: string;
    customPrice: number;
    duration: string;
    durationType: string;
  }>;
  date: Date;
}

@Injectable()
export class PdfGeneratorService {
  async generateContract(data: ContractData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Encabezado
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('CONTRATO DE DISTRIBUCIÓN', { align: 'center' });

        doc.moveDown();
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('NEXUS SOLUCIONES', { align: 'center' });

        doc.moveDown(2);

        // Fecha
        const formattedDate = new Intl.DateTimeFormat('es-EC', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }).format(data.date);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Quito, ${formattedDate}`, { align: 'right' });

        doc.moveDown(2);

        // Partes del contrato
        doc.fontSize(12).font('Helvetica-Bold').text('PARTES CONTRATANTES:');
        doc.moveDown();

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(
            'Por una parte, NEXUS SOLUCIONES, representada por su representante legal, y por otra parte:',
          );

        doc.moveDown();
        doc
          .font('Helvetica-Bold')
          .text(`DISTRIBUIDOR: ${data.distributorName}`);
        doc.font('Helvetica').text(`IDENTIFICACIÓN: ${data.identification}`);
        doc.text(`CORREO ELECTRÓNICO: ${data.email}`);
        doc.text(`TELÉFONO: ${data.phone}`);
        doc.text(`DIRECCIÓN: ${data.address}`);

        doc.moveDown(2);

        // Cláusulas
        doc.fontSize(12).font('Helvetica-Bold').text('PRIMERA: OBJETO');
        doc.moveDown();
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(
            'El presente contrato tiene por objeto establecer los términos y condiciones bajo los cuales el DISTRIBUIDOR comercializará los servicios de firma electrónica proporcionados por NEXUS SOLUCIONES.',
            { align: 'justify' },
          );

        doc.moveDown(2);

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('SEGUNDA: PRECIOS Y PRODUCTOS');
        doc.moveDown();
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(
            'El DISTRIBUIDOR comercializará los siguientes productos con los precios establecidos:',
          );

        doc.moveDown();

        // Tabla de precios
        const tableTop = doc.y;
        const col1X = 50;
        const col2X = 250;
        const col3X = 400;

        // Encabezados de tabla
        doc
          .font('Helvetica-Bold')
          .text('PRODUCTO', col1X, tableTop)
          .text('VIGENCIA', col2X, tableTop)
          .text('PRECIO', col3X, tableTop);

        doc.moveDown();

        // Filas de tabla
        data.plans.forEach((plan) => {
          const durationText = this.formatDuration(
            plan.duration,
            plan.durationType,
          );
          const priceText = `$${(plan.customPrice / 100).toFixed(2)}`;

          doc
            .font('Helvetica')
            .text(plan.perfil, col1X, doc.y)
            .text(durationText, col2X, doc.y - 12)
            .text(priceText, col3X, doc.y - 12);

          doc.moveDown();
        });

        doc.moveDown(2);

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('TERCERA: OBLIGACIONES DEL DISTRIBUIDOR');
        doc.moveDown();
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(
            '1. Promover y comercializar los servicios de firma electrónica de NEXUS SOLUCIONES.',
            { align: 'justify' },
          );
        doc
          .text(
            '2. Mantener la confidencialidad de la información proporcionada por NEXUS SOLUCIONES.',
            { align: 'justify' },
          )
          .moveDown(0.5);
        doc
          .text(
            '3. Cumplir con los precios establecidos en el presente contrato.',
            {
              align: 'justify',
            },
          )
          .moveDown(0.5);
        doc.text(
          '4. Brindar atención de calidad a los clientes finales y representar profesionalmente a NEXUS SOLUCIONES.',
          { align: 'justify' },
        );

        doc.moveDown(2);

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('CUARTA: OBLIGACIONES DE NEXUS SOLUCIONES');
        doc.moveDown();
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(
            '1. Proporcionar al DISTRIBUIDOR la plataforma y herramientas necesarias para la comercialización de los servicios.',
            { align: 'justify' },
          )
          .moveDown(0.5);
        doc
          .text(
            '2. Brindar soporte técnico y capacitación necesaria para el correcto desempeño del DISTRIBUIDOR.',
            { align: 'justify' },
          )
          .moveDown(0.5);
        doc.text(
          '3. Procesar las solicitudes de firma electrónica realizadas a través del DISTRIBUIDOR.',
          { align: 'justify' },
        );

        doc.moveDown(2);

        doc.fontSize(12).font('Helvetica-Bold').text('QUINTA: VIGENCIA');
        doc.moveDown();
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(
            'El presente contrato tendrá vigencia indefinida desde la fecha de su suscripción, pudiendo ser terminado por cualquiera de las partes mediante notificación escrita con 30 días de anticipación.',
            { align: 'justify' },
          );

        doc.moveDown(3);

        // Firmas
        doc
          .fontSize(10)
          .font('Helvetica')
          .text('_________________________', 100, doc.y, { align: 'left' })
          .text('_________________________', 350, doc.y - 12, {
            align: 'left',
          });

        doc.moveDown();

        doc
          .text('NEXUS SOLUCIONES', 100, doc.y, { align: 'left' })
          .text('DISTRIBUIDOR', 350, doc.y - 12, { align: 'left' });

        doc
          .fontSize(9)
          .text('Representante Legal', 100, doc.y + 5, { align: 'left' })
          .text(data.distributorName, 350, doc.y - 9, { align: 'left' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private formatDuration(duration: string, durationType: string): string {
    const typeMap: Record<string, string> = {
      D: 'días',
      M: 'mes',
      MS: 'meses',
      Y: 'año',
      YS: 'años',
    };

    return `${duration} ${typeMap[durationType] || durationType}`;
  }
}
