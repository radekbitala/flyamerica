"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { ExternalLink, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { PostGallery } from "@/lib/db/schema";
import { yearOf } from "@/lib/dates";
import { titleLabelYear } from "@/lib/post-year";
import { ROUTES, postPath } from "@/lib/routes";
import { SITE_HOST } from "@/lib/site";
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
import { ACCEPTED_IMAGE_TYPES, photoCount, uploadImage } from "./image-upload";
import { LeaveGuard } from "./LeaveGuard";
import {
  backupKey,
  backupTimeLabel,
  readBackup,
  removeBackup,
  writeBackup,
  type PostBackup,
} from "./post-backup";
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
  /** Rok cesty z administrace (sloupec trip_year), prázdný = podle názvu nebo publikace. */
  tripYear?: number | null;
  /** Datum první publikace (ISO), podle něj výchozí rok cesty. */
  publishedAt?: string | null;
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

/** Všechno, co formulář článku posílá. Podle toho se pozná neuložená změna a dělá záloha. */
interface FormValues {
  title: string;
  slug: string;
  slugTouched: boolean;
  perex: string;
  image: HeroImage | null;
  imageAlt: string;
  videoUrl: string;
  galleries: PostGallery[];
  categoryIds: string[];
  newCategories: string[];
  tripYear: string;
  content: string;
}

const initialState: PostFormState = { status: "idle" };

// Jeden objekt pro nový článek: výchozí {} v parametru by byl při každém
// vykreslení nový a přepočítával by porovnání s načtenou verzí.
const NO_DEFAULTS: PostDefaults = {};

/** Výjimka ze server action (výpadek sítě, chyba serveru): text zůstává ve formuláři. */
const SAVE_FAILED_MESSAGE =
  "Článek se nepodařilo uložit. Zkontrolujte připojení a zkuste to znovu, text zůstává tady.";

/**
 * Pořadí polí ve formuláři shora dolů a prvek, na který po neúspěšném
 * uložení jde fokus (úprava 44 z auditu). „content“ je editor.
 */
const FIELD_TARGETS: [field: string, elementId: string][] = [
  ["title", "post-title"],
  ["slug", "post-slug"],
  ["perex", "post-perex"],
  ["tripYear", "post-trip-year"],
  ["imageUrl", "post-image-button"],
  ["imageAlt", "post-image-alt"],
  ["content", "post-content"],
  ["gallery", "post-gallery-error"],
  ["videoUrl", "post-video"],
  ["categoryIds", "post-new-category"],
  ["newCategories", "post-new-category"],
];

function errorFields(errors: Record<string, string>): string[] {
  const known = FIELD_TARGETS.map(([field]) => field).filter((field) => errors[field]);
  const other = Object.keys(errors).filter((field) => !known.includes(field));
  return [...known, ...other];
}

/** „Ještě 1 další chyba níž.“, „Ještě 3 další chyby níž.“, „Ještě 5 dalších chyb níž.“ */
function otherErrorsText(n: number): string {
  if (n === 1) return "Ještě 1 další chyba níž.";
  if (n >= 2 && n <= 4) return `Ještě ${n} další chyby níž.`;
  return `Ještě ${n} dalších chyb níž.`;
}

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

function heroFromDefaults(defaults: PostDefaults): HeroImage | null {
  return defaults.imageUrl
    ? {
        url: defaults.imageUrl,
        width: defaults.imageWidth ?? null,
        height: defaults.imageHeight ?? null,
        blur: defaults.imageBlur ?? "",
      }
    : null;
}

/** Hodnoty formuláře tak, jak je načetl editor (po srovnání HTML a pořadí galerií). */
function valuesFromDefaults(defaults: PostDefaults, content: string, idsInText: string[]): FormValues {
  return {
    title: defaults.title ?? "",
    slug: defaults.slug ?? "",
    slugTouched: Boolean(defaults.slug),
    perex: defaults.perex ?? "",
    image: heroFromDefaults(defaults),
    imageAlt: defaults.imageAlt ?? "",
    videoUrl: defaults.videoUrl ?? "",
    galleries: orderByText(defaults.gallery ?? [], idsInText),
    categoryIds: defaults.categoryIds ?? [],
    newCategories: [],
    tripYear: defaults.tripYear ? String(defaults.tripYear) : "",
    content,
  };
}

