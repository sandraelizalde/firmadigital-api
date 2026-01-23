import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Img,
  Link,
  Button,
} from '@react-email/components';

type Props = {
  clientName: string;
  signatureKey: string;
  urlSignatory: string;
};

export default function WelcomeClientEmail({
  clientName,
  signatureKey,
  urlSignatory,
}: Props) {
  const brand = {
    tealDark: '#005a70',
    tealLight: '#0F9BB0',
    white: '#FFFFFF',
    bg: '#F3F7F9',
    text: '#374151',
    textLight: '#6b7280',
    warningBg: '#FFF7ED',
    warningBorder: '#FDBA74',
  };

  return (
    <Html>
      <Head />
      <Preview>Tu firma electrónica ya está lista para usarse</Preview>

      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: brand.bg,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {/* Header */}
        <Section style={{ backgroundColor: brand.tealDark, padding: '32px 0' }}>
          <Container style={{ maxWidth: '600px', margin: '0 auto' }}>
            <Img
              src="https://www.solucionesnexus.com/images/home/logo-full-white.png"
              alt="Nexus Soluciones"
              width={180}
              style={{ display: 'block', margin: '0 auto' }}
            />
          </Container>
        </Section>

        <Container
          style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}
        >
          <Section
            style={{
              backgroundColor: brand.white,
              borderRadius: '10px',
              padding: '32px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            }}
          >
            <Text
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: brand.tealDark,
                textAlign: 'center',
                marginBottom: '24px',
              }}
            >
              ¡Tu firma electrónica está lista! ✍️
            </Text>

            <Text style={{ fontSize: '16px', color: brand.text }}>
              Estimado/a <strong>{clientName}</strong>,
            </Text>

            <Text
              style={{ fontSize: '16px', color: brand.text, lineHeight: '1.6' }}
            >
              Hemos emitido correctamente tu <strong>firma electrónica</strong>.
              Ya puedes utilizarla para firmar documentos digitales de forma
              segura y legal.
            </Text>

            <Hr style={{ margin: '24px 0', borderColor: brand.bg }} />

            {/* Clave de firma */}
            <Section
              style={{
                backgroundColor: brand.bg,
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <Text
                style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: brand.tealDark,
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                }}
              >
                🔐 Clave de tu firma electrónica
              </Text>

              <Section
                style={{
                  backgroundColor: brand.white,
                  borderRadius: '6px',
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Text
                  style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    fontFamily: 'monospace',
                    color: brand.text,
                    margin: 0,
                  }}
                >
                  {signatureKey}
                </Text>
              </Section>

              <Text
                style={{
                  fontSize: '13px',
                  color: brand.textLight,
                  marginTop: '12px',
                }}
              >
                ⚠️ Esta clave es confidencial. No la compartas con terceros.
              </Text>
            </Section>

            {/* CTA */}
            <Section style={{ textAlign: 'center', margin: '32px 0' }}>
              <Button
                href={urlSignatory}
                style={{
                  backgroundColor: brand.tealLight,
                  color: brand.white,
                  padding: '14px 28px',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '600',
                  textDecoration: 'none',
                }}
              >
                Acceder al sistema de firma
              </Button>

              <Text
                style={{
                  fontSize: '13px',
                  color: brand.textLight,
                  marginTop: '12px',
                }}
              >
                O ingresa desde: <br />
                <Link href={urlSignatory} style={{ color: brand.tealLight }}>
                  {urlSignatory}
                </Link>
              </Text>
            </Section>

            {/* Soporte */}
            <Section
              style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <Text
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: brand.tealDark,
                  marginBottom: '8px',
                }}
              >
                📞 ¿Necesitas ayuda?
              </Text>

              <Text style={{ fontSize: '14px', margin: 0 }}>
                WhatsApp 24/7:{' '}
                <Link
                  href="https://wa.me/593993985569"
                  style={{ color: brand.tealLight }}
                >
                  099 398 5569
                </Link>
              </Text>

              <Text style={{ fontSize: '14px', margin: 0 }}>
                Email:{' '}
                <Link
                  href="mailto:soporte@solucionesnexus.com"
                  style={{ color: brand.tealLight }}
                >
                  soporte@solucionesnexus.com
                </Link>
              </Text>
            </Section>

            <Text
              style={{ marginTop: '24px', fontSize: '16px', color: brand.text }}
            >
              Atentamente,
              <br />
              <strong>Equipo Nexus Soluciones</strong>
            </Text>
          </Section>

          {/* Footer */}
          <Text
            style={{
              textAlign: 'center',
              fontSize: '12px',
              color: brand.textLight,
              marginTop: '20px',
            }}
          >
            Este es un mensaje automático. Por favor no respondas a este correo.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
