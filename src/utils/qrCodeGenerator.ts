import QRCode from 'qrcode';

/**
 * Generates a real ISO/IEC 18004 camera-scannable QR code boolean matrix
 * synchronously using the `qrcode` specification encoder (Reed-Solomon ECC Level M).
 */
export function generateScannableQrMatrix(payloadUrl: string): boolean[][] {
  const safeText = (payloadUrl || 'https://hkinsurehub.pro').trim();
  const qr = QRCode.create(safeText, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const matrix: boolean[][] = [];

  for (let r = 0; r < size; r += 1) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c += 1) {
      row.push(Boolean(data[r * size + c]));
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Generates a high-resolution PNG Data URL suitable for printing on physical
 * proposal handovers or scanning directly from a tablet/desktop screen.
 */
export async function generateScannableQrPngDataUrl(
  payloadUrl: string,
  options?: { width?: number; darkColor?: string; lightColor?: string }
): Promise<string> {
  const safeText = (payloadUrl || 'https://hkinsurehub.pro').trim();
  return QRCode.toDataURL(safeText, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: options?.width ?? 480,
    color: {
      dark: options?.darkColor ?? '#060D18',
      light: options?.lightColor ?? '#FFFFFF',
    },
  });
}
