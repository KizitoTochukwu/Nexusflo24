/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code for NexusFlo24</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src="https://stuaikfyuwcjmchcvfie.supabase.co/storage/v1/object/public/email-assets/nexusflo24-logo-profile.png" width="56" height="56" alt="NexusFlo24" style={logo} />
        </Section>
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
        <Text style={footerBrand}>© NexusFlo24 · AI-Powered Marketing Automation</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { marginBottom: '24px' }
const logo = { borderRadius: '10px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0B1F3B',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#65758B',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#0B1F3B',
  margin: '0 0 32px',
  letterSpacing: '4px',
}
const footer = { fontSize: '13px', color: '#999999', margin: '0 0 8px' }
const footerBrand = { fontSize: '12px', color: '#C9A227', margin: '0' }
