"use client";

import { useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  EditorContent,
  Extension,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import { NodeSelection, Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube, { isValidYoutubeUrl } from "@tiptap/extension-youtube";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Link2Off,
  Image as ImageIcon,
  Video as YoutubeIcon,
  Undo2,
  Redo2,
  Pilcrow,
  Loader2,
  Ellipsis,
} from "lucide-react";
import { UPLOADS_DISABLED_MESSAGE } from "@/lib/post-form";
import {
  GALLERY_MARKER,
  GalleryInfoContext,
  GalleryMarker,
  type GalleryInfo,
} from "./GalleryMarker";
import { ACCEPTED_IMAGE_TYPES, uploadImage, type UploadedImage } from "./image-upload";
import { PromptDialog, type PromptField } from "./PromptDialog";

export interface RichTextEditorHandle {
  /** Vloží značku galerie na místo kurzoru, nebo ji tam přesune. */
  placeGallery: (id: string) => void;
  /** Odebere značku galerie z textu (galerie sama zůstane). */
  removeGallery: (id: string) => void;
  /**
   * Vloží značky galerií, které v textu nejsou, na konec textu (nová galerie
   * po nahrání fotek, dotaz při publikaci). Vrátí id skutečně vložených.
   * Kurzor ani posun stránky nemění.
   */
  appendGalleries: (ids: string[]) => string[];
  /** Fokus do textu (chyba u textu článku po uložení). */
  focus: () => void;
  /** Nahradí celý text (obnova zálohy z prohlížeče). */
  setContent: (html: string) => void;
}

interface RichTextEditorProps {
  name: string;
  initialHTML?: string;
  galleries: Map<string, GalleryInfo>;
  uploadsEnabled: boolean;
  /**
   * Začátky adres fotek z našeho úložiště (allowedImagePrefixes v
   * src/lib/post-files.ts). Obrázek odjinud editor označí k nahrazení.
   */
  allowedImagePrefixes: string[];
  /** Id galerií, jejichž značky jsou v textu, v pořadí od začátku. */
  onGalleryIdsChange?: (ids: string[]) => void;
  onUploadingChange?: (busy: boolean) => void;
  /** Editor je připravený: HTML tak, jak ho editor sám vypíše, a galerie v textu. */
  onReady?: (html: string, galleryIds: string[]) => void;
  /** HTML po každé změně textu. */
  onChange?: (html: string) => void;
  /** Fokus v textu (na telefonu se při psaní schová spodní lišta s tlačítky). */
  onFocusChange?: (focused: boolean) => void;
  ref?: React.Ref<RichTextEditorHandle>;
}

/**
 * Obrázek z jiného webu: v editoru zůstane, aby se rozepsaný text i s ním
 * dal uložit jako koncept, ale je viditelně označený a čtečka ho přečte jako
 * obrázek k nahrazení. Publikaci zablokuje kontrola na serveru
 * (src/app/admin/(dashboard)/posts/actions.ts). Označení jsou dekorace
 * ProseMirroru, do uloženého HTML se nedostanou.
 */
const FOREIGN_IMAGE_NOTE =
  "Obrázek z jiného webu nebo z Wordu. Na webu se neukáže: smažte ho a fotku nahrajte tlačítkem Fotka.";

const ForeignImages = Extension.create<{ isAllowed: (src: string) => boolean }>({
  name: "foreignImages",
  addOptions() {
    return { isAllowed: () => true };
  },
  addProseMirrorPlugins() {
    const { isAllowed } = this.options;
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name !== "image") return;
              const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
              if (isAllowed(src)) return;
              decorations.push(
                Decoration.widget(
                  pos,
                  () => {
                    const note = document.createElement("p");
                    note.contentEditable = "false";
                    note.dataset.foreignImageNote = "";
                    note.className =
                      "mt-4 mb-0 rounded-t-lg border-2 border-b-0 border-salmon bg-white px-3 py-2 font-sans text-sm font-semibold text-salmon";
                    note.textContent = FOREIGN_IMAGE_NOTE;
                    return note;
                  },
                  { side: -1, key: `foreign-${pos}-${src}`, ignoreSelection: true },
                ),
                Decoration.node(pos, pos + node.nodeSize, {
                  class: "mt-0! border-2 border-salmon opacity-60",
                  "aria-label": FOREIGN_IMAGE_NOTE,
                  title: FOREIGN_IMAGE_NOTE,
                }),
              );
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

// Jen to, co propustí sanitizePostHtml (src/lib/sanitize.ts). StarterKit
// v Tiptapu 3 umí i podtržení, přeškrtnutí, kód a vodorovnou čáru přes
// klávesové zkratky, ty by se při uložení tiše ztratily.
const BASE_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    strike: false,
    underline: false,
    horizontalRule: false,
    link: {
      openOnClick: false,
      defaultProtocol: "https",
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    },
  }),
  Image.configure({
    HTMLAttributes: { class: "my-4 rounded-xl" },
  }),
  Youtube.configure({
    controls: true,
    nocookie: true,
    // Výchozí 640 x 480 by uložilo video na webu v poměru 4 : 3. h-auto
    // přebije atribut height, aby v editoru platilo aspect-video.
    width: 640,
    height: 360,
    HTMLAttributes: { class: "my-4 aspect-video h-auto w-full rounded-xl" },
  }),
  GalleryMarker,
];

