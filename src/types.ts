export type MailRegionType =
  | 'SENDER_ADDRESS'
  | 'RECIPIENT_ADDRESS'
  | 'POSTAL_BARCODE'
  | 'RETURN_PERMIT'
  | 'KEY_CODE'
  | 'CUSTOM';

export interface MailRegionAnnotation {
  id: string;
  label: MailRegionType;
  /** Normalized bounding box [ymin, xmin, ymax, xmax] from 0 to 1000 */
  box: [number, number, number, number];
  color: string;
  userNotes?: string;
}

export type OptOutStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'READY_FOR_VERIFICATION'
  | 'OPT_OUT_SUBMITTED'
  | 'CONFIRMED_STOPPED'
  | 'FAILED_SCAN';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface OptOutRecord {
  id: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  imageThumbnailUrl?: string;
  regions?: MailRegionAnnotation[];

  // Extracted Sender Data
  companyName: string;
  companyDomain?: string;
  senderAddress?: string;

  // Extracted Recipient & Tracking
  recipientName?: string;
  recipientAddress?: string;
  customerNumber?: string;
  keyCodes?: string[];
  postalBarcodeDigits?: string;
  permitNumber?: string;

  // Contact & Channel
  targetContact: string; // Verified email or postal address
  portalUrl?: string;
  channelType: 'DIRECT_EMAIL' | 'WEB_PORTAL' | 'POSTAL_MAIL' | 'PHONE';
  verificationConfidence: number; // 0.0 to 1.0
  groundingSources?: GroundingSource[];

  // Legal Notice
  legalNoticeContent?: string;
  status: OptOutStatus;
  submittedAt?: string;
  responseNotes?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  isAdmin: boolean;
  mailingAddress?: string;
}

export interface ProcessedMailResult {
  companyName: string;
  senderAddress: string;
  recipientName: string;
  recipientAddress: string;
  customerNumber: string;
  keyCodes: string[];
  postalBarcodeDigits: string;
  permitNumber: string;
  suggestedOptOutChannel: 'DIRECT_EMAIL' | 'WEB_PORTAL' | 'POSTAL_MAIL';
  confidence: number;
  companyDomain?: string;
  targetContact?: string;
  portalUrl?: string;
  groundingSources?: GroundingSource[];
  legalNoticeContent?: string;
}

export interface VerifiedCompany {
  id: string;
  name: string;
  aliases: string[];
  domain: string;
  privacyEmail: string;
  portalUrl?: string;
  category: 'Catalog' | 'Credit/Bank' | 'Charity' | 'Telecom/Cable' | 'Insurance' | 'Retail' | 'Data Broker';
  notes: string;
  statutoryBasis: string;
}
