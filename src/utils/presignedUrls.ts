export interface PresignedUrlResponse {
  signedUrl: string;
  expiresAt: string;
}

export async function generatePresignedUrl(
  storagePath: string, 
  expiresIn: number = 3600
): Promise<PresignedUrlResponse | null> {
  try {
    const response = await fetch('/api/files/presigned-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storagePath,
        expiresIn,
      }),
    });

    if (!response.ok) {
      console.error('Failed to generate presigned URL:', response.statusText);
      return null;
    }

    const data: PresignedUrlResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return null;
  }
}

export function isUrlExpired(expiresAt?: string): boolean {
  if (!expiresAt) return true;
  return new Date() >= new Date(expiresAt);
}