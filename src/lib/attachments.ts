import { supabase } from '@/integrations/supabase/client';

export const ATTACHMENT_BUCKET = 'qa-ticket-attachments';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES = 5;

export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];

export interface StoredAttachment {
  name: string;
  path: string;
  size: number;
  type: string;
}

export const isAcceptedImage = (file: File) =>
  ACCEPTED_IMAGE_TYPES.includes((file.type || '').toLowerCase()) ||
  /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(file.name);

/** Upload a set of image files under `prefix` and return their stored metadata. */
export const uploadImages = async (
  files: File[],
  prefix: string,
): Promise<StoredAttachment[]> => {
  const uploaded: StoredAttachment[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^\w.\-]+/g, '_') || 'image.png';
    const path = `${prefix.replace(/\/+$/, '')}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${safeName}`;
    const { error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, file, { contentType: file.type || 'image/png', upsert: false });
    if (error) throw new Error(`${file.name}: ${error.message}`);
    uploaded.push({
      name: file.name,
      path,
      size: file.size,
      type: file.type || 'image/png',
    });
  }
  return uploaded;
};

/** Short-lived signed URL for a stored attachment. */
export const signedAttachmentUrl = async (
  path: string,
  expiresIn = 3600,
): Promise<string | null> => {
  const { data } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
};

export const signedAttachmentUrls = async (
  paths: string[],
  expiresIn = 3600,
): Promise<Record<string, string>> => {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrls(paths, expiresIn);
  const map: Record<string, string> = {};
  (data || []).forEach((d: any) => {
    if (d?.path && d?.signedUrl) map[d.path] = d.signedUrl;
  });
  return map;
};

export const formatBytes = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
