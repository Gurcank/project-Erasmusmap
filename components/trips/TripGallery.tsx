"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import ActionForm from "@/components/ui/ActionForm";
import GlassButton from "@/components/ui/GlassButton";
import {
  withSuccess,
  type TripActions,
} from "@/components/trips/planner-types";
import { useTripT } from "@/hooks/useTripT";
import { AVATAR_ACCEPT_ATTRIBUTE } from "@/lib/avatar";
import {
  TRIP_PHOTO_CAPTION_MAX,
  TRIP_PHOTO_MAX_UPLOAD_BYTES,
} from "@/lib/trip-schemas";
import type { TripView } from "@/lib/trip-types";

type Props = {
  trip: TripView;
  isOwner: boolean;
  uploadsEnabled: boolean;
  actions: TripActions;
};

type Shot = {
  key: string;
  url: string;
  caption: string | null;
  cityId: string | null;
  /** Set for an uploaded photo, which can be deleted; city photos cannot. */
  photoId: string | null;
};

export default function TripGallery({
  trip,
  isOwner,
  uploadsEnabled,
  actions,
}: Props) {
  const { tt } = useTripT();
  const router = useRouter();
  const [filter, setFilter] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // The traveller's own photos first, then a photo of every city on the route.
  const shots: Shot[] = [
    ...trip.photos.map((photo) => ({
      key: photo.id,
      url: photo.url,
      caption: photo.caption,
      cityId: photo.cityId,
      photoId: photo.id,
    })),
    ...trip.cities
      .filter((entry) => entry.city.imageUrl)
      .map((entry) => ({
        key: `city-${entry.city.id}`,
        url: entry.city.imageUrl!,
        caption: entry.city.name,
        cityId: entry.city.id,
        photoId: null,
      })),
  ];
  const visible = filter
    ? shots.filter((shot) => shot.cityId === filter)
    : shots;
  const current = open !== null ? visible[open] : null;
  const cityName = new Map(
    trip.cities.map((entry) => [entry.city.id, entry.city.name]),
  );

  // The native dialog gives focus trapping and Escape for free.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (current && !dialog.open) dialog.showModal();
    if (!current && dialog.open) dialog.close();
  }, [current]);

  const step = (delta: number) =>
    setOpen((index) =>
      index === null ? null : (index + delta + visible.length) % visible.length,
    );

  const upload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) return;
    if (file.size > TRIP_PHOTO_MAX_UPLOAD_BYTES) {
      setError(`${tt.uploadFailed} (4MB)`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const response = await fetch(`/api/trips/${trip.id}/photos`, {
        method: "POST",
        body: data,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? tt.uploadFailed);
        return;
      }
      form.reset();
      router.refresh();
    } catch {
      setError(tt.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-2xl font-bold text-on-backdrop">
        {tt.sectionGallery}
      </h2>

      {isOwner && uploadsEnabled && (
        <form
          ref={formRef}
          onSubmit={upload}
          className="glass grid gap-3 rounded-panel border border-border bg-surface p-4 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end"
        >
          <label className="text-xs text-text-subtle">
            {tt.uploadPhoto}
            <input
              type="file"
              name="file"
              required
              accept={AVATAR_ACCEPT_ATTRIBUTE}
              className="field mt-1 w-full px-2 py-1.5 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary/15 file:px-3 file:py-1 file:text-text"
            />
          </label>
          <label className="text-xs text-text-subtle">
            {tt.caption}
            <input
              name="caption"
              maxLength={TRIP_PHOTO_CAPTION_MAX}
              className="field mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-text-subtle">
            {tt.photoCity}
            <select
              name="cityId"
              className="field mt-1 w-full px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {trip.cities.map((entry) => (
                <option key={entry.city.id} value={entry.city.id}>
                  {entry.city.name}
                </option>
              ))}
            </select>
          </label>
          <GlassButton type="submit" variant="primary" disabled={uploading}>
            {uploading ? (
              <Loader2 size={15} aria-hidden="true" className="animate-spin" />
            ) : (
              <ImagePlus size={15} aria-hidden="true" />
            )}
            {uploading ? tt.uploading : tt.uploadPhoto}
          </GlassButton>
          {error && (
            <p
              role="alert"
              className="text-sm text-danger-700 sm:col-span-4 dark:text-danger-400"
            >
              {error}
            </p>
          )}
        </form>
      )}

      {trip.cities.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {[
            { id: null, name: tt.allCities },
            ...trip.cities.map((entry) => entry.city),
          ].map((city) => (
            <button
              key={city.id ?? "all"}
              type="button"
              aria-pressed={filter === city.id}
              onClick={() => {
                setFilter(city.id);
                setOpen(null);
              }}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                filter === city.id
                  ? "border-primary bg-primary text-on-primary"
                  : "glass border-border bg-surface text-text hover:bg-surface-raised"
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="glass rounded-panel border border-border bg-surface p-6 text-sm text-text-muted">
          {tt.noPhotos}
        </p>
      ) : (
        // Masonry through CSS columns: photos keep their own proportions.
        <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
          {visible.map((shot, index) => (
            <button
              key={shot.key}
              type="button"
              onClick={() => setOpen(index)}
              className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-card border border-border focus-visible:outline-2 focus-visible:outline-focus"
            >
              <Image
                src={shot.url}
                alt={shot.caption ?? ""}
                width={600}
                height={400}
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
              />
              {(shot.caption || shot.cityId) && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/85 to-transparent px-3 pt-6 pb-2 text-left text-xs text-ink-50">
                  {shot.caption ?? cityName.get(shot.cityId ?? "")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") step(1);
          if (event.key === "ArrowLeft") step(-1);
        }}
        className="m-auto max-h-[92vh] w-[min(92vw,72rem)] overflow-hidden rounded-panel border border-border bg-ink-950 p-0 text-ink-50 backdrop:bg-ink-950/85"
      >
        {current && (
          <div className="relative">
            <Image
              src={current.url}
              alt={current.caption ?? ""}
              width={1600}
              height={1067}
              sizes="92vw"
              className="max-h-[80vh] w-full object-contain"
            />
            <div className="flex items-center gap-3 p-3">
              <p className="flex-1 text-sm">
                {current.caption}
                {current.cityId &&
                  current.caption !== cityName.get(current.cityId) && (
                    <span className="text-ink-300">
                      {" "}
                      · {cityName.get(current.cityId)}
                    </span>
                  )}
              </p>
              {isOwner && current.photoId && (
                <ActionForm
                  action={withSuccess(actions.deleteTripPhoto, () =>
                    setOpen(null),
                  )}
                  confirmMessage={tt.confirmDeletePhoto}
                  confirmLabel={tt.delete}
                >
                  <input type="hidden" name="tripId" value={trip.id} />
                  <input type="hidden" name="photoId" value={current.photoId} />
                  <GlassButton type="submit" size="sm" variant="danger">
                    <Trash2 size={14} aria-hidden="true" />
                    {tt.delete}
                  </GlassButton>
                </ActionForm>
              )}
            </div>
            {visible.length > 1 && (
              <>
                <LightboxButton
                  side="left"
                  label={tt.prev}
                  onClick={() => step(-1)}
                >
                  <ChevronLeft size={22} aria-hidden="true" />
                </LightboxButton>
                <LightboxButton
                  side="right"
                  label={tt.next}
                  onClick={() => step(1)}
                >
                  <ChevronRight size={22} aria-hidden="true" />
                </LightboxButton>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label={tt.close}
              className="absolute top-3 right-3 rounded-full bg-ink-950/70 p-2 hover:bg-ink-950"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}

function LightboxButton({
  side,
  label,
  onClick,
  children,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-ink-950/70 p-2 hover:bg-ink-950 ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      {children}
    </button>
  );
}
