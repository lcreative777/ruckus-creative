// src/data/site.ts
// Single source of truth for business identity. The live WordPress site renders
// three different suite numbers; 300-173 is the client-confirmed correct one
// (2026-08-14). Never copy this data from the live site.

export const site = {
  name: 'Ruckus Creative',
  legalName: 'Ruckus Creative, LLC',
  url: 'https://ruckuscreative.com',
  description: 'Business results through strategic creative. A full-service creative agency that creates results.',
  email: 'info@ruckuscreative.com',
  phone: '714.514.1482',
  phoneE164: '+17145141482',
  address: {
    street: '27525 Puerta Real, Suite 300-173',
    city: 'Mission Viejo',
    region: 'CA',
    postalCode: '92691',
    country: 'US',
  },
  founded: '1993',   // "In business for over 25 years", per the About page
} as const;

/** Main navigation. Every item targets a homepage section, not a standalone page. */
export const nav = [
  { label: 'Home', href: '/#home' },
  { label: 'Intro', href: '/#intro' },
  { label: 'Work', href: '/#work' },
  { label: 'About', href: '/#about' },
  { label: 'Services', href: '/#services' },
  { label: 'Contact', href: '/#contact' },
] as const;

/** Footer legal links. */
export const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy/' },
  { label: 'Terms and Conditions', href: '/terms-and-conditions/' },
] as const;