/** Otisk hodnot pro porovnání (pořadí kategorií ani to, jestli adresu někdo psal, nehraje roli). */
function snapshotOf(values: FormValues): string {
  return JSON.stringify([
    values.title,
    values.slug,
    values.perex,
    values.image,
    values.imageAlt,
    values.videoUrl,
    values.galleries,
    [...values.categoryIds].sort(),
    values.newCategories,
    values.tripYear,
    values.content,
  ]);
}

/** Záloha z localStorage: jen když má tvar FormValues (stará nebo poškozená se zahodí). */
function backupValues(value: unknown): FormValues | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const strings = ["title", "slug", "perex", "imageAlt", "videoUrl", "tripYear", "content"];
  const arrays = ["galleries", "categoryIds", "newCategories"];
  if (!strings.every((key) => typeof v[key] === "string")) return null;
  if (!arrays.every((key) => Array.isArray(v[key]))) return null;
  if (v.image !== null && (typeof v.image !== "object" || typeof (v.image as HeroImage).url !== "string")) {
    return null;
  }
  return { ...(v as unknown as FormValues), slugTouched: v.slugTouched === true };
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
    // tabIndex: chyba u skrytého pole (titulní fotka) dostane fokus místo pole.
    <p id={id} tabIndex={-1} className="mt-1 text-xs font-medium text-salmon">
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

const secondaryButton =
  "inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-field bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60";

