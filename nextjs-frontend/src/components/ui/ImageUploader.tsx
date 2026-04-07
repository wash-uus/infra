'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, X, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageUploaderProps {
  /** Called every time the file list changes. Pass stored files up to the parent. */
  onFilesChange: (files: File[]) => void;
  /** Maximum total images (new + existing). Default 5. */
  maxImages?: number;
  /** Already-uploaded image URLs (edit mode). Shown as thumbnails but not removable here. */
  existingUrls?: string[];
  className?: string;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export default function ImageUploader({
  onFilesChange,
  maxImages = 5,
  existingUrls = [],
  className,
}: ImageUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [sizeErrors, setSizeErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming).filter((f) => f.type.startsWith('image/'));
      const oversized = arr.filter((f) => f.size > MAX_FILE_BYTES);
      const valid = arr.filter((f) => f.size <= MAX_FILE_BYTES);

      if (oversized.length > 0) {
        setSizeErrors(oversized.map((f) => `"${f.name}" is ${(f.size / 1024 / 1024).toFixed(1)} MB — max is 10 MB`));
      } else {
        setSizeErrors([]);
      }

      const available = maxImages - files.length - existingUrls.length;
      if (available <= 0 || valid.length === 0) return;
      const toAdd = valid.slice(0, available);

      const newFiles = [...files, ...toAdd];
      setFiles(newFiles);
      onFilesChange(newFiles);

      // Generate data-URL previews
      toAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    },
    [files, existingUrls.length, maxImages, onFilesChange],
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index);
      const newPreviews = previews.filter((_, i) => i !== index);
      setFiles(newFiles);
      setPreviews(newPreviews);
      onFilesChange(newFiles);
    },
    [files, previews, onFilesChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const totalImages = existingUrls.length + files.length;
  const canAddMore = totalImages < maxImages;

  return (
    <div className={cn('space-y-3', className)}>
      {sizeErrors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 space-y-0.5">
          {sizeErrors.map((msg, i) => (
            <p key={i} className="text-xs text-red-600">{msg}</p>
          ))}
        </div>
      )}
      {/* Drop zone — hidden once max reached */}
      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors select-none',
            dragging
              ? 'border-infra-primary bg-infra-primary/5'
              : 'border-gray-300 hover:border-infra-primary hover:bg-gray-50',
          )}
        >
          <Upload className="h-7 w-7 text-gray-400" />
          <p className="text-sm text-gray-500">
            <span className="font-medium text-infra-primary">Click to upload</span>{' '}
            or drag &amp; drop
          </p>
          <p className="text-xs text-gray-400">
            PNG, JPG, WEBP · up to 10 MB each · {totalImages}/{maxImages} images
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>
      )}

      {/* Thumbnail grid */}
      {(files.length > 0 || existingUrls.length > 0) && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {existingUrls.map((url, i) => (
            <div
              key={`existing-${i}`}
              className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded bg-gray-900/60 px-1.5 py-0.5 text-[10px] text-white">
                Saved
              </span>
            </div>
          ))}
          {previews.map((src, i) => (
            <div
              key={`new-${i}`}
              className="relative aspect-square overflow-hidden rounded-xl border-2 border-infra-primary/30 bg-gray-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label="Remove image"
                className="absolute right-1.5 top-1.5 rounded-full bg-red-500 p-0.5 text-white shadow hover:bg-red-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {/* Add more button when there's already at least one image */}
          {canAddMore && totalImages > 0 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-infra-primary hover:text-infra-primary transition-colors"
            >
              <ImagePlus className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
