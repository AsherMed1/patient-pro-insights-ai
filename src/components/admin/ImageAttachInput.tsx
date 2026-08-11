import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  formatBytes,
  isAcceptedImage,
} from '@/lib/attachments';
import { cn } from '@/lib/utils';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  hint?: string;
  children: React.ReactNode;
}

/**
 * Wraps a composer so users can paste (screenshots), drag-and-drop, or pick
 * images. Selected images are previewed and uploaded by the parent on send.
 */
export default function ImageAttachInput({
  files,
  onChange,
  disabled,
  className,
  hint = 'Paste a screenshot, drag an image in, or attach',
  children,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { toast } = useToast();

  const previews = useMemo(
    () => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [files],
  );
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const add = (incoming: File[]) => {
    if (disabled || incoming.length === 0) return;
    const accepted: File[] = [];
    for (const f of incoming) {
      if (!isAcceptedImage(f)) {
        toast({ title: 'Only image files can be attached', variant: 'destructive' });
        continue;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        toast({
          title: `${f.name} is too large`,
          description: `Max ${formatBytes(MAX_IMAGE_BYTES)} per image.`,
          variant: 'destructive',
        });
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length === 0) return;
    if (files.length + accepted.length > MAX_IMAGES) {
      toast({ title: `Up to ${MAX_IMAGES} images per message` });
    }
    onChange([...files, ...accepted].slice(0, MAX_IMAGES));
  };

  return (
    <div
      className={cn('space-y-2', dragging && 'rounded-md ring-2 ring-primary', className)}
      onPaste={(e) => {
        const imgs = Array.from(e.clipboardData?.files || []).filter((f) => isAcceptedImage(f));
        if (imgs.length) {
          e.preventDefault();
          add(imgs);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (e.dataTransfer?.files?.length) {
          e.preventDefault();
          setDragging(false);
          add(Array.from(e.dataTransfer.files));
        }
      }}
    >
      {children}

      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((p, i) => (
            <div key={`${p.file.name}-${i}`} className="relative">
              <img
                src={p.url}
                alt={p.file.name}
                className="h-16 w-16 rounded border object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="absolute -right-1.5 -top-1.5 rounded-full border bg-background p-0.5 shadow"
                title="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            add(Array.from(e.target.files || []));
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="mr-1 h-3 w-3" /> Attach image
        </Button>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
    </div>
  );
}
