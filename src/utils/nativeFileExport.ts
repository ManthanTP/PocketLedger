import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface ExportFileOptions {
  filename: string;
  data: string; // UTF-8 text string (for JSON/CSV) or base64 string (for PDF)
  mimeType: string;
  isBase64?: boolean;
  dialogTitle?: string;
}

/**
 * Exports a file by:
 * - Writing to device cache and opening the native share sheet on Android/iOS (Capacitor)
 * - Creating a blob URL and triggering a download link on Web
 */
export async function exportFile(options: ExportFileOptions): Promise<void> {
  const {
    filename,
    data,
    mimeType,
    isBase64 = false,
    dialogTitle = 'Save or Share File',
  } = options;

  if (Capacitor.isNativePlatform()) {
    try {
      let writeResult;

      if (isBase64) {
        // Strip any data URI prefix if present (e.g. data:application/pdf;base64,...)
        const rawBase64 = data.includes(',') ? data.split(',')[1] : data;
        writeResult = await Filesystem.writeFile({
          path: filename,
          data: rawBase64,
          directory: Directory.Cache,
        });
      } else {
        writeResult = await Filesystem.writeFile({
          path: filename,
          data: data,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
      }

      // Open Android native share sheet so user can Save to Downloads, Drive, Files, WhatsApp, etc.
      await Share.share({
        title: filename,
        text: `Exported ${filename}`,
        files: [writeResult.uri],
        dialogTitle: dialogTitle,
      });
    } catch (err) {
      console.error('Error during native file export:', err);
      throw err;
    }
  } else {
    // Standard web browser download
    let blob: Blob;

    if (isBase64) {
      const rawBase64 = data.includes(',') ? data.split(',')[1] : data;
      const byteCharacters = atob(rawBase64);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      blob = new Blob([byteNumbers], { type: mimeType });
    } else {
      blob = new Blob([data], { type: mimeType });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1500);
  }
}
