import { useEffect, useState } from 'react';
import { signedAttachmentUrls, type StoredAttachment } from '@/lib/attachments';
import { cn } from '@/lib/utils';

/** Renders stored image attachments as clickable thumbnails. */
export default function AttachmentGallery({
  attachments,
  className,
  size = 'md',
}: {
  attachments?: StoredAttachment[] | null;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const list = Array.isArray(attachments) ? attachments.filter((a) => a?.path) : [];
  const key = list.map((a) => a.path).join('|');

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    (async () => {
      const map = await signedAttachmentUrls(key.split('|'));
      if (!cancelled) setUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (list.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {list.map((a) => {
        const url = urls[a.path];
        return (
          <a
            key={a.path}
            href={url || '#'}
            target="_blank"
            rel="noreferrer"
            title={a.name}
            onClick={(e) => {
              if (!url) e.preventDefault();
            }}
          >
            {url ? (
              <img
                src={url}
                alt={a.name}
                className={cn(
                  'rounded border object-cover',
                  size === 'sm' ? 'h-14 w-14' : 'h-20 w-20',
                )}
              />
            ) : (
              <div
                className={cn(
                  'animate-pulse rounded border bg-muted',
                  size === 'sm' ? 'h-14 w-14' : 'h-20 w-20',
                )}
              />
            )}
          </a>
        );
      })}
    </div>
  );
}
