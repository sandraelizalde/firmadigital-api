import * as React from 'react';
import { Text } from '@react-email/components';
import { brand } from './shared/constants';
import { EmailLayout, DataBlock } from './shared/EmailLayout';

type Props = {
  distributorName: string;
  identification: string;
};

export default function ContractEmail({
  distributorName = 'Juan Pérez',
  identification = '1712345678',
}: Props) {
  return (
    <EmailLayout
      previewText={`Nuevo contrato de distribuidor — ${distributorName}`}
      headerTitle="Nuevo Contrato de Distribuidor"
      headerSubtitle="Gestión interna"
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
        Se ha generado un nuevo contrato para el siguiente distribuidor. El
        documento se encuentra adjunto a este correo en formato PDF.
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
        Datos del Distribuidor
      </Text>

      <DataBlock label="Distribuidor" value={distributorName} />
      <DataBlock label="Identificación" value={identification} mono />
    </EmailLayout>
  );
}
