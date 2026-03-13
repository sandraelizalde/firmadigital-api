import * as React from 'react';
import { Section, Text } from '@react-email/components';
import { brand } from './shared/constants';
import { EmailLayout, DataBlock, PrimaryButton } from './shared/EmailLayout';

type Props = {
  distributorName: string;
  identification: string;
  password: string;
};

export default function WelcomeDistributorEmail({
  distributorName = 'Juan Pérez',
  identification = '1712345678',
  password = 'Contraseña123',
}: Props) {
  return (
    <EmailLayout
      previewText={`¡Bienvenido/a como distribuidor de ${brand.name}!`}
      headerTitle={`¡Bienvenido/a, ${distributorName}!`}
      headerSubtitle="Distribuidor activado"
    >
      <Text
        style={{
          fontSize: '15px',
          color: brand.colors.text,
          lineHeight: '1.65',
          margin: '0 0 28px',
        }}
      >
        Tu cuenta como <strong>distribuidor autorizado de {brand.name}</strong>{' '}
        ha sido habilitada. A continuación encontrarás tus credenciales de
        acceso al sistema de emisión de firmas electrónicas.
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
        Credenciales de acceso
      </Text>

      <Section
        style={{
          borderLeft: `3px solid ${brand.colors.tealDark}`,
          paddingLeft: '20px',
          marginBottom: '28px',
        }}
      >
        <DataBlock label="Usuario" value={identification} mono />
        <DataBlock label="Contraseña" value={password} mono />
      </Section>

      <Section style={{ textAlign: 'center' }}>
        <PrimaryButton href={brand.websiteUrl}>
          Ingresar al sistema →
        </PrimaryButton>
      </Section>
    </EmailLayout>
  );
}
