import { OptOutRecord } from '../types';

export function generateLegalNoticeText(record: Partial<OptOutRecord>, userName?: string, userAddress?: string): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const recipient = record.recipientName || userName || 'Current Resident';
  const address = record.recipientAddress || userAddress || '[Physical Mailing Address On File]';
  const company = record.companyName || 'Corporate Privacy Officer / Mailing List Operations';
  const customerId = record.customerNumber ? `Customer / Account ID: ${record.customerNumber}` : '';
  const keyCodes = record.keyCodes && record.keyCodes.length > 0 ? `Key / Source Codes: ${record.keyCodes.join(', ')}` : '';
  const barcode = record.postalBarcodeDigits ? `USPS IMb Barcode Digits: ${record.postalBarcodeDigits}` : '';
  const permit = record.permitNumber ? `Permit / BRM Reference: ${record.permitNumber}` : '';

  const idLines = [customerId, keyCodes, barcode, permit].filter(Boolean).join('\n');

  return `FORMAL NOTICE OF DIRECT MAIL CANCELLATION & STATUTORY OPT-OUT DEMAND
Date: ${dateStr}

TO:
${company}
Attn: Chief Privacy Officer / Director of Database & Direct Mail Operations
${record.senderAddress ? record.senderAddress : ''}

FROM (CONSUMER):
Name: ${recipient}
Mailing Address: ${address}
${idLines ? `\nIDENTIFIERS EXTRACTED FROM PHYSICAL MAIL PIECE:\n${idLines}\n` : ''}
RE: MANDATORY PERMANENT SUPPRESSION FROM PHYSICAL MARKETING & DIRECT MAIL LISTS

To Whom It May Concern,

This letter serves as formal written notice and legal demand to IMMEDIATELY AND PERMANENTLY SUPPRESS the name, address, and household identifiers listed above from all future physical mailings, catalogs, promotional flyers, pre-screened credit solicitations, and marketing circulars originated or sponsored by ${company}, its parent entities, subsidiaries, affiliates, and contracted list brokers.

STATUTORY CITATIONS & ENFORCEMENT GROUNDS:
1. USPS Prohibitory Order (39 U.S.C. § 3008):
   Under federal postal law, an addressee has the absolute right to direct the Postmaster General to issue a prohibitory order against any sender of unsolicited matter. Continued delivery after statutory notice constitutes an actionable violation.
2. California Consumer Privacy Act (Cal. Civ. Code § 1798.120) & Analogous State Privacy Statutes:
   Pursuant to applicable state privacy rights, I exercise my statutory right to OPT OUT of the sale, sharing, licensing, and cross-contextual marketing use of my personal consumer information and postal address.
3. Direct Marketing Association (DMA Choice / ANA) List Suppression Guidelines:
   As a direct mail sender, you are required to scrub existing rental and prospect files against consumer opt-out demands prior to print production.

MANDATORY ACTIONS REQUIRED WITHIN 30 DAYS:
1. Place the aforementioned address and name variations on your internal and external DO NOT MAIL / SUPPRESSION database.
2. Direct all third-party list compilers, mailing houses, and lettershops acting on your behalf to remove these identifiers from upcoming distribution drops.
3. Delete all commercial prospect records associated with this address from your active marketing databases.

Receipt of this notification has been forensically logged with optical document capture of the physical mail piece, USPS tracking metadata, and delivery timestamps.

Sincerely,

${recipient}
${address}
Generated via TreeSaver Clean Mail Infrastructure
`.trim();
}

/**
 * Generates a Gmail Web Compose URL with prefilled recipient, subject, and encoded body.
 */
export function generateGmailComposeUrl(toEmail: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: toEmail,
    su: subject,
    body: body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/**
 * Generates an RFC-compliant mailto: URI.
 */
export function generateMailtoUri(toEmail: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