export function PostForm({
  mode,
  postId,
  categories,
  defaults = NO_DEFAULTS,
  action,
  onDelete,
  publicUrl,
  uploadsEnabled,
  allowedImagePrefixes,
}: {
  mode: "new" | "edit";
  /** Id článku v úpravách (klíč zálohy v prohlížeči), u nového článku chybí. */
  postId?: string;
  categories: Category[];
  defaults?: PostDefaults;
  action: (prev: PostFormState, formData: FormData) => Promise<PostFormState>;
  onDelete?: () => Promise<void>;
  publicUrl?: string | null;
  uploadsEnabled: boolean;
  /** Začátky adres fotek z našeho úložiště (allowedImagePrefixes v src/lib/post-files.ts). */
  allowedImagePrefixes: string[];
}) {
  const storageKey = backupKey(postId);
  // Po úspěšném uložení se záloha smaže a už nezapisuje.
  const saved = useRef(false);

  // Když server action selže výjimkou (výpadek sítě, chyba serveru), React by
  // chybu poslal do error.tsx a formulář s textem by zmizel. Místo toho
  // hláška v liště a text zůstane (stejně jako withSendFallback u poptávky).
  // Přesměrování po úspěšném uložení je taky výjimka, ta letí dál.
  const submitAction = useCallback(
    async (prev: PostFormState, formData: FormData): Promise<PostFormState> => {
      try {
        return await action(prev, formData);
      } catch (error) {
        try {
          unstable_rethrow(error);
        } catch (navigation) {
          saved.current = true;
          removeBackup(storageKey);
          throw navigation;
        }
        console.warn("[admin] uložení článku selhalo", error);
        return { status: "error", formError: SAVE_FAILED_MESSAGE };
      }
    },
    [action, storageKey],
  );

  const [state, formAction, pending] = useActionState(submitAction, initialState);
  const errors = useMemo(() => state.fieldErrors ?? {}, [state]);
  const [clicked, setClicked] = useState<"draft" | "published" | null>(null);

  const [title, setTitle] = useState(defaults.title ?? "");
  const [slug, setSlug] = useState(defaults.slug ?? "");
  // V úpravách se adresa z názvu nepřepisuje, odkaz na článek už může
  // být sdílený.
  const [slugTouched, setSlugTouched] = useState(Boolean(defaults.slug));
  const [perex, setPerex] = useState(defaults.perex ?? "");
  const [image, setImage] = useState<HeroImage | null>(() => heroFromDefaults(defaults));
  const [imageAlt, setImageAlt] = useState(defaults.imageAlt ?? "");
  const [videoUrl, setVideoUrl] = useState(defaults.videoUrl ?? "");
  const [galleries, setGalleries] = useState<PostGallery[]>(defaults.gallery ?? []);
  const [idsInText, setIdsInText] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>(defaults.categoryIds ?? []);
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [tripYear, setTripYear] = useState(defaults.tripYear ? String(defaults.tripYear) : "");
  const [contentHtml, setContentHtml] = useState(defaults.content ?? "");
  // HTML a galerie v textu tak, jak je editor načetl. Do té doby se změny nepočítají.
  const [editorInit, setEditorInit] = useState<{ html: string; ids: string[] } | null>(null);
  const [editorFocused, setEditorFocused] = useState(false);
  // Rok pro výchozí rok cesty u článku, který ještě nevyšel.
  const [currentYear] = useState(() => new Date().getFullYear());

  // Záloha v prohlížeči: nabídka obnovy, a dokud na ni Honza neodpoví,
  // záloha se nepřepisuje.
  const [restoreOffer, setRestoreOffer] = useState<PostBackup<FormValues> | null>(null);
  const [backupReady, setBackupReady] = useState(false);

  const [heroUploading, setHeroUploading] = useState(false);
  const [editorUploading, setEditorUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const uploading = heroUploading || editorUploading || galleryUploading;

  const [deleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [galleryPrompt, setGalleryPrompt] = useState<{
    submitter: HTMLButtonElement;
    ids: string[];
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);

  const handleIdsInText = useCallback((ids: string[]) => {
    setIdsInText(ids);
    setGalleries((prev) => orderByText(prev, ids));
  }, []);

  const values = useMemo<FormValues>(
    () => ({
      title,
      slug,
      slugTouched,
      perex,
      image,
      imageAlt,
      videoUrl,
      galleries,
      categoryIds,
      newCategories,
      tripYear,
      content: contentHtml,
    }),
    [
      title,
      slug,
      slugTouched,
      perex,
      image,
      imageAlt,
      videoUrl,
      galleries,
      categoryIds,
      newCategories,
      tripYear,
      contentHtml,
    ],
  );
  const snapshot = useMemo(() => snapshotOf(values), [values]);
  const baseline = useMemo(
    () =>
      editorInit
        ? snapshotOf(valuesFromDefaults(defaults, editorInit.html, editorInit.ids))
        : null,
    [defaults, editorInit],
  );
  const dirty = baseline !== null && snapshot !== baseline;

  const handleEditorReady = useCallback(
    (html: string, ids: string[]) => {
      setEditorInit({ html, ids });
      setContentHtml(html);
      const backup = readBackup(storageKey);
      const backed = backup ? backupValues(backup.values) : null;
      const loaded = snapshotOf(valuesFromDefaults(defaults, html, ids));
      if (backup && backed && snapshotOf(backed) !== loaded) {
        setRestoreOffer({ savedAt: backup.savedAt, values: backed });
      } else {
        if (backup) removeBackup(storageKey);
        setBackupReady(true);
      }
    },
    [defaults, storageKey],
  );

  // Průběžná záloha rozepsaného článku. Bez změn se záloha smaže.
  useEffect(() => {
    if (!backupReady || saved.current) return;
    if (!dirty) {
      removeBackup(storageKey);
      return;
    }
    const timer = window.setTimeout(() => {
      if (!saved.current) writeBackup(storageKey, values);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [backupReady, dirty, values, storageKey]);

  // Zápis hned při zavření panelu, uspání stránky a odchodu z formuláře
  // (časovač výš by nestihl doběhnout).
  const latest = useRef({ values, dirty, active: false });
  useEffect(() => {
    latest.current = { values, dirty, active: backupReady };
  });
  useEffect(() => {
    const flush = () => {
      const { values: current, dirty: changed, active } = latest.current;
      if (active && changed && !saved.current) writeBackup(storageKey, current);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [storageKey]);

  function restoreBackup() {
    if (!restoreOffer) return;
    const v = restoreOffer.values;
    setTitle(v.title);
    setSlug(v.slug);
    setSlugTouched(v.slugTouched);
    setPerex(v.perex);
    setImage(v.image);
    setImageAlt(v.imageAlt);
    setVideoUrl(v.videoUrl);
    setGalleries(v.galleries);
    setCategoryIds(v.categoryIds);
    setNewCategories(v.newCategories);
    setTripYear(v.tripYear);
    editorRef.current?.setContent(v.content);
    setRestoreOffer(null);
    setBackupReady(true);
    toast.success("Neuložená verze je zpátky. Nezapomeňte článek uložit.");
  }

  function discardBackup() {
    removeBackup(storageKey);
    setRestoreOffer(null);
    setBackupReady(true);
  }

  /** Posune stránku k poli s chybou a dá mu fokus. */
  const focusField = useCallback((field: string) => {
    if (field === "content") {
      document.getElementById("post-content")?.scrollIntoView({ block: "start" });
      editorRef.current?.focus();
      return;
    }
    const id = FIELD_TARGETS.find(([name]) => name === field)?.[1];
    const element =
      (id ? document.getElementById(id) : null) ??
      document.querySelector<HTMLElement>(`[id^="post-"][id$="-error"]`);
    if (!element) return;
    element.scrollIntoView({ block: "center" });
    element.focus({ preventScroll: true });
  }, []);

  // Po neúspěšném uložení fokus na první chybné pole (úprava 44).
  useEffect(() => {
    if (state.status !== "error" || state.formError) return;
    const [first] = errorFields(state.fieldErrors ?? {});
    if (first) focusField(first);
  }, [state, focusField]);

  const effectiveSlug = slug || slugify(title);
  const perexLeft = POST_LIMITS.perex - perex.length;
  const isPublished = defaults.status === "published";
  const defaultTripYear =
    titleLabelYear(title) ??
    (defaults.publishedAt ? Number(yearOf(new Date(defaults.publishedAt))) : currentYear);

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

  /** Odebrání titulní fotky jde vrátit z hlášky (dokud se nenahraje jiná). */
  function removeHero() {
    const removed = image;
    if (!removed) return;
    setImage(null);
    toast("Fotka odebrána", {
      duration: 10_000,
      action: { label: "Vrátit", onClick: () => setImage((current) => current ?? removed) },
    });
  }

  /** Galerie s nově nahranými fotkami, která v textu není, jde na konec textu. */
  function handleGalleryUploaded(id: string) {
    const added = editorRef.current?.appendGalleries([id]) ?? [];
    if (added.length > 0) {
      toast.info("Galerie je vložená na konec textu. Jinam ji dáte tlačítkem Přesunout na místo kurzoru.");
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

  // Galerie s fotkami, které v textu nejsou: na webu by se neukázaly.
  const galleriesOutsideText = galleries
    .map((g, i) => ({ id: g.id, number: i + 1, count: g.items.length }))
    .filter((g) => g.count > 0 && !idsInText.includes(g.id));

  /**
   * Publikovat (a Uložit změny u publikovaného článku) s galerií mimo text
   * se nejdřív zeptá, jestli ji vložit na konec článku (úprava 10).
   */
  function onSubmitClick(event: React.MouseEvent<HTMLButtonElement>, value: "draft" | "published") {
    if (value === "published" && galleriesOutsideText.length > 0) {
      event.preventDefault();
      setGalleryPrompt({
        submitter: event.currentTarget,
        ids: galleriesOutsideText.map((g) => g.id),
      });
      return;
    }
    setClicked(value);
  }

  function confirmGalleryPrompt() {
    if (!galleryPrompt) return;
    const { submitter, ids } = galleryPrompt;
    // Značky musí být ve skrytých polích formuláře dřív, než se odešle.
    flushSync(() => {
      setGalleryPrompt(null);
      editorRef.current?.appendGalleries(ids);
      setClicked("published");
    });
    formRef.current?.requestSubmit(submitter);
  }

  const outsideNames = galleriesOutsideText.map((g) => `Galerie ${g.number} (${photoCount(g.count)})`);
  const galleryPromptTitle =
    outsideNames.length === 1
      ? `${outsideNames[0]} není v textu`
      : `${outsideNames.slice(0, -1).join(", ")} a ${outsideNames.at(-1)} nejsou v textu`;

  // První tlačítko formuláře odešle i Enter v textovém poli. Proto je
  // první vždy to bezpečné: u konceptu uložení konceptu, u publikovaného
  // článku uložení změn. Stažení z webu je až na konci formuláře u mazání.
  const buttons: { value: "draft" | "published"; label: string; primary: boolean }[] =
    isPublished
      ? [{ value: "published", label: "Uložit změny", primary: true }]
      : [
          { value: "draft", label: "Uložit koncept", primary: false },
          { value: "published", label: "Publikovat", primary: true },
        ];

  const failedFields = errorFields(errors);
  const showError = state.status === "error" && !pending;

  return (
    <form ref={formRef} action={formAction} className="max-w-4xl space-y-6">
      <input type="hidden" name="imageUrl" value={image?.url ?? ""} />
      <input type="hidden" name="imageWidth" value={image?.width ?? ""} />
      <input type="hidden" name="imageHeight" value={image?.height ?? ""} />
      <input type="hidden" name="imageBlur" value={image?.blur ?? ""} />
      <input type="hidden" name="gallery" value={JSON.stringify(galleries)} />
      <input type="hidden" name="newCategories" value={JSON.stringify(newCategories)} />

      {restoreOffer && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-yellow-dark bg-white p-4 text-sm text-foreground"
        >
          <p className="font-semibold">
            Máte neuloženou verzi z {backupTimeLabel(restoreOffer.savedAt)}. Obnovit?
          </p>
          <div className="flex gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={restoreBackup}
              className="cursor-pointer rounded-[10px] bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              Obnovit
            </button>
            <button
              type="button"
              onClick={discardBackup}
              className="cursor-pointer rounded-[10px] border border-field bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-gray-50"
            >
              Zahodit
            </button>
          </div>
        </div>
      )}

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
            <span className="shrink-0 text-sm text-text-secondary">{ROUTES.posts}/</span>
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
              aria-describedby={errors.slug ? "post-slug-error post-slug-hint" : "post-slug-hint"}
              className={fieldClass(errors.slug)}
            />
          </div>
          <FieldError id="post-slug-error" error={errors.slug} />
          <p id="post-slug-hint" className="mt-1 text-xs text-text-secondary">
            {effectiveSlug ? (
              <>
                Adresa na webu:{" "}
                <span className="font-mono">{SITE_HOST}{postPath(effectiveSlug)}</span>
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
            aria-invalid={Boolean(errors.perex)}
            aria-describedby={errors.perex ? "post-perex-error post-perex-hint" : "post-perex-hint"}
            className={`${fieldClass(errors.perex, "")} resize-y py-3`}
          />
          <FieldError id="post-perex-error" error={errors.perex} />
          <p id="post-perex-hint" className="mt-1 text-xs text-text-secondary">
            Krátké shrnutí pod názvem a v přehledu článků (Z cest).
          </p>
        </div>

        <div>
          <FieldLabel htmlFor="post-trip-year">Rok cesty (nepovinné)</FieldLabel>
          <input
            id="post-trip-year"
            type="text"
            name="tripYear"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={tripYear}
            placeholder={String(defaultTripYear)}
            onChange={(e) => setTripYear(e.target.value.replace(/\D/g, ""))}
            aria-invalid={Boolean(errors.tripYear)}
            aria-describedby={
              errors.tripYear ? "post-trip-year-error post-trip-year-hint" : "post-trip-year-hint"
            }
            className={`${fieldClass(errors.tripYear)} max-w-[8rem]`}
          />
          <FieldError id="post-trip-year-error" error={errors.tripYear} />
          <p id="post-trip-year-hint" className="mt-1 text-xs text-text-secondary">
            Rok, kdy cesta byla. Prázdné = rok z názvu nebo rok publikace.
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
                  id="post-image-button"
                  type="button"
                  onClick={() => heroFileRef.current?.click()}
                  disabled={heroUploading || !uploadsEnabled}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-field bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {heroUploading ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden />
                  ) : (
                    <Upload size={16} aria-hidden />
                  )}
                  Vyměnit fotku
                </button>
                <button
                  type="button"
                  onClick={removeHero}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-field bg-white px-4 py-2 text-sm font-medium text-salmon hover:bg-gray-50"
                >
                  <Trash2 size={16} aria-hidden />
                  Odebrat
                </button>
              </div>
            </div>
          ) : uploadsEnabled ? (
            <button
              id="post-image-button"
              type="button"
              onClick={() => heroFileRef.current?.click()}
              disabled={heroUploading}
              aria-describedby="post-image-hint"
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-12 text-center text-text-secondary hover:bg-gray-50 disabled:opacity-60"
            >
              {heroUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden />
                  Nahrávám...
                </>
              ) : (
                <>
                  <Upload size={18} aria-hidden />
                  Nahrát fotku z počítače nebo telefonu
                </>
              )}
            </button>
          ) : (
            <p className="py-8 text-center text-sm text-text-secondary">
              {UPLOADS_DISABLED_MESSAGE}
            </p>
          )}
          {uploadsEnabled && (
            <p id="post-image-hint" className="mt-2 text-center text-xs text-text-secondary">
              Fotky ve formátu HEIC uložte jako JPEG.
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
            <FieldLabel htmlFor="post-image-alt">Popisek fotky</FieldLabel>
            <input
              id="post-image-alt"
              type="text"
              name="imageAlt"
              maxLength={POST_LIMITS.imageAlt}
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              aria-invalid={Boolean(errors.imageAlt)}
              aria-describedby={
                errors.imageAlt ? "post-image-alt-error post-image-alt-hint" : "post-image-alt-hint"
              }
              className={fieldClass(errors.imageAlt)}
            />
            <FieldError id="post-image-alt-error" error={errors.imageAlt} />
            <p id="post-image-alt-hint" className="mt-1 text-xs text-text-secondary">
              Zobrazí se pod fotkou na webu a přečtou ho i nevidomí. Povinný, krátce,
              co je na fotce, například „Cessna 172 na letišti Cedar Key&ldquo;.
            </p>
          </div>
        )}
      </Section>

      <Section title="Text článku">
        <FieldError id="post-content-error" error={errors.content} />
        <div id="post-content" className="scroll-mt-20">
          <RichTextEditor
            ref={editorRef}
            name="content"
            initialHTML={defaults.content ?? ""}
            galleries={galleryInfo}
            uploadsEnabled={uploadsEnabled}
            allowedImagePrefixes={allowedImagePrefixes}
            onGalleryIdsChange={handleIdsInText}
            onUploadingChange={setEditorUploading}
            onReady={handleEditorReady}
            onChange={setContentHtml}
            onFocusChange={setEditorFocused}
          />
        </div>
        {uploadsEnabled && (
          <p className="text-xs text-text-secondary">
            Fotku do textu nahrajete tlačítkem Fotka z počítače nebo telefonu. Fotky ve
            formátu HEIC uložte jako JPEG.
          </p>
        )}
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
          onUploaded={handleGalleryUploaded}
        />
      </Section>

      <Section title="Video pod článkem">
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
            aria-describedby={
              errors.videoUrl ? "post-video-error post-video-hint" : "post-video-hint"
            }
            className={fieldClass(errors.videoUrl)}
          />
          <FieldError id="post-video-error" error={errors.videoUrl} />
          <p id="post-video-hint" className="mt-1 text-xs text-text-secondary">
            Ukáže se pod textem. Video doprostřed textu vložíte tlačítkem v liště editoru.
          </p>
        </div>
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
              className={`${fieldClass(errors.newCategories ?? errors.categoryIds)} sm:max-w-xs`}
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

      <div
        // Na telefonu se lišta při psaní v editoru schová, aby zbylo víc
        // místa nad klávesnicí (úprava 51). Vrátí se po klepnutí mimo text.
        className={`sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 ${
          editorFocused ? "max-sm:hidden" : ""
        }`}
      >
        {buttons.map((b) => (
          <button
            key={b.value}
            type="submit"
            name="status"
            value={b.value}
            disabled={pending || uploading || deleting}
            onClick={(e) => onSubmitClick(e, b.value)}
            className={
              b.primary
                ? "cursor-pointer rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
                : secondaryButton
            }
          >
            {pending && clicked === b.value ? "Ukládám..." : b.label}
          </button>
        ))}
        <span role="status" className="text-sm font-semibold text-foreground">
          {dirty && !pending ? "Neuložené změny" : ""}
        </span>
        {uploading && (
          <span className="text-sm text-text-secondary">Počkejte na nahrání fotek.</span>
        )}
        {showError && state.formError && (
          <p role="alert" className="text-sm font-medium text-salmon">
            {state.formError}
          </p>
        )}
        {showError && !state.formError && failedFields.length > 0 && (
          <p role="alert" className="text-sm font-medium text-salmon">
            <button
              type="button"
              onClick={() => focusField(failedFields[0])}
              className="cursor-pointer text-left underline underline-offset-2"
            >
              {errors[failedFields[0]]}
            </button>
            {failedFields.length > 1 && ` ${otherErrorsText(failedFields.length - 1)}`}
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
              <ExternalLink size={14} aria-hidden />
            </a>
          )}
          <Link href="/admin/posts" className="text-sm text-text-secondary hover:text-foreground">
            Zpět na články
          </Link>
        </div>
      </div>

      {mode === "edit" && isPublished && (
        <div className="space-y-3 border-t border-gray-200 pt-6">
          <p className="text-sm text-text-secondary">
            Stáhnout z webu: článek z webu zmizí a zůstane tady jako koncept i se
            změnami z formuláře. Zpátky na web ho dáte tlačítkem Publikovat.
          </p>
          <button
            type="submit"
            name="status"
            value="draft"
            disabled={pending || uploading || deleting}
            onClick={() => setClicked("draft")}
            className={secondaryButton}
          >
            {pending && clicked === "draft" ? "Stahuji..." : "Stáhnout z webu"}
          </button>
        </div>
      )}

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
            <Trash2 size={16} aria-hidden />
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
              // Smazaný článek nemá co zálohovat ani hlídat.
              saved.current = true;
              removeBackup(storageKey);
              startDelete(async () => {
                await onDelete();
              });
            }}
          />
        </div>
      )}

      <ConfirmDialog
        open={galleryPrompt !== null}
        onOpenChange={(open) => {
          if (!open) setGalleryPrompt(null);
        }}
        title={galleryPromptTitle}
        description={
          outsideNames.length === 1
            ? "Na webu se neukáže. Vložit ji na konec článku?"
            : "Na webu se neukážou. Vložit je na konec článku?"
        }
        confirmLabel={isPublished ? "Vložit a uložit" : "Vložit a publikovat"}
        cancelLabel="Zpět k úpravám"
        onConfirm={confirmGalleryPrompt}
      />

      <LeaveGuard
        when={dirty && !deleting}
        ownForm={formRef}
        title="Odejít bez uložení?"
        description="Změny v článku nejsou uložené. Záloha zůstane v tomto prohlížeči a při dalším otevření článku ji půjde obnovit."
      />
    </form>
  );
}
