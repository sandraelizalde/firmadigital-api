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
} from '@react-email/components';

type ChangeItem = {
  field: string;
  before: string;
  after: string;
};

type Props = {
  distributorName: string;
  distributorIdentification: string;
  changes: ChangeItem[];
  adminName: string;
  adminEmail: string;
};

export default function DistributorUpdateEmail({
  distributorName,
  distributorIdentification,
  changes,
  adminName,
  adminEmail,
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
      <Preview>
        Actualización de Distribuidor: {distributorName}
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
            {/* Title */}
            <Text
              style={{
                margin: '0 0 24px',
                fontSize: '24px',
                fontWeight: 'bold',
                color: brand.tealDark,
                textAlign: 'center',
              }}
            >
              Actualización de Distribuidor
            </Text>

            <Text
              style={{
                margin: '0 0 16px',
                fontSize: '16px',
                lineHeight: '1.6',
                color: brand.text,
              }}
            >
              Se ha realizado una actualización en la información de un
              distribuidor.
            </Text>

            {/* Info Box */}
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
                  margin: '0 0 12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: brand.tealDark,
                  textTransform: 'uppercase',
                }}
              >
                📋 Información del Distribuidor
              </Text>

              <Text
                style={{
                  margin: '0 0 8px',
                  fontSize: '14px',
                  color: brand.text,
                }}
              >
                <strong>Distribuidor:</strong> {distributorName}
              </Text>
              <Text
                style={{
                  margin: '0 0 8px',
                  fontSize: '14px',
                  color: brand.text,
                }}
              >
                <strong>Identificación:</strong> {distributorIdentification}
              </Text>

              <Hr style={{ margin: '16px 0', borderColor: '#e5e7eb' }} />

              <Text
                style={{
                  margin: '0 0 8px',
                  fontSize: '14px',
                  color: brand.text,
                }}
              >
                <strong>Actualizado por:</strong> {adminName}
              </Text>
              <Text
                style={{
                  margin: '0 0 8px',
                  fontSize: '14px',
                  color: brand.textLight,
                }}
              >
                ({adminEmail})
              </Text>
              <Text
                style={{
                  margin: '0',
                  fontSize: '14px',
                  color: brand.text,
                }}
              >
                <strong>Fecha:</strong>{' '}
                {new Date().toLocaleString('es-EC', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </Text>
            </Section>

            {/* Changes Table */}
            <Section style={{ margin: '24px 0' }}>
              <Text
                style={{
                  margin: '0 0 16px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: brand.tealDark,
                }}
              >
                Cambios Realizados:
              </Text>

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: brand.white,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        backgroundColor: brand.tealDark,
                        color: brand.white,
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        borderRadius: '4px 0 0 0',
                      }}
                    >
                      Campo
                    </th>
                    <th
                      style={{
                        backgroundColor: brand.tealDark,
                        color: brand.white,
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: 'bold',
                      }}
                    >
                      Valor Anterior
                    </th>
                    <th
                      style={{
                        backgroundColor: brand.tealDark,
                        color: brand.white,
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        borderRadius: '0 4px 0 0',
                      }}
                    >
                      Valor Nuevo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((change, index) => (
                    <tr key={index}>
                      <td
                        style={{
                          padding: '12px',
                          border: '1px solid #e5e7eb',
                          backgroundColor: brand.bg,
                          fontWeight: '600',
                          fontSize: '14px',
                          color: brand.text,
                        }}
                      >
                        {change.field}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          border: '1px solid #e5e7eb',
                          fontSize: '14px',
                          color: '#dc2626',
                          fontFamily: 'monospace',
                        }}
                      >
                        {change.before}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          border: '1px solid #e5e7eb',
                          fontSize: '14px',
                          color: '#16a34a',
                          fontWeight: '600',
                          fontFamily: 'monospace',
                        }}
                      >
                        {change.after}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Hr style={{ margin: '32px 0', borderColor: brand.bg }} />

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

          {/* Footer */}
          <Section style={{ padding: '20px', textAlign: 'center' }}>
            <Text
              style={{
                margin: 0,
                fontSize: '12px',
                color: brand.textLight,
                lineHeight: '1.5',
              }}
            >
              © {new Date().getFullYear()} Nexus Soluciones. Todos los derechos
              reservados.
              <br />
              Este es un correo automático. Por favor, no responda directamente
              a este mensaje.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
