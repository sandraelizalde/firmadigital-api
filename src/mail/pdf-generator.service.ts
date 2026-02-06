import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

interface ContractData {
  distributorName: string;
  identification: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  representativeName: string;
  representativeId: string;
  plans: Array<{
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

        // Título principal
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(
            'CONTRATO DE PRESTACIÓN DE SERVICIOS PARA COMERCIALIZACIÓN DE',
            { align: 'center' },
          )
          .text('FIRMA ELECTRÓNICA DE NEXUS SOLUCIONES S.A.S. B.I.C.', {
            align: 'center',
          })
          .text('PARA FACTURACIÓN', { align: 'center' });

        doc.moveDown(2);

        // Fecha y lugar
        const formattedDate = new Intl.DateTimeFormat('es-EC', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }).format(data.date);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`En la ciudad de Quito, el ${formattedDate}`, {
            align: 'justify',
          });

        doc.moveDown(2);

        // ANTECEDENTES
        doc.fontSize(10).font('Helvetica-Bold').text('ANTECEDENTES:');
        doc.moveDown();

        // 1. LAS PARTES
        doc.fontSize(10).font('Helvetica-Bold').text('1.  LAS PARTES');
        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'I.       Por una parte, NEXUS-SOLUCIONES S.A.S. B.I.C. constituida bajo las leyes de la República de Ecuador, con domicilio en la ciudad de Quito, con RUC No. 0791844185001, representada legalmente por la empresa Holding-Collaguazo S.A.S. en su calidad de Gerente General, identificado con numero de Ruc: 0791843630001, quien para los efectos del presente contrato se denominará "NEXUS SOLUCIONES".',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            `II.      Por otra parte, ${data.distributorName.toUpperCase()} con domicilio en la ciudad de ${data.city.toUpperCase()} con Cédula o Ruc No. ${data.identification}, representada legalmente por el señor(a) ${data.representativeName.toUpperCase()} de nacionalidad ECUATORIANA, identificado con Cédula de Ciudadanía o ruc número ${data.representativeId} quien para los efectos del presente contrato se denominará "EL CLIENTE".`,
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Se adjuntan los nombramientos correspondientes a cada parte, que se anexan y hacen parte integrante del presente contrato para todos los efectos legales.',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // 2. INTERPRETACIONES
        doc.fontSize(10).font('Helvetica-Bold').text('2.  INTERPRETACIONES');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Las palabras técnicas o científicas que no se encuentren definidas expresamente en el texto de este contrato, tendrán el significado que les corresponda según la técnica o ciencia respectiva, y las demás palabras se entenderán en su sentido natural y obvio, según el uso general de las mismas.',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // 3. DECLARACIONES
        doc.fontSize(10).font('Helvetica-Bold').text('3.  DECLARACIONES');
        doc.moveDown();

        // a. Por parte de "NEXUS SOLUCIONES"
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('     a. Por parte de "NEXUS SOLUCIONES":');
        doc.moveDown();

        const nexusDeclarations = [
          'Que "NEXUS SOLUCIONES" y su representante legal tienen capacidad y facultades para la celebración del presente contrato.',
          'Que "NEXUS SOLUCIONES" tiene por objeto el diseño y desarrollo de sistemas y soluciones tecnológicas para firma electrónica, certificación digital, certificación de identidad, gestión documental, blockchain pública y privada.',
          'Que "NEXUS SOLUCIONES" se encuentra acreditada como Ente de Certificación de la Información y Servicios Relacionados en el Ecuador.',
          'Que, en desarrollo de su objeto social, "NEXUS SOLUCIONES" actividades de preparación de las declaraciones tributarias de las personas y empresas; asesoramiento y de representación de clientes ante las autoridades tributarias.',
          'Que el otorgamiento del presente Contrato no requiere autorización administrativa, ni viola prohibición legal alguna.',
          'Que las obligaciones asumidas por "NEXUS SOLUCIONES" en virtud del Contrato son válidas y pueden ser exigibles.',
          'Que "NEXUS SOLUCIONES" cuenta con todas las autorizaciones legales y privadas necesarias para llevar a cabo las actividades objeto del presente contrato.',
        ];

        nexusDeclarations.forEach((declaration) => {
          doc
            .fontSize(9)
            .font('Helvetica')
            .text(`•  ${declaration}`, { align: 'justify' });
          doc.moveDown(0.5);
        });

        doc.moveDown();

        // b. Por parte de "EL CLIENTE"
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('     b. Por parte de "EL CLIENTE":');
        doc.moveDown();

        const clientDeclarations = [
          'Que la entidad y su representante legal tienen capacidad y facultades para la celebración del presente contrato y que el Contrato se encuentra dentro del ámbito de su objeto social.',
          'Que el objeto social de "EL CLIENTE" otras actividades de contabilidad, teneduría de libros.',
          'Que las obligaciones asumidas por "EL CLIENTE" en virtud del Contrato son válidas y pueden ser exigibles.',
          'Que el otorgamiento del presente Contrato no requiere autorización administrativa, ni viola prohibición legal alguna.',
        ];

        clientDeclarations.forEach((declaration) => {
          doc
            .fontSize(9)
            .font('Helvetica')
            .text(`•  ${declaration}`, { align: 'justify' });
          doc.moveDown(0.5);
        });

        doc.moveDown(1.5);

        // 4. DECLARACIONES CONJUNTAS
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('4.  DECLARACIONES CONJUNTAS');
        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            `Los representantes legales de ${data.distributorName} y de "NEXUS SOLUCIONES" declaran:`,
            { align: 'justify' },
          );
        doc.moveDown();

        const jointDeclarations = [
          'Que ambas partes están interesadas en establecer el marco contractual que regule la prestación de servicio de para acceder al servicio de emisión en línea y física y comercialización de firmas electrónicas que "NEXUS SOLUCIONES" proveerá a "EL CLIENTE".',
          'Que las partes tienen autonomía técnica, administrativa y financiera.',
          'Que, en consecuencia, el personal que éstas designen para la ejecución del presente contrato no tendrá vínculo laboral con la otra parte, por lo que, bajo ninguna circunstancia, podrán alegar la falta de pago de obligaciones laborales y mucho menos, el personal de cada una de las partes podrá exigir a la otra tales pagos. Bajo esta consideración, ninguna de las partes, tiene obligaciones con el IESS y Ministerio de Trabajo, por el manejo del personal, de la otra parte.',
          'Que las partes actuarán, cada una, por su cuenta y riesgo en la ejecución del presente Contrato, disponiendo de su capacidad técnica y financiera, utilizando sus propias herramientas, siendo responsables de vincular al personal idóneo que requieran para el cabal cumplimiento de sus obligaciones, y en general ejecutarán el presente Contrato de manera diligente y oportuna. En línea con lo anterior, las partes se asegurarán de que no existirá solidaridad laboral con la otra parte por las obligaciones que surjan en favor de cualquiera de sus empleados o contratistas.',
          'Que se encuentran altamente comprometidas en monitorear, prevenir y rechazar cualquier transacción que resulte sospechosa, evitando así que pueda ser utilizada la plataforma de emisión de firmas electrónicas de NEXUS SOLUCIONES, y las transacciones que a través de ésta se procesen.',
          'Que las partes de mutuo acuerdo podrán designar cada una, representantes en los que se delegue poderes, funciones o autorizaciones relacionadas con el objeto del presente contrato, para fortalecer el correcto funcionamiento y ejecución de este contrato.',
        ];

        jointDeclarations.forEach((declaration) => {
          doc
            .fontSize(9)
            .font('Helvetica')
            .text(`•  ${declaration}`, { align: 'justify' });
          doc.moveDown(0.5);
        });

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Que en mérito de todo lo anterior y basándose en la veracidad de las declaraciones que anteceden, ambas partes convienen en la celebración del Contrato, que se regirá por las siguientes cláusulas:',
            { align: 'justify' },
          );

        // Nueva página para cláusulas
        doc.moveDown(1.5);

        // CLÁUSULA PRIMERA: OBJETO
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA PRIMERA: OBJETO.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'El presente contrato tiene por objeto prestar servicios para la emisión de firmas electrónicas en línea o física y su comercialización, para el uso exclusivo de "EL CLIENTE", dentro de su plataforma de facturación electrónica (ITD Desarrollo De Sistemas Web Y Moviles) de propiedad de "EL CLIENTE". Para el acceso al servicio objeto del presente contrato por parte de "EL CLIENTE", éste deberá cumplir con las disposiciones establecidas en el presente contrato.',
            { align: 'justify' },
          );

        doc.moveDown(2);

        // CLÁUSULA SEGUNDA: OBLIGACIONES
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(
            'CLÁUSULA SEGUNDA: OBLIGACIONES POR PARTE DE "NEXUS SOLUCIONES" Y "EL CLIENTE".',
          );
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text('OBLIGACIONES POR PARTE DE "NEXUS SOLUCIONES"');
        doc.moveDown(1.5);

        // Continúa CLÁUSULA SEGUNDA con A, B, C, etc.
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('A. ', { continued: true })
          .font('Helvetica-Oblique')
          .text('Autorizar el uso del sistema ', { continued: true })
          .font('Helvetica')
          .text(
            'de emisión en línea o física y comercialización de firmas electrónicas: "NEXUS SOLUCIONES" concede, durante la vigencia del presente contrato a "EL CLIENTE" una autorización para usar dicho servicio de forma externa, la cual se sujeta a las condiciones del presente contrato. En este mismo acto, "EL CLIENTE" acepta tales condiciones, de manera que sólo tras la aceptación expresa de tales condiciones "EL CLIENTE" podrá utilizar lícitamente el sistema antes mencionado, el cual es propiedad de "NEXUS SOLUCIONES".',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('B. ', { continued: true })
          .font('Helvetica-Oblique')
          .text('Poner a disposición el sistema que contiene la plataforma ', {
            continued: true,
          })
          .font('Helvetica')
          .text(
            'de emisión en línea y física y comercialización de firmas electrónicas: para tal fin "NEXUS SOLUCIONES":',
            { align: 'justify' },
          );

        doc.moveDown();

        // B.1.
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('     B.1.  ', { continued: true })
          .font('Helvetica')
          .text(
            'Enviará a "EL CLIENTE" a través de correo electrónico, suministrado previamente por éste, la documentación técnica con las instrucciones a seguir para realizar la integración de su sistema al Servicio de validación de identidad mediante consulta de datos.',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // B.2.
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('     B.2.  ', { continued: true })
          .font('Helvetica')
          .text(
            'Pondrá a disposición de "EL CLIENTE" personal para realizar la asistencia técnica, durante el proceso, pero no será el responsable de realizar la integración del proceso. En caso de querer integrar nuevos sitios, se enviará a EL CLIENTE los valores adicionales que se generan de estas integraciones.',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // C. Servicio de Atención
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('C. ', { continued: true })
          .font('Helvetica-Oblique')
          .text('Servicio de Atención a "EL CLIENTE": ', { continued: true })
          .font('Helvetica')
          .text(
            '"NEXUS SOLUCIONES" prestará por sí o a través de un tercero autorizado bajo su responsabilidad, el servicio de atención a "EL CLIENTE". Dicho servicio consiste en la asistencia técnica telefónica o por medios no presenciales, destinada a resolver las dudas que se presenten con relación al funcionamiento y utilización de la plataforma cuya autorización de uso es objeto de este contrato.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'El Servicio de Atención a "EL CLIENTE" estará disponible de lunes a viernes de 9:00 a.m. a 5:00 p.m., sólo en el caso de suspensión total de la plataforma, "EL CLIENTE" recibirá atención 24/7 en el número celular asignado para tal fin.',
            { align: 'justify' },
          );

        // Nueva página

        // D. Disponibilidad
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('D. ', { continued: true })
          .font('Helvetica-Oblique')
          .text('Disponibilidad: ', { continued: true })
          .font('Helvetica')
          .text(
            '"NEXUS SOLUCIONES" no es responsable por la disponibilidad que las plataformas tecnológicas o de consulta de terceros, puedan tener.',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // E. Responsabilidad plataformas
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('E. ', { continued: true })
          .font('Helvetica')
          .text(
            'Igualmente "NEXUS SOLUCIONES" no se hará responsable cuando estas plataformas se encuentren fuera de línea o presenten algún inconveniente en su funcionamiento, que imposibiliten la prestación del servicio de nuestra plataforma, no dará lugar a ningún tipo de responsabilidad para "NEXUS SOLUCIONES" pues tales redes y sistemas, no se encuentran operados por "NEXUS SOLUCIONES".',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // F. Nuevas versiones
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('F. ', { continued: true })
          .font('Helvetica')
          .text(
            'Para los efectos del cumplimiento de las obligaciones previamente establecidas y a cargo de "NEXUS SOLUCIONES", la plataforma comprende toda nueva versión sobre la misma, en virtud de los cual "NEXUS SOLUCIONES" se reserva el derecho a sustituir dicho sistema por nuevas versiones, cuyas actualizaciones no tendrán ningún costo adicional.',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // G. Responsabilidad fallas
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('G. ', { continued: true })
          .font('Helvetica')
          .text(
            '"NEXUS SOLUCIONES" no será responsable por las fallas que pudieran generarse, en el uso de la plataforma de emisión en línea y física y comercialización de firmas electrónicas, generadas por el mal manejo de equipos y sistemas de "EL CLIENTE", quien será el único responsable de dar el oportuno mantenimiento a los equipos y sistemas, por ellos empleados, para un correcto funcionamiento de nuestra plataforma.',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // H. Remitir factura
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('H. ', { continued: true })
          .font('Helvetica')
          .text(
            'Remitir de forma SEMANAL la factura correspondiente al consumo semanal de servicio, dentro de los 5 primeros días de la semana siguiente.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Se considera firma emitida, todas y cada una de las firmas electrónicas que se encuentren como activas y revocadas por solicitud del usuario final.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'En el caso de solicitudes de revocaciones de firmas electrónicas, se realizarán únicamente bajo solicitud expresa del ciudadano propietario y emisor de la firma electrónica. Bajo ninguna excepción se tramitarán revocaciones que no sean solicitadas expresamente por el propietario y emisor de la firma electrónica.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'No existen devolución de valores en los casos de firmas emitidas que luego son revocadas por solicitud del propietario y emisor de la firma electrónica.',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // I. Notificar cambios
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('I. ', { continued: true })
          .font('Helvetica')
          .text(
            'Notificar a "EL CLIENTE" sobre el cambio de tarifas de las firmas electrónicas.',
            { align: 'justify' },
          );

        // Nueva página para OBLIGACIONES DEL CLIENTE
        doc.moveDown(1.5);
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('OBLIGACIONES POR PARTE DE "EL CLIENTE".');
        doc.moveDown(1.5);

        // A. Autorización datos
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('A. ', { continued: true })
          .font('Helvetica')
          .text(
            'Previo a cualquier emisión de firma electrónica a realizarse dentro del servicio de emisión en línea o física: "EL CLIENTE" deberá contar con la autorización y consentimiento expreso del titular de ésta, para el tratamiento de datos personales en concordancia con lo establecido la Ley de Protección de Datos de Datos Personales (LOPDP).',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // B. Garantizar uso autorizado
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('B. ', { continued: true })
          .font('Helvetica')
          .text(
            'Garantizar a NEXUS SOLUCIONES" que las firmas electrónicas que sean emitidas y comercializadas por "EL CLIENTE", en atención al presente contrato se utilicen exclusivamente para los fines autorizados por el titular y propietario de la firma electrónica, en base a la cláusula primera del presente contrato.',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // C. Garantizar datos
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('C. ', { continued: true })
          .font('Helvetica')
          .text(
            'Garantizar que los datos que sean conocidos en atención al presente contrato se utilicen exclusivamente para los fines autorizados por el titular y propietario de la firma electrónica, en ningún caso los datos conocidos por "EL CLIENTE" podrán ser transferidos o comunicados a terceros.',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // D. Utilizar servicio
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('D. ', { continued: true })
          .font('Helvetica')
          .text(
            'Utilizar el servicio contratado únicamente para los fines enmarcados de acuerdo con lo indicado en el presente contrato, y demás normativa que pueda emitir la Agencia de Regulación y Control de las Telecomunicaciones y la Autoridad de Protección de Datos Personales.',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // E. No disponer autorización
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('E. ', { continued: true })
          .font('Helvetica')
          .text(
            '"EL CLIENTE" no podrá disponer de ninguna forma de la autorización de uso otorgada, ni en todo ni en parte, así como tampoco podrá autorizar a terceros el uso del sistema de la plataforma de emisión de firmas electrónicas.',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // F. Monitorear transacciones
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('F. ', { continued: true })
          .font('Helvetica')
          .text(
            '"EL CLIENTE" se compromete a monitorear, prevenir y rechazar cualquier transacción que resulte sospechosa, evitando así que pueda ser utilizada la plataforma de NEXUS SOLUCIONES, propiedad de NEXUS SOLUCIONES, y las transacciones que a través de ésta se procesen, como instrumento para el ocultamiento, manejo, o aprovechamiento en cualquier forma de la suplantación de identidad para dar apariencia de legalidad a actividades delictivas.',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // G. Mantener indemne
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('G. ', { continued: true })
          .font('Helvetica')
          .text(
            'Mantener indemne a "NEXUS SOLUCIONES" por cualquier reclamación que efectúe un tercero o cualquier autoridad administrativa o judicial.',
            { align: 'justify' },
          );

        // Nueva página para CLÁUSULA TERCERA
        doc.moveDown(1.5);
        // CLÁUSULA TERCERA: INTEGRACIÓN
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA TERCERA: INTEGRACIÓN.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Dentro de los ocho (8) días hábiles posteriores a la recepción en el domicilio contractual, del contrato debidamente firmado por "EL CLIENTE", el área de soporte técnico de "NEXUS SOLUCIONES" enviará un comunicado a "EL CLIENTE" para que éste inicie el proceso de integración de nuestra plataforma dentro del sitio, plataforma y/o ecosistema de propiedad de "EL CLIENTE".',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            '"EL CLIENTE" hará la integración por su propia cuenta y riesgo y tendrá un plazo máximo de una (1) semana para culminar dicho proceso, término de tiempo que será computable desde el envío por correo electrónico del comunicado referido al inicio de esta cláusula. En caso de requerir el soporte de "NEXUS SOLUCIONES" este será costeado por fuera del alcance de este contrato, como consta en el literal C, de la CLAUSULA SEGUNDA del presente contrato.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Cumplido este plazo o una vez sean marcados en producción se iniciará la facturación del del servicio.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'El desarrollo de "EL CLIENTE" deberá cumplir con las especificaciones técnicas previamente establecidas y comunicadas por "NEXUS SOLUCIONES" para que su sitio, plataforma y/o ecosistema pueda ser puesto en producción, es decir, para poder emitir firmas electrónicas y firmar digitalmente los documentos digitales que conforman parte del flujo de "EL CLIENTE".',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'En caso de que "EL CLIENTE" decida contratar con un tercero el desarrollo para la integración, el tercero que se contrate para tal propósito, deberá cumplir con los requisitos técnicos que necesita la plataforma y en todo caso, "NEXUS SOLUCIONES" será ajeno a la relación jurídica y comercial que "EL CLIENTE" establezca con el tercero con quien contrate su desarrollo, y no tendrá ninguna responsabilidad civil o laboral con tal contratación.',
            { align: 'justify' },
          );

        // Nueva página para CLÁUSULA CUARTA
        doc.moveDown(1.5);
        // CLÁUSULA CUARTA: EXCLUSIÓN DE RESPONSABILIDAD
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(
            'CLÁUSULA   CUARTA:  EXCLUSIÓN  DE  RESPONSABILIDAD.  "NEXUS SOLUCIONES"',
          )
          .text('ASOCIADOS" no será responsable en los siguientes eventos:');
        doc.moveDown(1.5);

        // A. Afluencia de tráfico
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('     A. ', { continued: true })
          .font('Helvetica-Oblique')
          .text('Afluencia de tráfico: ', { continued: true })
          .font('Helvetica')
          .text(
            '"NEXUS SOLUCIONES" no garantiza la realización de un número cualquiera de visitas, recaudos, ventas o ingresos a través del sitio, tienda virtual o física de "EL CLIENTE" por parte de los usuarios; en consecuencia, "EL CLIENTE" exime a "NEXUS SOLUCIONES" de toda responsabilidad por los daños y perjuicios de toda naturaleza que pudieran deberse, entre otras, a la ausencia de visitas o negocios mediante el sitio, tienda virtual o física por parte de los usuarios y/o de ventas electrónicas y/o por la no obtención de unos ingresos mínimos por ventas electrónicas. Es decir, la plataforma es una herramienta de medio, mas no de resultados, de acuerdo con lo antes señalado.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            '"NEXUS SOLUCIONES" no asume responsabilidad alguna por la presencia de fraude en las transacciones, entendiendo por fraude de manera general, el engaño, abuso, las maniobras inescrupulosas que puedan generar por parte de usuarios de nuestra plataforma contra cargos para "EL CLIENTE" y será este último quien asuma los mismos. "EL CLIENTE", dejará indemne y eximirá de toda responsabilidad a "NEXUS SOLUCIONES" en eventos de este tipo.',
            { align: 'justify' },
          );

        doc.moveDown(1.5);

        // B. Control de productos
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('     B. ', { continued: true })
          .font('Helvetica-Oblique')
          .text('Control de productos y ventas electrónicas. ', {
            continued: true,
          })
          .font('Helvetica')
          .text(
            '"NEXUS SOLUCIONES" es enteramente ajena y no tiene la obligación de ejercer ninguna clase de control a los productos, ni las ofertas relativas a los productos incluidas en el sitio, tienda virtual o física de "EL CLIENTE", ni las condiciones de las ventas electrónicas o físicas propuestas por "EL CLIENTE", ni el cumplimiento de las obligaciones derivadas de las ventas electrónicas o físicas, o a la calidad por parte de "EL CLIENTE", lo que excluye de forma expresa a "NEXUS SOLUCIONES" de cualquier clase de garantía y responsabilidad al respecto frente a "EL CLIENTE" y frente a terceros.',
            { align: 'justify' },
          );

        // Nueva página para CLÁUSULA QUINTA
        doc.moveDown(1.5);
        // CLÁUSULA QUINTA: CONTROL Y SEGURIDAD DE LA INFORMACIÓN
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA QUINTA: CONTROL Y SEGURIDAD DE LA INFORMACIÓN.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'En los casos en que "EL CLIENTE" definitivamente deba almacenar información de sus usuarios, deberá informar al mismo, que adicional al almacenamiento de información que "NEXUS SOLUCIONES" requiere realizar como parte de la normativa que le rige como Ente de Certificación, mediante la aceptación de "Términos y Condiciones y Protección de Datos" propios de su entorno de consumo de información.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            '"EL CLIENTE" para conectarse a nuestra plataforma usará los mecanismos tecnológicos que serán determinados entra las partes y sus respectivos departamentos técnicos.',
            { align: 'justify' },
          );

        doc.moveDown(2);

        // CLÁUSULA SEXTA: NO EXCLUSIVIDAD
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA SEXTA: NO EXCLUSIVIDAD.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Por la celebración de este contrato, no podrá "EL CLIENTE" exigir exclusividad a "NEXUS SOLUCIONES". En este sentido "EL CLIENTE" acepta expresamente que "NEXUS SOLUCIONES" puede, directamente o en asocio de terceros, en los mismos términos o en términos diversos a los pactados en el presente contrato, desarrollar, establecer y celebrar otros contratos de uso del sistema de nuestra plataforma, cuyo objeto sea la contratación electrónica de cualquiera de los productos y/o servicios idénticos, similares, competidores o relacionados con los productos que "EL CLIENTE" ofrece a través de su sitio, su tienda virtual, física o de cualquier otro modo.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Por su parte, "EL CLIENTE", no podrá comercializar de ninguna forma la plataforma de NEXUS SOLUCIONES, pues el presente contrato no transfiere la propiedad de la plataforma, por lo que "EL CLIENTE" simplemente es un usuario, y en caso de efectuar integraciones independientes, será también responsable por las mismas y por la información que por medio de ellas se traslade',
            { align: 'justify' },
          );

        // Nueva página para CLÁUSULA SÉPTIMA
        doc.moveDown(1.5);
        // CLÁUSULA SÉPTIMA: PRECIO Y FORMA DE PAGO
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA SÉPTIMA: PRECIO Y FORMA DE PAGO');
        doc.moveDown(1.5);

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            '"EL CLIENTE" se obliga a pagar a "NEXUS SOLUCIONES" bajo el precio o precios pactados dentro de las condiciones que se detallan en la propuesta comercial anexada al presente contrato, denominada Anexo 1.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'En caso de mora en el pago de dichas sumas, "NEXUS SOLUCIONES" podrá suspender el servicio e igualmente queda facultada para reportar tal situación a las centrales de riesgo, para cuyo efecto, con la sola firma del presente contrato se autoriza dicho reporte.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Todos los valores detallados en la propuesta anexa a este contrato incluyen IVA. "EL CLIENTE" deberá cancelar diariamente los montos totales correspondientes a los servicios de firmas electrónicas emitidas.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(
            'Al día siguiente de la generación de dichas firmas, se enviará al "EL CLIENTE" un reporte detallado que incluirá el valor exacto a pagar por las firmas emitidas el día anterior a las cuentas bancarias indicadas por " NEXUS SOLUCIONES ".',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            '"EL CLIENTE" se obliga a realizar el pago de dicho valor a más tardar dentro de las mismas',
            { align: 'justify' },
          )
          .font('Helvetica-Bold')
          .text('veinticuatro (24) horas', { continued: true })
          .font('Helvetica')
          .text(' siguientes a la recepción de este reporte de cobro.');

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Facturación Consolidada Semanal:');

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'La facturación oficial y consolidada, que incluirá el total de los montos generados y pagados durante la semana anterior, será emitida de manera periódica ',
            { align: 'justify', continued: true },
          )
          .font('Helvetica-Bold')
          .text('todos los lunes', { continued: true })
          .font('Helvetica')
          .text('.');

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('CLAUSULA OCTAVA: COMUNICACIÓN DE INFORMACIÓN.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Las partes se comprometen a transmitirse toda la información que pudiera ser necesaria para el adecuado cumplimiento de sus obligaciones.',
            { align: 'justify' },
          );

        // Nueva página para CLÁUSULA NOVENA
        doc.moveDown(1.5);
        // CLÁUSULA NOVENA: INFORMACIÓN CONFIDENCIAL y CONFIDENCIALIDAD
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(
            'CLÁUSULA NOVENA: INFORMACIÓN CONFIDENCIAL y CONFIDENCIALIDAD.',
          );
        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'La INFORMACIÓN sólo podrá ser utilizada para los propósitos que se deriven de las relaciones entre las Partes, por este contrato. Adicionalmente, sólo podrá reproducirse si ello resulta necesario para cumplir tales propósitos y las Partes podrán dársela a conocer a aquellos empleados, trabajadores o asesores que tengan necesidad de conocerla en beneficio de sus intereses comunes. En caso de que se les entregue información confidencial a dichos empleados, trabajadores o asesores, se les deberá (i) advertir sobre el carácter confidencial de la INFORMACIÓN; y, (ii) poner en conocimiento de dichos funcionarios los términos de este Acuerdo, los mismos que deberán aceptar y serán vinculantes legalmente para aquellos funcionarios, por lo que responderán civil y penalmente por las acciones que puedan derivarse en su contra respecto de la mala utilización de aquella INFORMACIÓN que las partes consideran como Confidencial.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Las Partes se comprometen a mantener en reserva y estricta confidencialidad toda la INFORMACIÓN una de la otra bajo pena de responder a las acciones civiles correspondientes, indemnizar los daños y perjuicios ocasionados, así como de responder a las acciones legales pertinentes que pudieran derivarse. Por tanto, toda la INFORMACIÓN (sea escrita, verbal, establecida por medios electrónicos u otros sistemas) que las Partes se suministren mutuamente, será tratada en forma confidencial.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Toda la INFORMACIÓN, seguirá siendo de propiedad exclusiva de quien la revela y le será devuelta por la otra parte de manera íntegra, junto con todas las copias que de la misma se hubieren hecho a través de los diversos mecanismos tecnológicos, cuando ya no sea necesario conservarla.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Las obligaciones de confidencialidad y no divulgaciones previstas en este Convenio estarán en vigor por el término en que dure el acuerdo del cual hace parte la presente cláusula, incluyendo sus modificaciones o adiciones y dos (2) años más, de forma posterior a la terminación por cualquier causa.',
            { align: 'justify' },
          );

        // Nueva página

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'No obstante, la anterior obligación de confidencialidad no se aplicará a aquella información que resulte accesible al público por causa distinta del incumplimiento de la obligación de confidencialidad por parte de "EL CLIENTE" y que haya sido publicada con anterioridad a la fecha del Contrato, que obre ya en poder de "EL CLIENTE" y no esté sujeta a un acuerdo de confidencialidad entre las partes, o que sea independientemente desarrollada por "EL CLIENTE".',
            { align: 'justify' },
          );

        doc.moveDown(2);

        // CLÁUSULA DÉCIMA
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(
            'CLÁUSULA DÉCIMA: "NEXUS SOLUCIONES" cumple con las políticas de tratamiento',
          )
          .text(
            'de datos personales e información confidencial establecidas en la legislación.',
          );

        doc.moveDown(2);

        // CLÁUSULA DÉCIMA PRIMERA
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA DÉCIMA PRIMERA: CUMPLIMIENTO DE LOS PLAZOS.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Todos los plazos previstos en este contrato son esenciales, y deberán cumplirse sin términos de gracia o cortesía. El incumplimiento de éstos por parte de "EL CLIENTE" de la prestación producirá la mora en los términos establecidos en el Código Civil, sin necesidad de requerimiento alguno.',
            { align: 'justify' },
          );

        doc.moveDown(2);

        // CLÁUSULA DÉCIMA SEGUNDA
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA DÉCIMA SEGUNDA: INTEGRIDAD.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Este contrato que contiene las condiciones generales constituye la manifestación expresa de la voluntad de ambas partes con relación a la materia aquí contenida, y deja sin validez todas las conversaciones, acuerdos orales y escritos que se hayan podido realizar con anterioridad a la fecha del Contrato. Sin embargo, hace parte integrante de este contrato la propuesta comercial enviada a "EL CLIENTE" previa suscripción del presente acuerdo.',
            { align: 'justify' },
          );

        doc.moveDown(2);

        // CLÁUSULA DÉCIMA TERCERA
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA DÉCIMA TERCERA: DIVISIBILIDAD.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Las partes convienen que cualquier sanción jurídica, como anulabilidad, ineficacia, inexistencia, validez o cualquier sanción jurídica similar que afecte la validez o aplicación de cualquiera de las disposiciones del presente contrato, no afectará la validez o aplicación de las demás disposiciones del mismo. En todo caso, en el evento de producirse cualquiera de las sanciones jurídicas a las que se ha hecho referencia, las partes se comprometen de buena fe a encontrar mecanismos que permitan, en la medida de lo posible y de acuerdo con la regulación vigente y aplicable, cumplir con las finalidades inicialmente buscadas mediante la disposición que hubiera sido afectada en su validez o aplicación.',
            { align: 'justify' },
          );

        // Nueva página

        // CLÁUSULA DÉCIMA CUARTA
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA DÉCIMA CUARTA: RENUNCIA.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'La renuncia por cualquiera de las partes a los derechos o facultades derivados de este contrato deberá realizarse por escrito. La omisión por cualquiera de las partes a exigir el estricto cumplimiento de cualquier término contractual en una o más ocasiones no podrá ser considerada en ningún caso como renuncia, ni privará a esa parte del derecho de exigir a la otra parte el estricto cumplimiento de la(s) obligación(es) contractuales derivadas a posteriori.',
            { align: 'justify' },
          );

        doc.moveDown(2);

        // CLÁUSULA DÉCIMA QUINTA
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA DÉCIMA QUINTA: SUSPENSIÓN DEL CONTRATO.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Cuando sobrevengan situaciones de fuerza mayor debidamente comprobadas, las partes de común acuerdo podrán suspender temporalmente la ejecución del contrato hasta por un término de 30 días, mediante la suscripción de un acta donde conste tal evento y los motivos que hayan dado lugar a la misma y el término de suspensión que se prevea, sin que para los efectos del periodo de explotación se compute el tiempo de la suspensión.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'El Contrato se reanudará una vez culmine el término inicialmente establecido o cuando desaparezcan las causas que originaron la suspensión, lo que sobrevenga primero.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Si las causas que originaron la fuerza mayor se prolongan más allá de treinta (60) días sin que las partes alcanzaran un acuerdo sobre las medidas a tomar, cualquiera de ellas estará facultado para dar por terminado el contrato, sin lugar a indemnización de ningún tipo, pues el contrato se vería finalizado por acuerdo de las partes.',
            { align: 'justify' },
          );

        doc.moveDown(2);

        // CLÁUSULA DÉCIMA SEXTA
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA DÉCIMA SEXTA: MODIFICACIÓN.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Cualquier modificación del contrato deberá realizarse por escrito, suscrito por los representantes legítimos y con poder suficiente de cada una de las partes.',
            { align: 'justify' },
          );

        doc.moveDown(2);

        // CLÁUSULA DÉCIMA SÉPTIMA
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA DÉCIMA SÉPTIMA: DURACIÓN DEL CONTRATO.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'La duración del contrato será por un término de un año (1 año). Este contrato se dará por renovado por el término de un año (1 año) sucesivamente, si ninguna de las partes expresa lo contrario 30 días antes de la fecha de terminación del contrato.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Las partes podrán darlo por terminado en cualquier momento aduciendo alguna de las causales contenidas en la cláusula décima novena del presente contrato siempre y cuando se le notifique a la otra parte con un plazo mínimo de treinta (30) días de anticipación.',
            { align: 'justify' },
          );

        // Nueva página

        // CLÁUSULA DÉCIMA OCTAVA
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA DÉCIMA OCTAVA: TERMINACIÓN.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Serán causas de terminación del contrato en forma unilateral:',
            { align: 'justify' },
          );
        doc.moveDown();

        const terminationCauses = [
          'La cesación de pagos o quiebra comprobada de "EL CLIENTE";',
          'El cese, por cualquier motivo, de una de las partes en la continuidad de sus negocios o línea de actividad principal, la alteración sustancial de la naturaleza de su empresa, su disolución, liquidación o cierre ordenado por autoridad administrativa o judicial, así como la cesión global de sus activos.',
          'La terminación del contrato por cualquiera de las partes como consecuencia del incumplimiento en una o varias de las obligaciones del presente contrato, siempre que tal incumplimiento no fuera subsanado en un plazo máximo de cinco (5) días tras petición escrita de la parte afectada con el incumplimiento en la que solicite su saneamiento, a no ser que dicho incumplimiento sea considerado insubsanable o haga imposible el cumplimiento del presente contrato para la parte denunciante, en cuyo caso la terminación podrá ser inmediata, y ello en todo caso dejando a salvo a la parte afectada para que efectúe la reclamación que por daños y perjuicios pueda corresponderle.',
          'Por mutuo acuerdo entre las partes.',
        ];

        terminationCauses.forEach((cause, index) => {
          const letter = String.fromCharCode(65 + index); // A, B, C, D
          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(`${letter}. `, { continued: true })
            .font('Helvetica')
            .text(`${cause}`, { align: 'justify' });
          doc.moveDown();
        });

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('E. ', { continued: true })
          .font('Helvetica')
          .text(
            'La causal de terminación indicada en el literal (A.) producirá efectos ipso facto, sin necesidad que medie declaración de autoridad administrativa o judicial. Las demás causas de terminación sólo producirán sus efectos mediante comunicación dirigida con una antelación no inferior a 30 días calendario por la parte que no se encuentre en la situación constitutiva de la causa de terminación, en la que manifiesta a la otra parte su decisión de dar por terminado el contrato.',
            { align: 'justify' },
          );

        // Nueva página

        // CLÁUSULA DÉCIMA NOVENA
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA DÉCIMA NOVENA: LEY APLICABLE.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'El contrato y su ejecución se regirán por las leyes ecuatorianas y las regulaciones técnicas sobre la materia.',
            { align: 'justify' },
          );

        doc.moveDown(2);

        // CLÁUSULA VIGÉSIMA
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA VIGÉSIMA: SOLUCIÓN DE CONTROVERSIAS.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'En caso de controversias que se deriven de este contrato o diversas interpretaciones de los alcances de las disposiciones de este, o falta de pago de sus obligaciones, o cualquier otro incumplimiento contractual, las Partes libre y voluntariamente renuncian a fuero y domicilio y se obligan a acatar el laudo que expida un Tribunal Arbitral administrado por la Cámara de Comercio de Quito, de acuerdo con la Ley de Arbitraje y Mediación y el Reglamento del Centro de Arbitraje de dicha Cámara.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Las normas acordadas para este procedimiento son las siguientes:',
          );
        doc.moveDown();

        const arbitrationRules = [
          'El Tribunal Arbitral estará integrado por tres árbitros.',
          'Los árbitros serán seleccionados conforme a lo establecido en la Ley de Arbitraje y Mediación.',
          'Las partes se obligan a acatar el laudo que expida el Tribunal Arbitral y se comprometen a no interponer ningún tipo de recurso en contra del laudo arbitral.',
          'Para la ejecución de las medidas cautelares del Tribunal Arbitral está facultado para solicitar de los funcionarios públicos, judiciales, policiales y administrativos su cumplimiento, sin que sea necesario recurrir a juez ordinario alguno.',
          'El procedimiento arbitral será confidencial.',
        ];

        arbitrationRules.forEach((rule, index) => {
          const letter = String.fromCharCode(97 + index); // a, b, c, d, e
          doc
            .fontSize(9)
            .font('Helvetica')
            .text(`${letter})  ${rule}`, { align: 'justify' });
          doc.moveDown();
        });

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'El lugar de arbitraje será las instalaciones del Centro de Arbitraje y Mediación de la Cámara de Comercio de Quito.',
            { align: 'justify' },
          );

        // Nueva página

        // CLÁUSULA VIGÉSIMA PRIMERA
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA VIGÉSIMA PRIMERA: AUTORIZACIONES.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            '"EL CLIENTE"  autoriza a "NEXUS SOLUCIONES" para mencionar en los documentos y presentaciones que "NEXUS SOLUCIONES" elabora, desarrolla y maneja para con terceros, que "EL CLIENTE", es cliente de "NEXUS SOLUCIONES".',
            { align: 'justify' },
          );

        doc.moveDown(2);

        // CLÁUSULA VIGÉSIMA SEGUNDA
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA VIGÉSIMA SEGUNDA: COMUNICACIONES.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Toda comunicación entre las partes relativa al contrato deberá hacerse por escrito a las siguientes direcciones:',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(
            'CLAUSULA VIGESIMA TERCERA: DOCUMENTOS OBLIGATORIOS QUE DEBE PEDIR "EL',
          )
          .text(
            'CLIENTE" A S U S S O L IC I T A N T E D E F I R M A S E L E C T R ON I C A S O CL I E N T E S.',
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('SOLICITUD PERSONA NATURAL:');
        doc.moveDown(0.5);

        const naturalPersonDocs = [
          'FOTO DE CEDULA DE AMBOS LADOS LEGIBLE',
          'FOTO TIPO SELFIE SOSTENIENDO LA CEDULA LEGIBLE',
          'CORREO ELECTRONICO PROPORCINADO POR EL USUARIO SOLICITANTE QUE ESTE ACTIVO.',
          'DIRECCION',
          'TELEFONO',
          'ADICIONAL SI ES PARA FACTURAR; RUC EN PDF (si no es para facturar omita este requisito) SI EL USUARIO ES DE LA TERCERA EDAD SE DEBERA PEDIR UN VIDEO DE AUTORIZACION.',
        ];

        naturalPersonDocs.forEach((doc_item) => {
          doc.fontSize(8).font('Helvetica').text(`-   ${doc_item}`, 60);
          doc.moveDown(0.3);
        });

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('SOLICITUD PERSONA JURIDICA:');
        doc.moveDown(0.5);

        const juridicalPersonDocs = [
          'FOTO DE CEDULA DE AMBOS LADOS LEGIBLE',
          'FOTO TIPO SELFIE SOSTENIENDO LA CEDULA LEGIBLE',
          'CORREO ELECTRONICO PROPORCINADO POR EL USUARIO SOLICITANTE ACTIVO',
          'NOMBRAMIENTO',
          'RUC EN PDF',
          'DIRECCION',
          'TELEFONO',
          'SI EL USUARIO ES DE LA TERCERA EDAD SE DEBERA PEDIR UN VIDEO DE AUTORIZACION.',
        ];

        juridicalPersonDocs.forEach((doc_item) => {
          doc.fontSize(8).font('Helvetica').text(`-   ${doc_item}`, 60);
          doc.moveDown(0.3);
        });

        // Nueva página para información de contacto
        doc.moveDown(1.5);
        doc.fontSize(9).font('Helvetica-Bold').text('"NEXUS SOLUCIONES"');
        doc
          .fontSize(8)
          .font('Helvetica')
          .text(
            'Domicilio: Jorge Drom N34-188 y Gaspar de Villarroel, Edificio Plus 1-Oficina #71 Atención:',
          )
          .text('Anthony Collaguazo Correo electrónico: info@solucionesnexus.com');

        doc.moveDown(2);

        doc.fontSize(9).font('Helvetica-Bold').text('"EL CLIENTE"');
        doc
          .fontSize(8)
          .font('Helvetica')
          .text(`Domicilio: ${data.address}`)
          .text(`Medio de comunicación:`)
          .text(`${data.phone}`)
          .text(`Correo: ${data.email}`);

        doc.moveDown();

        doc
          .fontSize(8)
          .font('Helvetica')
          .text(
            'Cualquier cambio de domicilio para efectos de notificaciones deberá ser comunicado a la otra parte por medio escrito con una antelación mínima de cinco (5) días hábiles en el domicilio de la parte que reciba dicha notificación.',
            { align: 'justify' },
          );

        doc.moveDown(2);

        // CLÁUSULA VIGÉSIMA TERCERA: DOMICILIO
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('CLÁUSULA VIGÉSIMA TERCERA: DOMICILIO.');
        doc.moveDown();
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Para todos los efectos legales el domicilio contractual será la ciudad de Quito.',
            { align: 'justify' },
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            'Para efectos de su aprobación y una vez leídos por las partes, es suscrito el presente acuerdo en dos (2) ejemplares de idéntico contenido en el lugar y la fecha antes indicados.',
            { align: 'justify' },
          );

        // Nueva página para firmas

        doc.moveDown(3);

        // Firmas
        doc
          .fontSize(10)
          .font('Helvetica')
          .text('_______________________________', 80, doc.y)
          .text('_______________________________', 320, doc.y - 12);

        doc.moveDown(2);

        doc
          .fontSize(9)
          .text('NOMBRE: ANTHONY COLLAGUAZO', 80, doc.y)
          .text(
            `NOMBRE: ${data.distributorName.toUpperCase()}`,
            320,
            doc.y - 12,
          );

        doc.moveDown();

        doc
          .fontSize(9)
          .text('CARGO: GERENTE GENERAL', 80, doc.y)
          .text(`Identificación: ${data.identification}`, 320, doc.y - 12);

        doc.moveDown();

        doc.fontSize(9).text('EMPRESA: NEXUS SOLUCIONES', 80, doc.y);

        // Nueva página para ANEXO 1
        doc.addPage();

        doc.moveDown(3);

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('ANEXO 1. Precios para todos los tipos de firmas.', {
            align: 'center',
          });

        doc.moveDown(2);

        // Tabla de precios del ANEXO
        const anexoTableTop = doc.y;
        const colWidth = 250;

        // Header de la tabla
        doc
          .rect(50, anexoTableTop, colWidth, 30)
          .stroke()
          .rect(50 + colWidth, anexoTableTop, colWidth, 30)
          .stroke();

        // Títulos del header
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Duración', 60, anexoTableTop + 10)
          .text('Precio', 60 + colWidth + 10, anexoTableTop + 10);

        // Dibujar todas las filas
        data.plans.forEach((plan, index) => {
          const rowY = anexoTableTop + 30 * (index + 1);
          doc
            .rect(50, rowY, colWidth, 30)
            .stroke()
            .rect(50 + colWidth, rowY, colWidth, 30)
            .stroke();
        });

        // Agregar el contenido de cada plan
        data.plans.forEach((plan, index) => {
          const rowY = anexoTableTop + 30 * (index + 1) + 10;
          const durationText = this.formatDuration(
            plan.duration,
            plan.durationType,
          );
          const priceText = `$${(plan.customPrice / 100).toFixed(2)}`;

          doc
            .fontSize(9)
            .font('Helvetica')
            .text(durationText, 60, rowY)
            .text(priceText, 60 + colWidth + 10, rowY);
        });

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
