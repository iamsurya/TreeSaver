/**
 * High-performance image utilities for physical mail document scanning,
 * 90° rotation, and normalized coordinate calculations.
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Loads an image from a data URI or URL and returns its natural dimensions.
 */
export function getImageDimensions(dataUri: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = () => reject(new Error('Failed to load image for dimension calculation'));
    img.src = dataUri;
  });
}

/**
 * Rotates an image by specified degrees (e.g., 90, 180, 270) clockwise.
 * Swaps dimensions cleanly, scales down to max 1920px if larger,
 * and outputs a compressed JPEG data URI at 0.85 quality.
 */
export async function rotateImage(dataUri: string, degrees = 90): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const rads = (degrees * Math.PI) / 180;
      const is90or270 = Math.abs(degrees % 180) === 90;

      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      // Target bounds (max 1920px longest side)
      const maxDim = 1920;
      let targetW = is90or270 ? origH : origW;
      let targetH = is90or270 ? origW : origH;

      if (Math.max(targetW, targetH) > maxDim) {
        const scale = maxDim / Math.max(targetW, targetH);
        targetW = Math.round(targetW * scale);
        targetH = Math.round(targetH * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas 2D context'));
        return;
      }

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rads);

      const drawW = is90or270 ? targetH : targetW;
      const drawH = is90or270 ? targetW : targetH;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const compressedDataUri = canvas.toDataURL('image/jpeg', 0.85);
      resolve(compressedDataUri);
    };
    img.onerror = () => reject(new Error('Failed to load image for rotation'));
    img.src = dataUri;
  });
}

/**
 * Compresses an image file from File input to a high-quality JPEG Data URI.
 */
