/**
 * Utility functions for QR code processing
 */

/**
 * Extract itemId from QR format: ITM-VAI-KK-001-DN-PN-20250907-001-P1-1-3
 * ItemId is the part after ITM- and before the next dash sequence
 * @param qrData - The raw QR data string
 * @returns The extracted itemId or null if not found
 */
export const extractItemIdFromQR = (qrData: string): string | null => {
  const match = qrData.match(/^ITM-([^-]+-[^-]+-[^-]+)/);
  if (match && match[1]) {
    return match[1]; // Returns VAI-KK-001
  }
  return null;
};