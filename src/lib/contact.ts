// src/lib/contact.ts
//
// Pure helpers for the contact endpoint, kept out of the route so they can be
// unit-tested without the Astro/Worker runtime.

export interface ContactFields {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  fields: ContactFields;
  errors: string[];
}

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/**
 * Validate and normalise a submission.
 *
 * Only name and email are required, matching the form. The email check is
 * deliberately loose — it rejects obvious rubbish without turning away unusual
 * but valid addresses, because a false rejection here is a lost lead.
 */
export function validate(input: Record<string, unknown>): ValidationResult {
  const fields: ContactFields = {
    name: clean(input.name),
    email: clean(input.email),
    phone: clean(input.phone),
    message: clean(input.message),
  };

  const errors: string[] = [];
  if (!fields.name) errors.push('Please add your name.');
  if (!fields.email) errors.push('Please add your email address.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.push('That email address does not look right.');
  }
  // reply_to is built from the submitted address, so a newline in either field
  // could otherwise smuggle extra headers into the outgoing message.
  if (/[\r\n]/.test(fields.email) || /[\r\n]/.test(fields.name)) {
    errors.push('That submission could not be processed.');
  }

  return { ok: errors.length === 0, fields, errors };
}

/** Plain-text body. Empty optional fields are omitted rather than printed blank. */
export function buildEmail(fields: Partial<ContactFields>): string {
  const rows: string[] = [];
  const add = (label: string, value?: string) => {
    if (value && value.trim()) rows.push(`${label}: ${value.trim()}`);
  };
  add('Name', fields.name);
  add('Email', fields.email);
  add('Phone', fields.phone);
  if (fields.message && fields.message.trim()) {
    rows.push('', 'Message:', fields.message.trim());
  }
  return rows.join('\n');
}
