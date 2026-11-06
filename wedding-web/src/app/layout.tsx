import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wedding Platform 💍 — Multi-Wedding Invitations, RSVP, WhatsApp & Seating',
  description:
    'Multi-Wedding SaaS Platform for digital invitations, guest RSVP management, WhatsApp automation, interactive seating charts, digital gifts, and reception check-in.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