export async function fileToCompressedDataUri(file: File, maxDimension = 1920, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target?.result as string;
      if (!dataUri) {
        reject(new Error('Could not read file'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;

        if (Math.max(w, h) > maxDimension) {
          const ratio = maxDimension / Math.max(w, h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUri);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to parse uploaded image'));
      img.src = dataUri;
    };
    reader.onerror = () => reject(new Error('File reading error'));
    reader.readAsDataURL(file);
  });
}

/**
 * Creates high-fidelity realistic synthetic sample mail pieces on HTML5 canvas
 * representing typical junk mail pieces with sender return addresses,
 * recipient address windows, USPS Intelligent Mail Barcodes, key codes, and BRM indicia.
 */
export function createSampleMailPiece(sampleType: 'VALPAK' | 'CREDIT_CARD' | 'CATALOG' | 'CHARITY'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background envelope / postcard texture
  if (sampleType === 'VALPAK') {
    ctx.fillStyle = '#0284c7'; // Valpak signature cyan-blue
    ctx.fillRect(0, 0, 1200, 700);

    // White coupon window
    ctx.fillStyle = '#ffffff';
    ctx.roundRect ? ctx.roundRect(40, 40, 1120, 620, 16) : ctx.fillRect(40, 40, 1120, 620);
    ctx.fill();

    // Valpak brand header
    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('Valpak® Direct Marketing Systems', 80, 110);
    ctx.fillStyle = '#475569';
    ctx.font = '18px sans-serif';
    ctx.fillText('1 Valpak Ave N, St. Petersburg, FL 33716', 80, 145);
    ctx.fillText('RETURN SERVICE REQUESTED', 80, 175);

    // Postal Indicia (top right)
    ctx.strokeStyle = '#0f172a';
    ctx.strokeRect(960, 70, 160, 100);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('PRSRT STD', 1000, 100);
    ctx.fillText('U.S. POSTAGE', 990, 120);
    ctx.fillText('PAID', 1025, 140);
    ctx.fillText('VALPAK', 1015, 160);

    // Recipient address window
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(250, 260, 680, 220);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(250, 260, 680, 220);

    // Address text
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('*****************5-DIGIT 94107', 290, 310);
    ctx.font = '22px monospace';
    ctx.fillText('CURRENT RESIDENT OR VALUED HOMEOWNER', 290, 345);
    ctx.fillText('1428 ELM STREET APT 4B', 290, 380);
    ctx.fillText('SAN FRANCISCO CA  94107-1304', 290, 415);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('KEY: VP-94107-8842-X9091', 290, 450);

    // Intelligent Mail Barcode representation
    ctx.fillStyle = '#0f172a';
    const startX = 250;
    const barcodeY = 530;
    for (let i = 0; i < 65; i++) {
      const h = (i % 3 === 0) ? 40 : (i % 2 === 0 ? 25 : 15);
      ctx.fillRect(startX + (i * 10), barcodeY - (h / 2), 4, h);
    }
    ctx.font = '16px monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText('IMb: 0070104847291048572910485920194', 250, 580);

  } else if (sampleType === 'CREDIT_CARD') {
    // Official looking Pre-Approved envelope
    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(0, 0, 1200, 700);

    // Top left sender
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 28px serif';
    ctx.fillText('CAPITAL ONE FINANCIAL', 80, 90);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('PO Box 30285', 80, 120);
    ctx.fillText('Salt Lake City, UT 84130-0285', 80, 145);

    // Top right presorted first class
    ctx.strokeStyle = '#0f172a';
    ctx.strokeRect(960, 60, 160, 90);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('PRESORTED', 1005, 88);
    ctx.fillText('FIRST-CLASS MAIL', 975, 108);
    ctx.fillText('U.S. POSTAGE PAID', 975, 128);

    // Urgent banner
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('PRE-APPROVED NOTICE: TIME-SENSITIVE CREDIT OFFER', 180, 240);

    // Recipient Glassine Window
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(200, 290, 750, 240);
    ctx.strokeStyle = '#94a3b8';
    ctx.strokeRect(200, 290, 750, 240);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('OPT-OUT CODE: C1-7894-9912-A', 240, 340);
    ctx.font = '22px monospace';
    ctx.fillText('JOHNATHAN DOE', 240, 380);
    ctx.fillText('742 EVERGREEN TERRACE', 240, 415);
    ctx.fillText('SPRINGFIELD OR  97477-0021', 240, 450);
    ctx.font = '15px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('ACCT REF: #000492819034', 240, 490);

    // Barcode at bottom
    ctx.fillStyle = '#0f172a';
    for (let i = 0; i < 65; i++) {
      const h = (i % 4 === 0) ? 42 : (i % 2 === 0 ? 28 : 16);
      ctx.fillRect(200 + (i * 11), 580 - (h / 2), 4, h);
    }
    ctx.font = '16px monospace';
    ctx.fillText('0126004928104859201948572019485', 200, 630);

  } else if (sampleType === 'CATALOG') {
    // Heavy Catalog back cover
    ctx.fillStyle = '#f5f5f4';
    ctx.fillRect(0, 0, 1200, 700);

    // Catalog branding
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 36px serif';
    ctx.fillText('ULINE SHIPPING SUPPLY SPECIALISTS', 80, 100);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#57534e';
    ctx.fillText('12575 Uline Drive, Pleasant Prairie, WI 53158', 80, 135);
    ctx.fillText('uline.com • 1-800-295-5510', 80, 165);

    // Mailing Label Box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(450, 260, 680, 340);
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 2;
    ctx.strokeRect(450, 260, 680, 340);

    // Customer & Key Code
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('CUSTOMER NUMBER:  UL-4819204', 480, 320);
    ctx.fillStyle = '#2563eb';
    ctx.fillText('SOURCE / KEY CODE:  FALL-CAT-2026', 480, 360);

    ctx.fillStyle = '#1c1917';
    ctx.font = '22px monospace';
    ctx.fillText('ACME INDUSTRIAL SUPPLIES', 480, 420);
    ctx.fillText('ATTN: PURCHASING DEPT', 480, 455);
    ctx.fillText('500 HOWARD STREET FL 3', 480, 490);
    ctx.fillText('SAN FRANCISCO CA  94105-3001', 480, 525);

    // Barcode
    ctx.fillStyle = '#1c1917';
    for (let i = 0; i < 65; i++) {
      const h = (i % 3 === 1) ? 38 : (i % 2 === 0 ? 24 : 14);
      ctx.fillRect(80 + (i * 5), 450 - (h / 2), 3, h);
    }
    ctx.font = '14px monospace';
    ctx.fillText('IMb: 407001928472910485', 80, 490);

  } else {
    // Charity Business Reply Mail envelope
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1200, 700);

    // Return Address (Left)
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText("ST. JUDE CHILDREN'S RESEARCH HOSPITAL", 80, 90);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('501 St. Jude Place', 80, 120);
    ctx.fillText('Memphis, TN 38105', 80, 145);

    // Top Right Business Reply Indicia
    ctx.strokeRect(820, 60, 320, 140);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('BUSINESS REPLY MAIL', 880, 95);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('FIRST-CLASS MAIL PERMIT NO. 1112 MEMPHIS TN', 835, 125);
    ctx.font = '13px sans-serif';
    ctx.fillText('POSTAGE WILL BE PAID BY ADDRESSEE', 860, 150);

    // FIM bars
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(750 + (i * 14), 60, 5, 60);
    }

    // Recipient / Donor Box
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(280, 300, 640, 210);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(280, 300, 640, 210);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('DONOR ID: SJ-99120-X', 320, 350);
    ctx.font = '22px monospace';
    ctx.fillText('ELEANOR VANCE', 320, 395);
    ctx.fillText('100 CASTLE ROAD', 320, 430);
    ctx.fillText('PORTLAND OR  97201-1002', 320, 465);

    // Bottom Barcode
    for (let i = 0; i < 65; i++) {
      const h = (i % 5 === 0) ? 44 : (i % 2 === 0 ? 26 : 14);
      ctx.fillRect(280 + (i * 10), 570 - (h / 2), 4, h);
    }
    ctx.font = '15px monospace';
    ctx.fillText('0070104859201948572910485920194', 280, 620);
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}
