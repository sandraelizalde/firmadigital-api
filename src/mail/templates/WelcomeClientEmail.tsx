import * as React from 'react';
import { Section, Text, Link } from '@react-email/components';
import { brand } from './shared/constants';
import { EmailLayout, DataBlock, PrimaryButton } from './shared/EmailLayout';

type Props = {
  clientName: string;
  signatureKey: string;
  urlSignatory: string;
};

export default function WelcomeClientEmail({
  clientName = 'Juan Pérez',
  signatureKey = 'ClaveSegura123',
  urlSignatory = 'https://firmador.elizaldeasociados.com',
}: Props) {
  return (
    <EmailLayout
      previewText="Tu firma electrónica ya está lista para usarse"
      headerTitle={`¡Hola, ${clientName}!`}
      headerSubtitle="Firma electrónica lista"
    >
      <Text
        style={{
          fontSize: '22px',
          fontWeight: '700',
          color: brand.colors.tealDark,
          lineHeight: '1.2',
          margin: '0 0 20px',
        }}
      >
        ¡Tu Firma Electrónica ha sido Creada!
      </Text>

      <Text
        style={{
          fontSize: '15px',
          color: brand.colors.text,
          lineHeight: '1.65',
          margin: '0 0 28px',
        }}
      >
        Hemos emitido correctamente tu <strong>firma electrónica</strong>. Ya
        puedes utilizarla para firmar documentos digitales de forma segura y
        legal.
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
        Clave de tu firma electrónica
      </Text>

      <Section
        style={{
          borderLeft: `3px solid ${brand.colors.tealDark}`,
          paddingLeft: '20px',
          marginBottom: '28px',
        }}
      >
        <DataBlock label="Contraseña" value={signatureKey} mono large />
      </Section>

      <Text
        style={{
          fontSize: '13px',
          color: brand.colors.textLight,
          margin: '0 0 28px',
        }}
      >
        ⚠️ Esta clave es confidencial. No la compartas con terceros.
      </Text>

      <Section style={{ textAlign: 'center', marginBottom: '16px' }}>
        <PrimaryButton href={urlSignatory}>
          Acceder al sistema de firma →
        </PrimaryButton>
      </Section>

      <Text
        style={{
          fontSize: '13px',
          color: brand.colors.textLight,
          textAlign: 'center',
          margin: '0 0 28px',
        }}
      >
        O ingresa desde:{' '}
        <Link
          href={urlSignatory}
          style={{ color: brand.colors.tealDark, fontWeight: '600' }}
        >
          {urlSignatory}
        </Link>
      </Text>
    </EmailLayout>
  );
}
