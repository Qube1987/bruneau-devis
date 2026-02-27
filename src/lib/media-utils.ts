export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export interface MediaDeduplicationInfo {
  hash: string;
  size: number;
  originalFilename: string;
}

export async function getMediaInfo(file: File): Promise<MediaDeduplicationInfo> {
  const hash = await calculateFileHash(file);
  return {
    hash,
    size: file.size,
    originalFilename: file.name
  };
}