/**
 * Vložený text z Wordu nebo z webu. Tabulku editor neumí a slil by buňky do
 * jednoho slova („DenTrasa1KISM - KJAX“), proto z každého řádku tabulky
 * udělá odstavec s buňkami oddělenými čárkou. Nadpis 1 (H1) by editor vzal
 * jako obyčejný odstavec, změní se na Mezititulek, H4 až H6 na Menší
 * mezititulek. Ostatní formátování srovná schéma editoru a pak sanitizePostHtml.
 */
function cleanPastedHtml(html: string): string {
  if (!/<(table|h[1456])\b/i.test(html)) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");

  for (const table of Array.from(doc.querySelectorAll("table"))) {
    if (!table.isConnected) continue; // vnořená tabulka, už je v textu vnější
    const rows = Array.from(table.querySelectorAll("tr"));
    const paragraphs = rows
      .map((row) =>
        Array.from(row.children)
          .map((cell) => (cell.textContent ?? "").replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .join(", "),
      )
      .filter(Boolean)
      .map((text) => {
        const p = doc.createElement("p");
        p.textContent = text;
        return p;
      });
    table.replaceWith(...paragraphs);
  }

  const rename = (selector: string, tag: string) => {
    for (const el of Array.from(doc.querySelectorAll(selector))) {
      const next = doc.createElement(tag);
      next.append(...Array.from(el.childNodes));
      el.replaceWith(next);
    }
  };
  rename("h1", "h2");
  rename("h4, h5, h6", "h3");
  return doc.body.innerHTML;
}

// Text článku je Honzův hlas, proto serif jako na webu (.prose), nadpisy
// bezpatkové.
const EDITOR_PROPS = {
  attributes: {
    role: "textbox",
    "aria-multiline": "true",
    "aria-label": "Text článku",
    class:
      "min-h-[400px] rounded-b-lg border border-t-0 border-field bg-white px-5 py-4 font-serif text-lg leading-[1.7] text-foreground focus:border-accent focus:outline-none [&_a]:text-accent-ink [&_a]:underline [&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:font-sans [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-sans [&_h3]:text-xl [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6",
  },
  transformPastedHTML: cleanPastedHtml,
};

/**
 * Adresa odkazu z okna Odkaz. Bez schématu by "flyamerica.cz" byla relativní
 * adresa a z článku /z-cest/x by vedla na /z-cest/flyamerica.cz. defaultProtocol
 * u Linku platí jen pro automatické odkazy, ne pro setLink.
 */
function normalizeLinkHref(input: string): string {
  const url = input.trim();
  if (/^([a-z][a-z0-9+.-]*:\/\/|mailto:|tel:)/i.test(url) || /^[/#?]/.test(url)) return url;
  if (/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(url)) return `mailto:${url}`;
  return `https://${url}`;
}

function galleryIdsIn(editor: Editor): string[] {
  const ids: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === GALLERY_MARKER && typeof node.attrs.id === "string") {
      ids.push(node.attrs.id);
    }
  });
  return ids;
}

function markerPositions(editor: Editor, id: string) {
  const found: { pos: number; size: number }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === GALLERY_MARKER && node.attrs.id === id) {
      found.push({ pos, size: node.nodeSize });
    }
  });
  // Odzadu, aby mazání neposunulo pozice dalších značek.
  return found.reverse();
}

