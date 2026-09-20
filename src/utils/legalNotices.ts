import { OptOutRecord } from '../types';

export function generateLegalNoticeText(
  record: Partial<OptOutRecord>,
  userName?: string,
  userAddress?: string,
  tone: 'polite' | 'formal' = 'polite'
): string {
  const recipient = record.recipientName || userName || 'Resident';
  const address = record.recipientAddress || userAddress || '[Mailing Address]';
  const company = record.companyName || 'Mailing List Operations';
  const customerId = record.customerNumber ? `Customer / Account ID: ${record.customerNumber}` : '';
  const keyCodes = record.keyCodes && record.keyCodes.length > 0 ? `Key / Source Code: ${record.keyCodes.join(', ')}` : '';
  const barcode = record.postalBarcodeDigits ? `USPS Barcode Digits: ${record.postalBarcodeDigits}` : '';
  const permit = record.permitNumber ? `Permit / Reference: ${record.permitNumber}` : '';

  const idList = [customerId, keyCodes, barcode, permit].filter(Boolean);
  const idSection = idList.length > 0 
    ? `\nDetails from the mail piece:\n${idList.map(item => `• ${item}`).join('\n')}\n`
    : '';

  if (tone === 'formal') {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `Formal Notice of Mailing List Removal Request
Date: ${dateStr}

To: ${company}
${record.senderAddress ? record.senderAddress : ''}

From:
Name: ${recipient}
Mailing Address: ${address}
${idSection}
Please remove the name and address listed above from all future physical mailings, catalogs, circulars, and promotional postal distribution lists originated by ${company} and your marketing partners.

Thank you for updating your records.

Sincerely,

${recipient}
${address}`.trim();
  }

  // Friendly & Polite (Default)
  return `Hello,

Could you please remove my name and address from your direct mail and marketing postal distribution lists?

Mailing details:
• Name: ${recipient}
• Mailing Address: ${address}
${idSection}
Please update your records and any list distribution partners so that future flyers, catalogs, or promotional mailers are no longer sent to this address.

Thank you very much for your help!

Best regards,

${recipient}
${address}`.trim();
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
