import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type ToastType = 'success' | 'error' | 'info';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function showToast(message: string, type: ToastType = 'success') {
  window.dispatchEvent(
    new CustomEvent('app-toast', {
      detail: { message, type, id: crypto.randomUUID() },
    })
  );
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('ar-SA', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

/**
 * Formats a phone number for WhatsApp wa.me links by automatically adding Iraq country code (964) in the background.
 */
export function formatIraqiWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('00964')) {
    cleaned = cleaned.substring(2);
  }

  if (cleaned.startsWith('964')) {
    return cleaned;
  }

  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  return `964${cleaned}`;
}

/**
 * Calculates and returns human-readable remaining days string for a delivery timestamp.
 */
export function getRemainingDaysText(timestamp: number): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const delDate = new Date(timestamp);
  const delDayStart = new Date(delDate.getFullYear(), delDate.getMonth(), delDate.getDate()).getTime();

  const diffDays = Math.round((delDayStart - todayStart) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'الموعد اليوم';
  if (diffDays === 1) return 'باقي يوم واحد (غداً)';
  if (diffDays === 2) return 'باقي يومان';
  if (diffDays > 2) return `باقي ${diffDays} أيام`;
  if (diffDays === -1) return 'متأخر منذ يوم واحد';
  if (diffDays === -2) return 'متأخر منذ يومين';
  return `متأخر منذ ${Math.abs(diffDays)} أيام`;
}

/**
 * Maximum compression image optimizer using Canvas API.
 * Converts heavy raw camera photos into lightweight WebP/JPEG data URLs (approx 20KB - 60KB).
 */
export function compressImage(
  fileOrDataUrl: File | Blob | string,
  maxWidth = 700,
  maxHeight = 700,
  quality = 0.55
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImg = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        // Fill background white for JPEG fallbacks (transparency protection)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try image/webp first for highest compression ratio
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {
          // fallback to jpeg if browser doesn't support webp canvas export
        }

        const jpegData = canvas.toDataURL('image/jpeg', quality);
        resolve(jpegData);
      };

      img.onerror = (err) => reject(err);
      img.src = src;
    };

    if (typeof fileOrDataUrl === 'string') {
      processImg(fileOrDataUrl);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          processImg(e.target.result as string);
        } else {
          reject(new Error('Failed to read image file'));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}


