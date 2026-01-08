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
} from '@react-email/components';

type Props = {
  distributorName: string;
  identification: string;
  password: string;
};

export default function WelcomeDistributorEmail({
  distributorName,
  identification,
  password,
}: Props) {
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
      <Preview>Bienvenido/a como distribuidor de Nexus Soluciones</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: brand.bg,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
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

        <Container
          style={{
            maxWidth: '600px',
            margin: '40px auto',
            padding: '0 20px',
          }}
        >
          <Section
            style={{
              backgroundColor: brand.white,
              borderRadius: '8px',
              padding: '32px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <Text
              style={{
                margin: '0 0 24px',
                fontSize: '24px',
                fontWeight: 'bold',
                color: brand.tealDark,
                textAlign: 'center',
              }}
            >
              ¡Bienvenido/a a Nexus Soluciones!
            </Text>

            <Text
              style={{
                margin: '0 0 16px',
                fontSize: '16px',
                lineHeight: '1.6',
                color: brand.text,
              }}
            >
              Estimado/a <strong>{distributorName}</strong>,
            </Text>

            <Text
              style={{
                margin: '0 0 16px',
                fontSize: '16px',
                lineHeight: '1.6',
                color: brand.text,
              }}
            >
              Le damos la bienvenida como{' '}
              <strong>distribuidor autorizado de Nexus Soluciones</strong>. Su
              acceso al{' '}
              <strong>sistema de emisión de firmas electrónicas</strong> ya se
              encuentra habilitado.
            </Text>

            <Hr style={{ margin: '24px 0', borderColor: brand.bg }} />

            <Section
              style={{
                backgroundColor: brand.bg,
                borderRadius: '6px',
                padding: '20px',
                margin: '24px 0',
              }}
            >
              <Text
                style={{
                  margin: '0 0 16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: brand.tealDark,
                  textTransform: 'uppercase',
                }}
              >
                🔗 Sistema de emisión:
              </Text>
              <Link
                href="https://www.distribuidores.solucionesnexus.com"
                style={{
                  margin: '0 0 16px',
                  fontSize: '16px',
                  color: brand.tealLight,
                  textDecoration: 'underline',
                  display: 'block',
                }}
              >
                https://www.distribuidores.solucionesnexus.com
              </Link>

              <Text
                style={{
                  margin: '16px 0 12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: brand.tealDark,
                  textTransform: 'uppercase',
                }}
              >
                🔐 Credenciales:
              </Text>

              <Section
                style={{
                  backgroundColor: brand.white,
                  borderRadius: '4px',
                  padding: '16px',
                  margin: '8px 0',
                }}
              >
                <Text
                  style={{
                    margin: '0 0 8px',
                    fontSize: '14px',
                    color: brand.textLight,
                  }}
                >
                  Usuario:
                </Text>
                <Text
                  style={{
                    margin: '0 0 16px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: brand.text,
                    fontFamily: 'monospace',
                  }}
                >
                  {identification}
                </Text>

                <Text
                  style={{
                    margin: '0 0 8px',
                    fontSize: '14px',
                    color: brand.textLight,
                  }}
                >
                  Contraseña:
                </Text>
                <Text
                  style={{
                    margin: '0',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: brand.text,
                    fontFamily: 'monospace',
                  }}
                >
                  {password}
                </Text>
              </Section>
            </Section>

            <Hr style={{ margin: '24px 0', borderColor: brand.bg }} />

            <Text
              style={{
                margin: '0 0 16px',
                fontSize: '16px',
                lineHeight: '1.6',
                color: brand.text,
              }}
            >
              Nuestro equipo de soporte está disponible <strong>24/7</strong>{' '}
              para cualquier consulta.
            </Text>

            <Text
              style={{
                margin: '24px 0 0',
                fontSize: '16px',
                lineHeight: '1.6',
                color: brand.text,
              }}
            >
              Bienvenido/a a Nexus Soluciones.
            </Text>

            <Text
              style={{
                margin: '16px 0 0',
                fontSize: '16px',
                lineHeight: '1.6',
                color: brand.text,
              }}
            >
              Atentamente,
              <br />
              <strong>Equipo Nexus Soluciones</strong>
            </Text>
          </Section>

          <Section style={{ padding: '20px', textAlign: 'center' }}>
            <Text
              style={{
                margin: 0,
                fontSize: '12px',
                color: brand.textLight,
                lineHeight: '1.5',
              }}
            >
              Este es un correo automático generado por Nexus Soluciones.
              <br />
              Por favor, no responda directamente a este mensaje.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