/** Okno nad editorem: odkaz (s textem, nebo na označený text), video, popisek fotky. */
type EditorDialog =
  | { kind: "link"; withText: boolean; href: string }
  | { kind: "video" }
  | { kind: "image"; image: UploadedImage };

export function RichTextEditor({
  name,
  initialHTML = "",
  galleries,
  uploadsEnabled,
  allowedImagePrefixes,
  onGalleryIdsChange,
  onUploadingChange,
  onReady,
  onChange,
  onFocusChange,
  ref,
}: RichTextEditorProps) {
  const [html, setHtml] = useState(initialHTML);
  const [uploading, setUploading] = useState(false);
  const [dialog, setDialog] = useState<EditorDialog | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Dokud do editoru nikdo neklikl, kurzor je na začátku textu. Galerie
  // vložená z tlačítka pak patří spíš na konec.
  const focusedOnce = useRef(false);
  const lastIds = useRef<string | null>(null);

  const reportGalleryIds = (editor: Editor) => {
    const ids = galleryIdsIn(editor);
    const key = ids.join(" ");
    if (key === lastIds.current) return;
    lastIds.current = key;
    onGalleryIdsChange?.(ids);
  };

  // Rozšíření se čtou jen při vytvoření editoru, seznam adres se nemění.
  const extensions = useMemo(
    () => [
      ...BASE_EXTENSIONS,
      ForeignImages.configure({
        isAllowed: (src: string) => allowedImagePrefixes.some((prefix) => src.startsWith(prefix)),
      }),
    ],
    [allowedImagePrefixes],
  );

  const editor = useEditor({
    extensions,
    content: initialHTML,
    immediatelyRender: false,
    editorProps: EDITOR_PROPS,
    onCreate: ({ editor }) => {
      reportGalleryIds(editor);
      onReady?.(editor.getHTML(), galleryIdsIn(editor));
    },
    onFocus: () => {
      focusedOnce.current = true;
      onFocusChange?.(true);
    },
    onBlur: () => onFocusChange?.(false),
    onUpdate: ({ editor }) => {
      const next = editor.getHTML();
      setHtml(next);
      onChange?.(next);
      reportGalleryIds(editor);
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      placeGallery(id) {
        if (!editor) return;
        const existing = markerPositions(editor, id);
        const marker = editor.schema.nodes[GALLERY_MARKER].create({ id });
        editor
          .chain()
          .focus(focusedOnce.current ? null : "end")
          .command(({ tr }) => {
            for (const { pos, size } of existing) tr.delete(pos, pos + size);
            const { selection } = tr;
            // Označený blok (třeba jiná galerie) se nepřepisuje, nová
            // značka jde za něj.
            if (selection instanceof NodeSelection) tr.insert(selection.to, marker);
            else tr.replaceSelectionWith(marker, false);
            tr.scrollIntoView();
            return true;
          })
          .run();
      },
      removeGallery(id) {
        if (!editor) return;
        const existing = markerPositions(editor, id);
        if (existing.length === 0) return;
        editor.commands.command(({ tr }) => {
          for (const { pos, size } of existing) tr.delete(pos, pos + size);
          return true;
        });
      },
      appendGalleries(ids) {
        if (!editor) return [];
        const present = new Set(galleryIdsIn(editor));
        const missing = ids.filter((id) => !present.has(id));
        if (missing.length === 0) return [];
        editor.commands.command(({ tr }) => {
          // Za poslední blok s obsahem: prázdný odstavec na konci (editor
          // ho za galerií na konci textu drží vždy) zůstane poslední.
          const { doc } = tr;
          const last = doc.lastChild;
          const trailingEmpty =
            last !== null && last.type.name === "paragraph" && last.content.size === 0 && doc.childCount > 1;
          const at = trailingEmpty ? doc.content.size - last.nodeSize : doc.content.size;
          const markers = missing.map((id) => editor.schema.nodes[GALLERY_MARKER].create({ id }));
          tr.insert(at, markers);
          return true;
        });
        return missing;
      },
      focus() {
        editor?.commands.focus(focusedOnce.current ? null : "start");
      },
      setContent(content) {
        editor?.commands.setContent(content, { emitUpdate: true });
      },
    }),
    [editor],
  );

  const openLink = useCallback(() => {
    if (!editor) return;
    const href = (editor.getAttributes("link").href as string | undefined) ?? "";
    const withText = editor.state.selection.empty && !editor.isActive("link");
    setDialog({ kind: "link", withText, href });
  }, [editor]);

  const insertImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      onUploadingChange?.(true);
      try {
        const image = await uploadImage(file);
        setDialog({ kind: "image", image });
      } catch (err) {
        toast.error(
          `Fotku se nepodařilo nahrát: ${err instanceof Error ? err.message : "neznámá chyba"}`,
        );
      } finally {
        setUploading(false);
        onUploadingChange?.(false);
      }
    },
    [editor, onUploadingChange],
  );

  if (!editor) {
    return (
      <div className="min-h-[460px] rounded-lg border border-field bg-white" />
    );
  }

  const placeImage = (image: UploadedImage, alt: string) => {
    editor
      .chain()
      .focus()
      .setImage({ src: image.url, alt: alt.trim(), width: image.width, height: image.height })
      .run();
  };

  // Okno podle toho, co se vkládá. Hlášky ukazuje okno u pole, nic tiše nezmizí.
  let prompt: {
    title: string;
    description?: string;
    fields: PromptField[];
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: (values: Record<string, string>) => string | null;
    onCancel: () => void;
  } | null = null;

  if (dialog?.kind === "link") {
    const { withText, href } = dialog;
    prompt = {
      title: withText ? "Vložit odkaz" : href ? "Upravit odkaz" : "Odkaz",
      description: withText
        ? "Žádné slovo není označené. Napište text, na který se bude klikat, a adresu."
        : href
          ? "Prázdná adresa odkaz zruší, text zůstane."
          : undefined,
      fields: [
        ...(withText
          ? [{ name: "text", label: "Text odkazu", placeholder: "například web letiště" }]
          : []),
        {
          name: "href",
          label: "Adresa odkazu",
          type: "url" as const,
          inputMode: "url" as const,
          defaultValue: href,
          placeholder: "například flyamerica.cz",
          hint: "Stačí bez https://, doplní se samo.",
        },
      ],
      confirmLabel: withText ? "Vložit odkaz" : "Uložit odkaz",
      onConfirm: (values) => {
        const url = (values.href ?? "").trim();
        if (withText) {
          const text = (values.text ?? "").replace(/\s+/g, " ").trim();
          if (!text) return "Napište text odkazu, na který se bude klikat.";
          if (!url) return "Napište adresu odkazu.";
          if (/\s/.test(url)) return "Adresa odkazu nesmí obsahovat mezery.";
          editor
            .chain()
            .focus()
            .insertContent({
              type: "text",
              text,
              marks: [{ type: "link", attrs: { href: normalizeLinkHref(url) } }],
            })
            // Psaní za vloženým odkazem už odkaz nemá prodlužovat.
            .unsetMark("link")
            .run();
        } else if (!url) {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
        } else {
          if (/\s/.test(url)) return "Adresa odkazu nesmí obsahovat mezery.";
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: normalizeLinkHref(url) })
            .run();
        }
        setDialog(null);
        return null;
      },
      onCancel: () => {
        setDialog(null);
        editor.commands.focus();
      },
    };
  } else if (dialog?.kind === "video") {
    prompt = {
      title: "Video z YouTube do textu",
      description: "Video se vloží na místo kurzoru.",
      fields: [
        {
          name: "src",
          label: "Odkaz na video",
          type: "url",
          inputMode: "url",
          placeholder: "https://www.youtube.com/watch?v=...",
          hint: "Na YouTube klikněte u videa na Sdílet a zkopírujte odkaz.",
        },
      ],
      confirmLabel: "Vložit video",
      onConfirm: (values) => {
        const src = (values.src ?? "").trim();
        if (!src) return "Vložte odkaz na video z YouTube.";
        if (!isValidYoutubeUrl(src)) return "Tohle není odkaz na YouTube.";
        if (!editor.chain().focus().setYoutubeVideo({ src }).run()) {
          return "Tohle není odkaz na YouTube.";
        }
        setDialog(null);
        return null;
      },
      onCancel: () => {
        setDialog(null);
        editor.commands.focus();
      },
    };
  } else if (dialog?.kind === "image") {
    const { image } = dialog;
    prompt = {
      title: "Popisek fotky",
      description: "Fotka je nahraná a vloží se na místo kurzoru.",
      fields: [
        {
          name: "alt",
          label: "Popisek fotky",
          placeholder: "například Cessna 172 na letišti Cedar Key",
          hint: "Krátce, co je na fotce. Přečtou ho nevidomí a vyhledávače.",
        },
      ],
      confirmLabel: "Vložit fotku",
      cancelLabel: "Vložit bez popisku",
      onConfirm: (values) => {
        placeImage(image, values.alt ?? "");
        setDialog(null);
        return null;
      },
      // Fotka už je nahraná, vloží se i bez popisku (jako dřív u prázdného promptu).
      onCancel: () => {
        placeImage(image, "");
        setDialog(null);
      },
    };
  }

  return (
    <div>
      <Toolbar
        editor={editor}
        onLink={openLink}
        onYoutube={() => setDialog({ kind: "video" })}
        onImageClick={() => fileInputRef.current?.click()}
        uploading={uploading}
        uploadsEnabled={uploadsEnabled}
      />
      <GalleryInfoContext.Provider value={galleries}>
        <EditorContent editor={editor} />
      </GalleryInfoContext.Provider>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void insertImage(file);
          e.target.value = "";
        }}
      />
      <input type="hidden" name={name} value={html} />
      <PromptDialog
        open={prompt !== null}
        title={prompt?.title ?? ""}
        description={prompt?.description}
        fields={prompt?.fields ?? []}
        confirmLabel={prompt?.confirmLabel ?? ""}
        cancelLabel={prompt?.cancelLabel}
        onConfirm={(values) => prompt?.onConfirm(values) ?? null}
        onCancel={() => prompt?.onCancel()}
      />
    </div>
  );
}

