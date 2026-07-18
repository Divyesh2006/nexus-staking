import type { ProcessResponse, StakingRecord } from './types';

const rawBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const API_BASE_URL = String(rawBase).replace(/\/+$/, '');

export function processScreenshots(files: File[], onProgress?: (progress: number, stage: string) => void) {
  return new Promise<ProcessResponse>((resolve, reject) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const request = new XMLHttpRequest();
    request.open('POST', `${API_BASE_URL}/api/process`);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 30);
        onProgress(progress, 'Uploading screenshots');
      }
    };

    request.onreadystatechange = () => {
      if (request.readyState !== XMLHttpRequest.DONE) {
        return;
      }
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100, 'OCR complete');
        resolve(JSON.parse(request.responseText) as ProcessResponse);
        return;
      }
      reject(new Error(request.responseText || 'Failed to process screenshots.'));
    };

    onProgress?.(10, 'Preparing upload');
    request.send(formData);
  });
}

export async function exportExcel(records: StakingRecord[]): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to export Excel.');
  }

  return response.blob();
}
