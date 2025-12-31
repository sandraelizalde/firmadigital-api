import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Img,
  Hr,
  Link,
} from '@react-email/components';

type Props = {
  clientName: string;
};

export default function DocumentSignedEmail({ clientName }: Props) {
  const brand = {
    tealDark: '#005a70',
    tealLight: '#0F9BB0',
    white: '#FFFFFF',
    bg: '#F3F7F9',
    text: '#374151',
    textLight: '#6b7280',
  };

  return (
    <Html>
      <Head />
      <Preview>
        {clientName} te ha enviado un documento firmado. Encuéntralo adjunto.
      </Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: brand.bg,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {/* Header */}
        <Section style={{ backgroundColor: brand.tealDark, padding: '32px 0' }}>
          <Container
            style={{ maxWidth: '600px', margin: '0 auto', padding: '0 20px' }}
          >
            <Img
              src="https://www.solucionesnexus.com/images/home/logo-full-white.png"
              alt="Nexus Soluciones"
              width={180}
              height={48}
              style={{ display: 'block', margin: '0 auto' }}
            />
          </Container>
        </Section>

        {/* Main Content */}
        <Container
          style={{
            maxWidth: '600px',
            margin: '24px auto',
            backgroundColor: brand.white,
            borderRadius: '12px', // Un poco más redondeado para modernizar
            padding: '40px',
            border: '1px solid #e1e5e9',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          {/* Etiqueta superior */}
          <Text
            style={{
              margin: '0 0 12px 0',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: brand.tealLight,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            NUEVO DOCUMENTO RECIBIDO
          </Text>

          {/* Titulo Principal */}
          <Text
            style={{
              margin: '0 0 24px 0',
              fontSize: '24px',
              fontWeight: '600',
              color: '#111827',
              lineHeight: '1.3',
              textAlign: 'center',
            }}
          >
            <span style={{ color: brand.tealDark }}>{clientName}</span> te ha enviado un documento firmado digitalmente.
          </Text>

          {/* Caja de información de adjunto */}
          <Section
            style={{
              backgroundColor: '#F0F9FA',
              padding: '24px',
              borderRadius: '8px',
              borderLeft: `4px solid ${brand.tealLight}`,
              marginBottom: '24px',
            }}
          >
            <Text
              style={{
                margin: '0 0 4px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: brand.tealDark,
              }}
            >
              📎 Archivo Adjunto
            </Text>
            <Text
              style={{
                margin: 0,
                fontSize: '15px',
                color: brand.text,
                lineHeight: '1.6',
              }}
            >
              El proceso de firma se ha completado correctamente. Hemos procesado el documento y lo encontrarás disponible en los <strong>archivos adjuntos de este correo</strong> (PDF).
            </Text>
          </Section>

          <Hr
            style={{
              border: 'none',
              borderTop: '1px solid #e5e7eb',
              margin: '32px 0',
            }}
          />

          {/* Sección de Soporte */}
          <Section
            style={{
              padding: '20px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <Text
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: brand.tealDark,
                margin: '0 0 12px 0',
              }}
            >
              📞 ¿Necesitas ayuda?
            </Text>
            <Text
              style={{
                fontSize: '14px',
                color: '#1e40af',
                lineHeight: '1.6',
                margin: '0 0 8px 0',
              }}
            >
              Soporte técnico 24/7:{' '}
              <Link
                href="https://wa.me/593993985569"
                style={{
                  color: brand.tealLight,
                  textDecoration: 'none',
                  fontWeight: '600',
                }}
              >
                099 398 5569
              </Link>
            </Text>
            <Text
              style={{
                fontSize: '14px',
                color: '#1e40af',
                lineHeight: '1.6',
                margin: 0,
              }}
            >
              Correo electrónico:{' '}
              <Link
                href="mailto:soporte@solucionesnexus.com"
                style={{
                  color: brand.tealLight,
                  textDecoration: 'none',
                  fontWeight: '600',
                }}
              >
                soporte@solucionesnexus.com
              </Link>
            </Text>
          </Section>

          <Text
            style={{
              fontSize: '14px',
              color: brand.textLight,
              margin: '0',
              lineHeight: '1.5',
              textAlign: 'center',
            }}
          >
            Gracias por usar nuestros servicios.
          </Text>

          <Text
            style={{
              fontSize: '14px',
              color: brand.textLight,
              margin: '8px 0 0 0',
              lineHeight: '1.5',
              textAlign: 'center',
              fontWeight: '500',
            }}
          >
            Saludos,
            <br />
            <span style={{ color: brand.tealDark, fontWeight: '600' }}>
              Nexus Soluciones
            </span>
          </Text>

        </Container>

        {/* Footer simple */}
        <Section style={{ padding: '0 20px 32px', textAlign: 'center' }}>
          <Text
            style={{
              fontSize: '12px',
              color: '#9ca3af',
              margin: '0 0 8px 0',
            }}
          >
            © {new Date().getFullYear()}{' '}
            <Link
              href="https://www.solucionesnexus.com"
              style={{
                color: brand.tealLight,
                textDecoration: 'none',
              }}
            >
              Nexus Soluciones
            </Link>
            . Todos los derechos reservados.
          </Text>
        </Section>
      </Body>
    </Html>
  );
}