/**
 * Tlačítko lišty. text: na počítači ikona s textem (Odstavec, mezititulky,
 * Fotka, Video), jinak jen ikona s popiskem v title. mobile: „row“ je v jediném
 * řádku na telefonu, „more“ až pod tlačítkem Další.
 */
interface ToolbarItem {
  key: string;
  label: string;
  /** Kratší text vedle ikony, když se liší od label. */
  text?: string;
  icon: React.ReactNode;
  showText?: boolean;
  mobile: "row" | "more";
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** Svislá čára před tlačítkem (skupiny lišty na počítači). */
  divider?: boolean;
}

function Toolbar({
  editor,
  onLink,
  onYoutube,
  onImageClick,
  uploading,
  uploadsEnabled,
}: {
  editor: Editor;
  onLink: () => void;
  onYoutube: () => void;
  onImageClick: () => void;
  uploading: boolean;
  uploadsEnabled: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  // Tiptap 3 komponentu při změně výběru sám nepřekreslí.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      paragraph: e.isActive("paragraph"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const items: ToolbarItem[] = [
    {
      key: "bold",
      label: "Tučně",
      icon: <Bold size={16} aria-hidden />,
      mobile: "row",
      active: state.bold,
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      key: "italic",
      label: "Kurzíva",
      icon: <Italic size={16} aria-hidden />,
      mobile: "more",
      active: state.italic,
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      key: "paragraph",
      label: "Odstavec",
      icon: <Pilcrow size={16} aria-hidden />,
      showText: true,
      mobile: "more",
      divider: true,
      active: state.paragraph,
      onClick: () => editor.chain().focus().setParagraph().run(),
    },
    {
      key: "h2",
      label: "Mezititulek",
      icon: <Heading2 size={16} aria-hidden />,
      showText: true,
      mobile: "row",
      active: state.h2,
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      key: "h3",
      label: "Menší mezititulek",
      icon: <Heading3 size={16} aria-hidden />,
      showText: true,
      mobile: "more",
      active: state.h3,
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      key: "bulletList",
      label: "Odrážky",
      icon: <List size={16} aria-hidden />,
      mobile: "more",
      divider: true,
      active: state.bulletList,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      key: "orderedList",
      label: "Číslovaný seznam",
      icon: <ListOrdered size={16} aria-hidden />,
      mobile: "more",
      active: state.orderedList,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      key: "blockquote",
      label: "Citace",
      icon: <Quote size={16} aria-hidden />,
      mobile: "more",
      active: state.blockquote,
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      key: "link",
      label: "Odkaz",
      icon: <LinkIcon size={16} aria-hidden />,
      mobile: "row",
      divider: true,
      active: state.link,
      onClick: onLink,
    },
    {
      key: "unlink",
      label: "Zrušit odkaz",
      icon: <Link2Off size={16} aria-hidden />,
      mobile: "more",
      disabled: !state.link,
      onClick: () => editor.chain().focus().extendMarkRange("link").unsetLink().run(),
    },
    {
      key: "image",
      label: uploadsEnabled
        ? "Fotka do textu: nahrát z počítače nebo telefonu"
        : UPLOADS_DISABLED_MESSAGE,
      text: "Fotka",
      icon: uploading ? (
        <Loader2 size={16} className="animate-spin" aria-hidden />
      ) : (
        <ImageIcon size={16} aria-hidden />
      ),
      showText: true,
      mobile: "row",
      disabled: uploading || !uploadsEnabled,
      onClick: onImageClick,
    },
    {
      key: "video",
      label: "Video z YouTube do textu",
      text: "Video",
      icon: <YoutubeIcon size={16} aria-hidden />,
      showText: true,
      mobile: "more",
      onClick: onYoutube,
    },
    {
      key: "undo",
      label: "Zpět",
      icon: <Undo2 size={16} aria-hidden />,
      mobile: "more",
      divider: true,
      disabled: !state.canUndo,
      onClick: () => editor.chain().focus().undo().run(),
    },
    {
      key: "redo",
      label: "Znovu",
      icon: <Redo2 size={16} aria-hidden />,
      mobile: "more",
      disabled: !state.canRedo,
      onClick: () => editor.chain().focus().redo().run(),
    },
  ];

  return (
    <div
      role="group"
      aria-label="Formát textu"
      className="sticky top-14 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border border-field bg-gray-50 px-1 py-1 sm:gap-1 sm:px-2 sm:py-2 lg:top-0"
    >
      {items.map((item) => (
        <span
          key={item.key}
          className={
            item.mobile === "row"
              ? "contents"
              : `contents ${moreOpen ? "" : "max-sm:[&>*]:hidden"}`
          }
        >
          {item.divider && <Divider />}
          <Btn item={item} />
        </span>
      ))}
      {/* Na telefonu jeden řádek, zbytek až pod Další (úprava 51 z auditu). */}
      <button
        type="button"
        aria-expanded={moreOpen}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setMoreOpen((open) => !open)}
        className="order-1 inline-flex h-11 cursor-pointer items-center gap-1 rounded-md px-2 text-sm font-semibold text-foreground hover:bg-gray-200 sm:hidden"
      >
        <Ellipsis size={16} aria-hidden />
        {moreOpen ? "Méně" : "Další"}
      </button>
    </div>
  );
}

