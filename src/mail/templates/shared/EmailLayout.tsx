import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Img,
  Link,
  Hr,
  Button,
} from '@react-email/components';
import { brand } from './constants';

// ─── Layout ───────────────────────────────────────────────────────────────────

type LayoutProps = {
  previewText: string;
  headerTitle?: string;
  headerSubtitle?: string;
  showSupport?: boolean;
  children: React.ReactNode;
};

export function EmailLayout({
  previewText,
  headerTitle,
  headerSubtitle,
  showSupport = true,
  children,
}: LayoutProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{previewText}</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: brand.colors.bg,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '32px 24px',
          }}
        >
          {/* ── Card ── */}
          <Section style={{ backgroundColor: brand.colors.white }}>
            {/* ── Header ── */}
            <Section
              style={{
                backgroundColor: brand.colors.tealLight,
                borderBottom: `3px solid ${brand.colors.tealDark}`,
                padding: '28px 40px 24px',
              }}
            >
              <Img
                src={brand.logoUrl}
                alt={brand.name}
                width={150}
                height="auto"
                style={{ display: 'block', margin: '0 auto' }}
              />
              {headerTitle && (
                <Text
                  style={{
                    color: brand.colors.white,
                    fontSize: '20px',
                    fontWeight: '700',
                    textAlign: 'center',
                    margin: '18px 0 6px',
                    lineHeight: '1.3',
                  }}
                >
                  {headerTitle}
                </Text>
              )}
              {headerSubtitle && (
                <Text
                  style={{
                    color: brand.colors.tealDark,
                    fontSize: '11px',
                    fontWeight: '700',
                    textAlign: 'center',
                    margin: '0',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                  }}
                >
                  {headerSubtitle}
                </Text>
              )}
            </Section>

            {/* ── Content ── */}
            <Section style={{ padding: '36px 40px' }}>
              {children}

              {showSupport && (
                <>
                  <Hr
                    style={{ borderColor: '#ebebeb', margin: '32px 0 24px' }}
                  />
                  <Row>
                    <Column style={{ width: '50%' }}>
                      <Text
                        style={{
                          margin: '0 0 3px',
                          fontSize: '10px',
                          fontWeight: '700',
                          color: brand.colors.textLight,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                        }}
                      >
                        WhatsApp
                      </Text>
                      <Link
                        href={`https://wa.me/${brand.whatsappNumber}`}
                        style={{
                          color: brand.colors.tealDark,
                          fontSize: '13px',
                          textDecoration: 'none',
                          fontWeight: '600',
                        }}
                      >
                        {brand.whatsappDisplay}
                      </Link>
                    </Column>
                    <Column style={{ width: '50%' }}>
                      <Text
                        style={{
                          margin: '0 0 3px',
                          fontSize: '10px',
                          fontWeight: '700',
                          color: brand.colors.textLight,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                        }}
                      >
                        Soporte
                      </Text>
                      <Link
                        href={`mailto:${brand.supportEmail}`}
                        style={{
                          color: brand.colors.tealDark,
                          fontSize: '13px',
                          textDecoration: 'none',
                          fontWeight: '600',
                        }}
                      >
                        {brand.supportEmail}
                      </Link>
                    </Column>
                  </Row>
                </>
              )}
            </Section>

            {/* ── Bottom accent bar ── */}
            <Hr
              style={{
                borderColor: brand.colors.tealDark,
                margin: 0,
                borderWidth: '2px',
              }}
            />
          </Section>

          {/* ── Footer ── */}
          <Text
            style={{
              fontSize: '12px',
              color: brand.colors.textLight,
              textAlign: 'center',
              margin: '20px 0 4px',
              lineHeight: '1.6',
            }}
          >
            &copy; {new Date().getFullYear()}{' '}
            <Link
              href={brand.websiteUrl}
              style={{
                color: brand.colors.tealDark,
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              {brand.name}
            </Link>
            . Todos los derechos reservados.
          </Text>
          <Text
            style={{
              fontSize: '11px',
              color: '#9ca3af',
              textAlign: 'center',
              margin: 0,
            }}
          >
            Mensaje automático — no respondas a este correo.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// ─── PrimaryButton ────────────────────────────────────────────────────────────

type ButtonProps = {
  href: string;
  children: React.ReactNode;
};

export function PrimaryButton({ href, children }: ButtonProps) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: brand.colors.tealDark,
        color: 'white',
        fontSize: '14px',
        fontWeight: '700',
        padding: '13px 32px',
        borderRadius: '4px',
        textDecoration: 'none',
        display: 'inline-block',
        letterSpacing: '0.4px',
      }}
    >
      {children}
    </Button>
  );
}

// ─── DataBlock ────────────────────────────────────────────────────────────────

type DataBlockProps = {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  large?: boolean;
};

export function DataBlock({ label, value, mono, large }: DataBlockProps) {
  return (
    <Row style={{ marginBottom: '12px' }}>
      <Column>
        <Text
          style={{
            margin: '0 0 2px',
            fontSize: '10px',
            fontWeight: '700',
            color: brand.colors.textLight,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            margin: 0,
            fontSize: large ? '22px' : '14px',
            fontWeight: '700',
            color: brand.colors.tealLight,
            fontFamily: mono ? '"Courier New", Courier, monospace' : 'inherit',
            letterSpacing: mono ? '2px' : '0.3px',
          }}
        >
          {value}
        </Text>
      </Column>
    </Row>
  );
}
