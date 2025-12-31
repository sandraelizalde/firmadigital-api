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
} from '@react-email/components';

type Props = {
  distributorName: string;
  identification: string;
};

export default function ContractEmail({
  distributorName,
  identification,
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
      <Preview>Nuevo contrato de distribuidor - {distributorName}</Preview>
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
            <Text
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: brand.white,
                textAlign: 'center',
              }}
            >
              Nexus Soluciones
            </Text>
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
                fontSize: '20px',
                fontWeight: 'bold',
                color: brand.tealDark,
              }}
            >
              Nuevo Contrato de Distribuidor
            </Text>

            <Text
              style={{
                margin: '0 0 16px',
                fontSize: '16px',
                lineHeight: '1.6',
                color: brand.text,
              }}
            >
              Se ha generado un nuevo contrato para el distribuidor:
            </Text>

            <Section
              style={{
                backgroundColor: brand.bg,
                borderRadius: '6px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <Text
                style={{
                  margin: '0 0 8px',
                  fontSize: '14px',
                  color: brand.textLight,
                }}
              >
                <strong>Distribuidor:</strong> {distributorName}
              </Text>
              <Text
                style={{
                  margin: '0',
                  fontSize: '14px',
                  color: brand.textLight,
                }}
              >
                <strong>Identificación:</strong> {identification}
              </Text>
            </Section>

            <Text
              style={{
                margin: '0 0 16px',
                fontSize: '16px',
                lineHeight: '1.6',
                color: brand.text,
              }}
            >
              El contrato se encuentra adjunto a este correo electrónico en
              formato PDF para su revisión y archivo.
            </Text>

            <Hr style={{ margin: '24px 0', borderColor: '#e5e7eb' }} />

            <Text
              style={{
                margin: 0,
                fontSize: '14px',
                color: brand.textLight,
                textAlign: 'center',
              }}
            >
              Este correo ha sido generado automáticamente por el sistema de
              gestión de distribuidores de Nexus Soluciones.
            </Text>
          </Section>

          <Text
            style={{
              margin: '24px 0 0',
              fontSize: '12px',
              color: brand.textLight,
              textAlign: 'center',
            }}
          >
            © {new Date().getFullYear()} Nexus Soluciones. Todos los derechos
            reservados.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