function Btn({ item }: { item: ToolbarItem }) {
  const { label, text, icon, showText, mobile, active, disabled, onClick } = item;
  // Text vedle ikony: na počítači u vybraných tlačítek, na telefonu u všech
  // pod Další (dotyk nemá popisek při najetí myší). V jediném řádku na
  // telefonu jen ikona, jinak by se nevešel.
  const textClass =
    mobile === "row"
      ? showText
        ? "max-sm:hidden"
        : null
      : showText
        ? ""
        : "sm:hidden";
  const padding =
    textClass === null ? "" : textClass === "max-sm:hidden" ? "sm:px-2.5 " : textClass === "" ? "px-2.5 " : "max-sm:px-2.5 ";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      // Klik nebere fokus z textu: kurzor zůstane, kde byl, a na telefonu
      // nezmizí klávesnice.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={
        "inline-flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-md text-sm text-foreground transition-colors sm:h-9 sm:min-w-9 pointer-coarse:h-11 pointer-coarse:min-w-11 " +
        // Na telefonu jde řádek před tlačítko Další, zbytek za něj.
        (mobile === "row" ? "max-sm:order-0 " : "max-sm:order-2 ") +
        padding +
        (active
          ? "bg-accent text-white"
          : "hover:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent")
      }
    >
      {icon}
      {textClass !== null && (
        <span aria-hidden className={textClass}>
          {text ?? label}
        </span>
      )}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px bg-gray-300 max-sm:hidden" aria-hidden />;
}
