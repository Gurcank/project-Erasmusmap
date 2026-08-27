"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useT } from "@/hooks/useT";
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
            className="w-14 h-14 rounded-full object-cover border border-gray-200 dark:border-white/10 ring-2 ring-transparent transition-all duration-300 hover:ring-indigo-400/40"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl ring-2 ring-transparent transition-all duration-300 hover:ring-indigo-400/40">
            {fallbackLabel.charAt(0).toUpperCase()}
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors duration-200 disabled:opacity-50"
          >
            {isUploading ? t.uploadingPhoto : t.changePhoto}
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isUploading}
              className="text-xs px-3 py-1.5 rounded-lg font-medium border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-white/70 hover:text-red-500 hover:border-red-300 dark:hover:border-red-400/40 transition-colors duration-150 disabled:opacity-50"
            >
              {t.removePhoto}
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ACCEPT_ATTRIBUTE}
          onChange={handleFileChange}
          className="hidden"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
