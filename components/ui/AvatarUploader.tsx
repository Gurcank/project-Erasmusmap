"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useT } from "@/hooks/useT";
import GlassButton from "@/components/ui/GlassButton";
import {
  AVATAR_ACCEPT_ATTRIBUTE,
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_UPLOAD_BYTES,
} from "@/lib/avatar";

export default function AvatarUploader({
  image,
  fallbackLabel,
}: {
  image: string | null;
  fallbackLabel: string;
}) {
  const t = useT();
  const router = useRouter();
  const { update } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(image);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");

    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
      setError(t.photoInvalidType);
      return;
    }
    if (file.size > AVATAR_MAX_UPLOAD_BYTES) {
      setError(t.photoTooLarge);
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.photoUploadError);
      setPreview(data.image);
      await update();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.photoUploadError);
      setPreview(image);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  };

  const handleRemove = async () => {
    setError("");
    setIsUploading(true);
    try {
      const res = await fetch("/api/avatar", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t.photoUploadError);
      }
      setPreview(null);
      await update();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.photoUploadError);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        {preview ? (
          // Plain <img> on purpose: preview holds a local blob: URL while an
          // upload is in flight, which the image optimizer cannot fetch.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="h-14 w-14 rounded-full border border-border object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-raised text-xl font-semibold text-text-muted ring-1 ring-border"
          >
            {fallbackLabel.trim().charAt(0).toUpperCase() || "?"}
          </span>
        )}
        {isUploading && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink-950/50">
            <Loader2
              size={18}
              aria-hidden="true"
              className="animate-spin text-ink-50 motion-reduce:animate-none"
            />
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex gap-2">
          <GlassButton
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            variant="primary"
            size="sm"
          >
            <Upload size={13} aria-hidden="true" />
            {isUploading
              ? t.uploadingPhoto
              : preview
                ? t.changePhoto
                : t.addPhoto}
          </GlassButton>
          {preview && (
            <GlassButton
              onClick={handleRemove}
              disabled={isUploading}
              variant="danger"
              size="sm"
            >
              <Trash2 size={13} aria-hidden="true" />
              {t.removePhoto}
            </GlassButton>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ACCEPT_ATTRIBUTE}
          onChange={handleFileChange}
          className="hidden"
        />
        {error && (
          <p className="text-xs text-danger-700 dark:text-danger-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
