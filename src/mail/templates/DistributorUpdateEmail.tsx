import * as React from 'react';
import { Section, Text, Hr } from '@react-email/components';
import { brand } from './shared/constants';
import { EmailLayout, DataBlock } from './shared/EmailLayout';

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
  distributorName = 'Juan Pérez',
  distributorIdentification = '1712345678',
  changes = [],
  adminName = 'Admin',
  adminEmail = 'admin@elizaldeasociados.com',
}: Props) {
  return (
    <EmailLayout
      previewText={`Actualización de distribuidor: ${distributorName}`}
      headerTitle="Actualización de Distribuidor"
      headerSubtitle="Notificación interna"
      showSupport={false}
    >
      <Text
        style={{
          fontSize: '15px',
          color: brand.colors.text,
          lineHeight: '1.65',
          margin: '0 0 28px',
        }}
      >
        Se ha realizado una actualización en la información de un distribuidor.
      </Text>

      <Text
        style={{
          fontSize: '10px',
          fontWeight: '700',
          color: brand.colors.textLight,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: '0 0 12px',
        }}
      >
        Información del Distribuidor
      </Text>

      <Section
        style={{
          borderLeft: `3px solid ${brand.colors.tealDark}`,
          paddingLeft: '20px',
          marginBottom: '28px',
        }}
      >
        <DataBlock label="Distribuidor" value={distributorName} />
        <DataBlock label="Identificación" value={distributorIdentification} mono />
        <DataBlock label="Actualizado por" value={`${adminName} (${adminEmail})`} />
        <DataBlock
          label="Fecha"
          value={new Date().toLocaleString('es-EC', {
            dateStyle: 'full',
            timeStyle: 'short',
          })}
        />
      </Section>

      <Text
        style={{
          fontSize: '18px',
          fontWeight: '700',
          color: brand.colors.tealLight,
          margin: '0 0 16px',
        }}
      >
        Cambios Realizados
      </Text>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: brand.colors.white,
          marginBottom: '28px',
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                backgroundColor: brand.colors.tealLight,
                color: brand.colors.white,
                padding: '10px 12px',
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}
            >
              Campo
            </th>
            <th
              style={{
                backgroundColor: brand.colors.tealLight,
                color: brand.colors.white,
                padding: '10px 12px',
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}
            >
              Valor Anterior
            </th>
            <th
              style={{
                backgroundColor: brand.colors.tealLight,
                color: brand.colors.white,
                padding: '10px 12px',
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
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
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: brand.colors.bg,
                  fontWeight: '600',
                  fontSize: '13px',
                  color: brand.colors.text,
                }}
              >
                {change.field}
              </td>
              <td
                style={{
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  fontSize: '13px',
                  color: '#dc2626',
                  fontFamily: '"Courier New", Courier, monospace',
                }}
              >
                {change.before}
              </td>
              <td
                style={{
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  fontSize: '13px',
                  color: '#16a34a',
                  fontWeight: '600',
                  fontFamily: '"Courier New", Courier, monospace',
                }}
              >
                {change.after}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Hr style={{ borderColor: '#ebebeb', margin: '0 0 24px' }} />

      <Text
        style={{
          fontSize: '13px',
          color: brand.colors.textLight,
          textAlign: 'center',
          margin: 0,
        }}
      >
        Este correo ha sido generado automáticamente por el sistema de gestión
        de distribuidores de {brand.name}.
      </Text>
    </EmailLayout>
  );
}
