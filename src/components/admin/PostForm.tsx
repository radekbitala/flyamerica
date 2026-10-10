"use client";

import {
  useActionState,
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { PostGallery } from "@/lib/db/schema";
import {
  POST_LIMITS,
  slugify,
  slugifyLoose,
  UPLOADS_DISABLED_MESSAGE,
  type PostFormState,
} from "@/lib/post-form";
import { ConfirmDialog } from "./ConfirmDialog";
import { GalleryManager } from "./GalleryManager";
import type { GalleryInfo } from "./GalleryMarker";
import { ACCEPTED_IMAGE_TYPES, uploadImage } from "./image-upload";
import { RichTextEditor, type RichTextEditorHandle } from "./RichTextEditor";

export interface PostDefaults {
  title?: string;
  slug?: string;
  perex?: string | null;
  content?: string;
  imageUrl?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  imageBlur?: string | null;
  imageAlt?: string | null;
  videoUrl?: string | null;
  gallery?: PostGallery[];
  status?: "draft" | "published" | "archived";
  categoryIds?: string[];
}

interface Category {
  id: string;
  name: string;
}

interface HeroImage {
  url: string;
  width: number | null;
  height: number | null;
  blur: string;
}

const initialState: PostFormState = { status: "idle" };

/**
 * Galerie seřazené podle pořadí značek v textu, galerie mimo text na konci.
 * Číslo galerie (Galerie 1, 2, ...) je pořadí v poli, takže pak sedí
 * s tím, jak jdou galerie v článku za sebou, i po přesunu značky.
 */
function orderByText(galleries: PostGallery[], idsInText: string[]): PostGallery[] {
  const rank = new Map(idsInText.map((id, i) => [id, i]));
  const last = idsInText.length;
  const sorted = [...galleries].sort(
    (a, b) => (rank.get(a.id) ?? last) - (rank.get(b.id) ?? last),
  );
  return sorted.every((g, i) => g === galleries[i]) ? galleries : sorted;
}

const fieldBase =
  "w-full rounded-[10px] border bg-white px-4 text-sm text-foreground focus:border-accent focus:outline-none";

function fieldClass(error: string | undefined, size = "h-11") {
  return `${fieldBase} ${size} ${error ? "border-salmon" : "border-field"}`;
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-foreground">
      {children}
    </label>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1 text-xs font-medium text-salmon">
      {error}
    </p>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    // min-w-0: fieldset má ve výchozím stylu min-inline-size: min-content
    // a řádek fotky v galerii by ho na telefonu roztáhl do šířky.
    <fieldset className="min-w-0 space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
      <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function PostForm({
  mode,
  categories,
  defaults = {},
  action,
  onDelete,
  publicUrl,
  uploadsEnabled,
}: {
  mode: "new" | "edit";
  categories: Category[];
  defaults?: PostDefaults;
  action: (prev: PostFormState, formData: FormData) => Promise<PostFormState>;
  onDelete?: () => Promise<void>;
  publicUrl?: string | null;
  uploadsEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};
  const [clicked, setClicked] = useState<"draft" | "published" | null>(null);

  const [title, setTitle] = useState(defaults.title ?? "");
  const [slug, setSlug] = useState(defaults.slug ?? "");
  // V úpravách se adresa z názvu nepřepisuje, odkaz na článek už může
  // být sdílený.
  const [slugTouched, setSlugTouched] = useState(Boolean(defaults.slug));
  const [perex, setPerex] = useState(defaults.perex ?? "");
  const [image, setImage] = useState<HeroImage | null>(
    defaults.imageUrl
      ? {
          url: defaults.imageUrl,
          width: defaults.imageWidth ?? null,
          height: defaults.imageHeight ?? null,
          blur: defaults.imageBlur ?? "",
        }
      : null,
  );
  const [imageAlt, setImageAlt] = useState(defaults.imageAlt ?? "");
  const [videoUrl, setVideoUrl] = useState(defaults.videoUrl ?? "");
  const [galleries, setGalleries] = useState<PostGallery[]>(defaults.gallery ?? []);
  const [idsInText, setIdsInText] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>(defaults.categoryIds ?? []);
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [heroUploading, setHeroUploading] = useState(false);
  const [editorUploading, setEditorUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const uploading = heroUploading || editorUploading || galleryUploading;

  const [deleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);

  const handleIdsInText = useCallback((ids: string[]) => {
    setIdsInText(ids);
    setGalleries((prev) => orderByText(prev, ids));
  }, []);

  const effectiveSlug = slug || slugify(title);
  const perexLeft = POST_LIMITS.perex - perex.length;
  const isPublished = defaults.status === "published";

  const galleryInfo = useMemo(
    () =>
      new Map<string, GalleryInfo>(
        galleries.map((g, i) => [g.id, { number: i + 1, count: g.items.length }]),
      ),
    [galleries],
  );

  async function uploadHero(file: File) {
    setHeroUploading(true);
    try {
      const uploaded = await uploadImage(file);
      setImage({
        url: uploaded.url,
        width: uploaded.width,
        height: uploaded.height,
        blur: uploaded.blur,
      });
    } catch (err) {
      toast.error(
        `Titulní fotku se nepodařilo nahrát: ${err instanceof Error ? err.message : "neznámá chyba"}`,
      );
    } finally {
      setHeroUploading(false);
    }
  }

  function addNewCategory() {
    const name = newCategoryName.trim().replace(/\s+/g, " ");
    if (!name) return;
    const key = slugify(name);
    if (!key) {
      toast.error("Název kategorie musí obsahovat písmeno nebo číslici.");
      return;
    }
    const existing = categories.find((c) => slugify(c.name) === key);
    if (existing) {
      setCategoryIds((prev) => (prev.includes(existing.id) ? prev : [...prev, existing.id]));
    } else if (!newCategories.some((n) => slugify(n) === key)) {
      setNewCategories((prev) => [...prev, name]);
    }
    setNewCategoryName("");
  }

  // První tlačítko formuláře odešle i Enter v textovém poli. Proto je
  // první vždy to bezpečné: u konceptu uložení konceptu, u publikovaného
  // článku uložení změn (ne stažení z webu).
  const buttons: { value: "draft" | "published"; label: string; primary: boolean }[] =
    isPublished
      ? [
          { value: "published", label: "Uložit změny", primary: true },
          { value: "draft", label: "Vrátit do konceptů", primary: false },
        ]
      : [
          { value: "draft", label: "Uložit koncept", primary: false },
          { value: "published", label: "Publikovat", primary: true },
        ];

  const hasFieldErrors = Object.keys(errors).length > 0;
  const formMessage =
    state.status === "error"
      ? (state.formError ??
        (hasFieldErrors ? "Článek se neuložil. Opravte zvýrazněná pole." : null))
      : null;

  return (
    <form action={formAction} className="max-w-4xl space-y-6">
      <input type="hidden" name="imageUrl" value={image?.url ?? ""} />
      <input type="hidden" name="imageWidth" value={image?.width ?? ""} />
      <input type="hidden" name="imageHeight" value={image?.height ?? ""} />
      <input type="hidden" name="imageBlur" value={image?.blur ?? ""} />
      <input type="hidden" name="gallery" value={JSON.stringify(galleries)} />
      <input type="hidden" name="newCategories" value={JSON.stringify(newCategories)} />

      <Section title="Základ">
        <div>
          <FieldLabel htmlFor="post-title">Název</FieldLabel>
          <input
            id="post-title"
            type="text"
            name="title"
            required
            maxLength={POST_LIMITS.title}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "post-title-error" : undefined}
            className={`${fieldClass(errors.title)} text-base`}
          />
          <FieldError id="post-title-error" error={errors.title} />
        </div>

        <div>
          <FieldLabel htmlFor="post-slug">Adresa článku</FieldLabel>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-text-secondary">/denik/</span>
            <input
              id="post-slug"
              type="text"
              name="slug"
              maxLength={POST_LIMITS.slug}
              value={slug}
              placeholder={slugify(title) || "vznikne z názvu"}
              onChange={(e) => {
                setSlug(slugifyLoose(e.target.value));
                setSlugTouched(true);
              }}
              onBlur={() => setSlug((s) => slugify(s))}
              aria-invalid={Boolean(errors.slug)}
              aria-describedby="post-slug-hint"
              className={fieldClass(errors.slug)}
            />
          </div>
          <FieldError id="post-slug-error" error={errors.slug} />
          <p id="post-slug-hint" className="mt-1 text-xs text-text-secondary">
            {effectiveSlug ? (
              <>
                Adresa na webu:{" "}
                <span className="font-mono">flyamerica.cz/denik/{effectiveSlug}</span>
              </>
            ) : (
              "Adresa vznikne z názvu."
            )}
            {mode === "edit" &&
              isPublished &&
              " Po změně adresy přestanou fungovat už sdílené odkazy."}
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="post-perex" className="text-sm font-semibold text-foreground">
              Perex
            </label>
            <span className={`text-xs ${perexLeft < 0 ? "text-salmon" : "text-text-secondary"}`}>
              zbývá {perexLeft} znaků
            </span>
          </div>
          <textarea
            id="post-perex"
            name="perex"
            rows={3}
            maxLength={POST_LIMITS.perex}
            value={perex}
            onChange={(e) => setPerex(e.target.value)}
            aria-describedby="post-perex-hint"
            className={`${fieldClass(errors.perex, "")} resize-y py-3`}
          />
          <FieldError id="post-perex-error" error={errors.perex} />
          <p id="post-perex-hint" className="mt-1 text-xs text-text-secondary">
            Krátké shrnutí pod názvem a v přehledu deníku.
          </p>
        </div>
      </Section>

      <Section title="Titulní fotka">
        <div className="rounded-xl border-2 border-dashed border-field p-4">
          {image ? (
            <div className="space-y-3">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-warm-gray">
                {/* eslint-disable-next-line @next/next/no-img-element -- náhled v administraci, bez optimalizace */}
                <img src={image.url} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => heroFileRef.current?.click()}
                  disabled={heroUploading || !uploadsEnabled}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-field bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {heroUploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                  Vyměnit fotku
                </button>
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-field bg-white px-4 py-2 text-sm font-medium text-salmon hover:bg-gray-50"
                >
                  <Trash2 size={16} />
                  Odebrat
                </button>
              </div>
            </div>
          ) : uploadsEnabled ? (
            <button
              type="button"
              onClick={() => heroFileRef.current?.click()}
              disabled={heroUploading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-12 text-text-secondary hover:bg-gray-50 disabled:opacity-60"
            >
              {heroUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Nahrávám...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Nahrát fotku (JPEG, PNG, WebP, GIF nebo AVIF)
                </>
              )}
            </button>
          ) : (
            <p className="py-8 text-center text-sm text-text-secondary">
              {UPLOADS_DISABLED_MESSAGE}
            </p>
          )}
          <input
            ref={heroFileRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadHero(file);
              e.target.value = "";
            }}
          />
          <FieldError id="post-image-error" error={errors.imageUrl} />
        </div>

        {image && (
          <div>
            <FieldLabel htmlFor="post-image-alt">Popis fotky (alt text)</FieldLabel>
            <input
              id="post-image-alt"
              type="text"
              name="imageAlt"
              maxLength={POST_LIMITS.imageAlt}
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              aria-invalid={Boolean(errors.imageAlt)}
              aria-describedby="post-image-alt-hint"
              className={fieldClass(errors.imageAlt)}
            />
            <FieldError id="post-image-alt-error" error={errors.imageAlt} />
            <p id="post-image-alt-hint" className="mt-1 text-xs text-text-secondary">
              Povinné. Krátce, co je na fotce, například „Cessna 172 na letišti
              Cedar Key&ldquo;. Čtou ho nevidomí a vyhledávače.
            </p>
          </div>
        )}

        <div>
          <FieldLabel htmlFor="post-video">Video z YouTube (nepovinné)</FieldLabel>
          <input
            id="post-video"
            type="url"
            name="videoUrl"
            maxLength={POST_LIMITS.url}
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            aria-invalid={Boolean(errors.videoUrl)}
            aria-describedby={errors.videoUrl ? "post-video-error" : undefined}
            className={fieldClass(errors.videoUrl)}
          />
          <FieldError id="post-video-error" error={errors.videoUrl} />
        </div>
      </Section>

      <Section title="Text článku">
        <FieldError id="post-content-error" error={errors.content} />
        <RichTextEditor
          ref={editorRef}
          name="content"
          initialHTML={defaults.content ?? ""}
          galleries={galleryInfo}
          uploadsEnabled={uploadsEnabled}
          onGalleryIdsChange={handleIdsInText}
          onUploadingChange={setEditorUploading}
        />
      </Section>

      <Section title="Galerie">
        <GalleryManager
          galleries={galleries}
          setGalleries={setGalleries}
          idsInText={idsInText}
          uploadsEnabled={uploadsEnabled}
          error={errors.gallery}
          onUploadingChange={setGalleryUploading}
          onPlace={(id) => editorRef.current?.placeGallery(id)}
          onRemoveFromText={(id) => editorRef.current?.removeGallery(id)}
        />
      </Section>

      <Section title="Kategorie">
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <label
                key={cat.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 hover:border-accent"
              >
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={cat.id}
                  checked={categoryIds.includes(cat.id)}
                  onChange={(e) =>
                    setCategoryIds((prev) =>
                      e.target.checked ? [...prev, cat.id] : prev.filter((id) => id !== cat.id),
                    )
                  }
                  className="accent-accent"
                />
                <span className="text-sm">{cat.name}</span>
              </label>
            ))}
          </div>
        )}

        {newCategories.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Nové kategorie">
            {newCategories.map((name) => (
              <li
                key={name}
                className="flex items-center gap-2 rounded-lg border border-accent bg-white py-1.5 pl-3 pr-1.5 text-sm"
              >
                {name}
                <span className="text-xs text-text-secondary">nová</span>
                <button
                  type="button"
                  onClick={() => setNewCategories((prev) => prev.filter((n) => n !== name))}
                  aria-label={`Nezakládat kategorii ${name}`}
                  className="cursor-pointer rounded p-1 text-text-secondary hover:bg-gray-100 hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div>
          <FieldLabel htmlFor="post-new-category">Nová kategorie</FieldLabel>
          <div className="flex gap-2">
            <input
              id="post-new-category"
              type="text"
              maxLength={POST_LIMITS.categoryName}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                // Enter tady kategorii přidá, formulář neodešle.
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNewCategory();
                }
              }}
              placeholder="například Přelety"
              className={`${fieldClass(errors.newCategories)} sm:max-w-xs`}
            />
            <button
              type="button"
              onClick={addNewCategory}
              disabled={!newCategoryName.trim() || newCategories.length >= 10}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] border border-field bg-white px-4 text-sm font-semibold text-foreground hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Přidat
            </button>
          </div>
          <FieldError
            id="post-categories-error"
            error={errors.newCategories ?? errors.categoryIds}
          />
          <p className="mt-1 text-xs text-text-secondary">
            Nová kategorie se založí při uložení článku.
          </p>
        </div>
      </Section>

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        {buttons.map((b) => (
          <button
            key={b.value}
            type="submit"
            name="status"
            value={b.value}
            disabled={pending || uploading || deleting}
            onClick={() => setClicked(b.value)}
            className={
              b.primary
                ? "cursor-pointer rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
                : "cursor-pointer rounded-[10px] border border-field bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            }
          >
            {pending && clicked === b.value ? "Ukládám..." : b.label}
          </button>
        ))}
        {uploading && (
          <span className="text-sm text-text-secondary">Počkejte na nahrání fotek.</span>
        )}
        {formMessage && !pending && (
          <p role="alert" className="text-sm font-medium text-salmon">
            {formMessage}
          </p>
        )}
        <div className="ml-auto flex items-center gap-4">
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-foreground"
            >
              Zobrazit na webu
              <ExternalLink size={14} />
            </a>
          )}
          <Link href="/admin/posts" className="text-sm text-text-secondary hover:text-foreground">
            Zpět na přehled
          </Link>
        </div>
      </div>

      {mode === "edit" && onDelete && (
        <div className="border-t border-gray-200 pt-6">
          <p className="mb-3 text-sm text-text-secondary">
            Smazání nejde vrátit. Článek zmizí z webu i z administrace a jeho
            fotky se smažou z úložiště.
          </p>
          <button
            type="button"
            disabled={deleting || pending}
            onClick={() => setConfirmOpen(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border-2 border-salmon px-6 py-3 text-sm font-semibold text-salmon hover:bg-gray-50 disabled:opacity-60"
          >
            <Trash2 size={16} />
            {deleting ? "Mažu..." : "Smazat článek"}
          </button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            destructive
            title="Smazat článek?"
            description="Článek zmizí z webu i z administrace a jeho fotky se smažou z úložiště. Nejde to vrátit."
            confirmLabel="Smazat"
            pending={deleting}
            onConfirm={() => {
              setConfirmOpen(false);
              startDelete(async () => {
                await onDelete();
              });
            }}
          />
        </div>
      )}
    </form>
  );
}
