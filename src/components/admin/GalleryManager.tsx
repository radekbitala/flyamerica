"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Upload } from "lucide-react";
import type { GalleryItem, PostGallery } from "@/lib/db/schema";
import { POST_LIMITS, UPLOADS_DISABLED_MESSAGE } from "@/lib/post-form";
import { ConfirmDialog } from "./ConfirmDialog";
import { ACCEPTED_IMAGE_TYPES, photoCount, uploadImage } from "./image-upload";

const smallButton =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-field bg-white px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";
const iconButton =
  "cursor-pointer rounded p-1.5 text-text-secondary hover:bg-gray-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30";

function newGalleryId(existing: PostGallery[]): string {
  const taken = new Set(existing.map((g) => g.id));
  let id: string;
  do {
    // getRandomValues funguje i mimo https (randomUUID ne), třeba při
    // zkoušení administrace z telefonu přes adresu v místní síti.
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    id = `g-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  } while (taken.has(id));
  return id;
}

interface Progress {
  galleryId: string;
  done: number;
  total: number;
}

export function GalleryManager({
  galleries,
  setGalleries,
  idsInText,
  uploadsEnabled,
  error,
  onUploadingChange,
  onPlace,
  onRemoveFromText,
}: {
  galleries: PostGallery[];
  setGalleries: React.Dispatch<React.SetStateAction<PostGallery[]>>;
  idsInText: string[];
  uploadsEnabled: boolean;
  error?: string;
  onUploadingChange: (busy: boolean) => void;
  onPlace: (id: string) => void;
  onRemoveFromText: (id: string) => void;
}) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<string | null>(null);

  const updateItems = (
    galleryId: string,
    update: (items: GalleryItem[]) => GalleryItem[],
  ) =>
    setGalleries((prev) =>
      prev.map((g) => (g.id === galleryId ? { ...g, items: update(g.items) } : g)),
    );

  const moveItem = (galleryId: string, index: number, offset: -1 | 1) =>
    updateItems(galleryId, (items) => {
      const target = index + offset;
      if (target < 0 || target >= items.length) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const addGallery = () =>
    setGalleries((prev) => [...prev, { id: newGalleryId(prev), items: [] }]);

  const removeGallery = (id: string) => {
    setGalleries((prev) => prev.filter((g) => g.id !== id));
    onRemoveFromText(id);
  };

  async function upload(galleryId: string, files: File[]) {
    const gallery = galleries.find((g) => g.id === galleryId);
    const free = POST_LIMITS.photosPerGallery - (gallery?.items.length ?? 0);
    if (free <= 0) {
      toast.error(`Galerie pojme nejvýš ${POST_LIMITS.photosPerGallery} fotek.`);
      return;
    }
    if (files.length > free) {
      toast.error(
        `Galerie pojme nejvýš ${POST_LIMITS.photosPerGallery} fotek. Nahraje se jen ${photoCount(free)}.`,
      );
    }
    const queue = files.slice(0, free);

    setProgress({ galleryId, done: 0, total: queue.length });
    onUploadingChange(true);
    try {
      for (const [index, file] of queue.entries()) {
        try {
          const image = await uploadImage(file);
          updateItems(galleryId, (items) => [
            ...items,
            {
              path: image.path,
              url: image.url,
              width: image.width,
              height: image.height,
              caption: "",
              ...(image.blur ? { blur: image.blur } : {}),
            },
          ]);
        } catch (err) {
          toast.error(
            `${file.name}: ${err instanceof Error ? err.message : "nahrání se nepovedlo"}`,
          );
        }
        setProgress({ galleryId, done: index + 1, total: queue.length });
      }
    } finally {
      setProgress(null);
      onUploadingChange(false);
    }
  }

  const removingGallery = galleries.find((g) => g.id === removing);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Galerie se na webu ukáže tam, kde je v textu její značka. Klikněte do
        textu na místo, kam galerie patří, a pak na Vložit do textu. Čísla
        galerií jdou podle pořadí v textu.
      </p>
      {!uploadsEnabled && (
        <p className="rounded-lg bg-warm-gray px-4 py-3 text-sm text-foreground">
          {UPLOADS_DISABLED_MESSAGE}
        </p>
      )}
      {error && <p className="text-sm font-medium text-salmon">{error}</p>}

      {galleries.map((gallery, galleryIndex) => {
        const number = galleryIndex + 1;
        const inText = idsInText.includes(gallery.id);
        const busy = progress?.galleryId === gallery.id;
        return (
          <section
            key={gallery.id}
            aria-labelledby={`gallery-${gallery.id}`}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h3 id={`gallery-${gallery.id}`} className="font-semibold text-foreground">
                Galerie {number}
              </h3>
              <span className="text-sm text-text-secondary">
                {photoCount(gallery.items.length)}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium text-foreground ${
                  inText ? "bg-green-light" : "bg-yellow"
                }`}
              >
                {inText ? "V textu" : "Není v textu"}
              </span>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <button
                  type="button"
                  onClick={() => onPlace(gallery.id)}
                  className={smallButton}
                >
                  {inText ? "Přesunout na místo kurzoru" : "Vložit do textu"}
                </button>
                <button
                  type="button"
                  disabled={!uploadsEnabled || progress !== null}
                  title={uploadsEnabled ? undefined : UPLOADS_DISABLED_MESSAGE}
                  onClick={() => {
                    targetRef.current = gallery.id;
                    fileRef.current?.click();
                  }}
                  className={smallButton}
                >
                  {busy ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {busy && progress
                    ? `Nahrávám ${Math.min(progress.done + 1, progress.total)} z ${progress.total}`
                    : "Nahrát fotky"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    gallery.items.length > 0
                      ? setRemoving(gallery.id)
                      : removeGallery(gallery.id)
                  }
                  className={`${smallButton} text-salmon`}
                >
                  <Trash2 size={14} />
                  Odebrat galerii
                </button>
              </div>
            </div>

            {gallery.items.length === 0 ? (
              <p className="mt-3 text-sm text-text-secondary">Zatím bez fotek.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {gallery.items.map((item, index) => (
                  <li
                    key={item.path}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- náhled v administraci, bez optimalizace */}
                    <img
                      src={item.url}
                      alt=""
                      width={80}
                      height={56}
                      className="h-14 w-20 shrink-0 rounded-md bg-warm-gray object-cover"
                    />
                    <input
                      type="text"
                      value={item.caption}
                      maxLength={POST_LIMITS.caption}
                      aria-label={`Popisek fotky ${index + 1} v galerii ${number}`}
                      placeholder="Popisek fotky (nepovinný)"
                      onChange={(e) =>
                        updateItems(gallery.id, (items) =>
                          items.map((it, i) =>
                            i === index ? { ...it, caption: e.target.value } : it,
                          ),
                        )
                      }
                      // Na telefonu popisek pod náhledem a tlačítky přes celou šířku.
                      className="order-last h-9 min-w-0 basis-full rounded-md border border-field bg-white px-3 text-sm focus:border-accent focus:outline-none sm:order-none sm:basis-0 sm:flex-1"
                    />
                    <div className="ml-auto flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => moveItem(gallery.id, index, -1)}
                        disabled={index === 0}
                        aria-label={`Posunout fotku ${index + 1} nahoru`}
                        className={iconButton}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(gallery.id, index, 1)}
                        disabled={index === gallery.items.length - 1}
                        aria-label={`Posunout fotku ${index + 1} dolů`}
                        className={iconButton}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateItems(gallery.id, (items) =>
                            items.filter((_, i) => i !== index),
                          )
                        }
                        aria-label={`Odebrat fotku ${index + 1}`}
                        className={`${iconButton} hover:text-salmon`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <button
        type="button"
        onClick={addGallery}
        disabled={!uploadsEnabled || galleries.length >= POST_LIMITS.galleries}
        className={smallButton}
      >
        <Plus size={14} />
        Přidat galerii
      </button>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          const target = targetRef.current;
          e.target.value = "";
          if (target && files.length > 0) void upload(target, files);
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        destructive
        title="Odebrat galerii?"
        description={`Z článku zmizí galerie (${photoCount(removingGallery?.items.length ?? 0)}) i její značka v textu. Projeví se to po uložení článku.`}
        confirmLabel="Odebrat"
        onConfirm={() => {
          if (removing) removeGallery(removing);
          setRemoving(null);
        }}
      />
    </div>
  );
}
