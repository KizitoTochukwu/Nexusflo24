/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for NexusFlo24</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src="https://stuaikfyuwcjmchcvfie.supabase.co/storage/v1/object/public/email-assets/nexusflo24-logo.png" width="48" height="48" alt="NexusFlo24" style={logo} />
        </Section>
        <Heading style={h1}>Confirm your new email</Heading>
        <Text style={text}>
          You requested to change your NexusFlo24 email from{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>Click below to confirm this change:</Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Confirm Email Change
          </Button>
        </Section>
        <Text style={footer}>
          If you didn't request this, please secure your account immediately.
        </Text>
        <Text style={footerBrand}>© NexusFlo24 · AI-Powered Marketing Automation</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const link = { color: '#0B1F3B', textDecoration: 'underline' }
const buttonSection = { margin: '8px 0 32px' }
const button = {
  backgroundColor: '#0B1F3B',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '13px', color: '#999999', margin: '0 0 8px' }
const footerBrand = { fontSize: '12px', color: '#C9A227', margin: '0' }
