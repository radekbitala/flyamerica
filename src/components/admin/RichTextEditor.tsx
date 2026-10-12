"use client";

import { useCallback, useImperativeHandle, useRef, useState } from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
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
} from "lucide-react";
import { UPLOADS_DISABLED_MESSAGE } from "@/lib/post-form";
import {
  GALLERY_MARKER,
  GalleryInfoContext,
  GalleryMarker,
  type GalleryInfo,
} from "./GalleryMarker";
import { ACCEPTED_IMAGE_TYPES, uploadImage } from "./image-upload";

export interface RichTextEditorHandle {
  /** Vloží značku galerie na místo kurzoru, nebo ji tam přesune. */
  placeGallery: (id: string) => void;
  /** Odebere značku galerie z textu (galerie sama zůstane). */
  removeGallery: (id: string) => void;
}

interface RichTextEditorProps {
  name: string;
  initialHTML?: string;
  galleries: Map<string, GalleryInfo>;
  uploadsEnabled: boolean;
  /** Id galerií, jejichž značky jsou v textu, v pořadí od začátku. */
  onGalleryIdsChange?: (ids: string[]) => void;
  onUploadingChange?: (busy: boolean) => void;
  ref?: React.Ref<RichTextEditorHandle>;
}

// Jen to, co propustí sanitizePostHtml (src/lib/sanitize.ts). StarterKit
// v Tiptapu 3 umí i podtržení, přeškrtnutí, kód a vodorovnou čáru přes
// klávesové zkratky, ty by se při uložení tiše ztratily.
const EXTENSIONS = [
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
};

/**
 * Adresa odkazu z promptu. Bez schématu by "flyamerica.cz" byla relativní
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

export function RichTextEditor({
  name,
  initialHTML = "",
  galleries,
  uploadsEnabled,
  onGalleryIdsChange,
  onUploadingChange,
  ref,
}: RichTextEditorProps) {
  const [html, setHtml] = useState(initialHTML);
  const [uploading, setUploading] = useState(false);
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

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: initialHTML,
    immediatelyRender: false,
    editorProps: EDITOR_PROPS,
    onCreate: ({ editor }) => reportGalleryIds(editor),
    onFocus: () => {
      focusedOnce.current = true;
    },
    onUpdate: ({ editor }) => {
      setHtml(editor.getHTML());
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
    }),
    [editor],
  );

  const addLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Adresa odkazu:", previous || "https://");
    if (url === null) return;
    const href = url.trim();
    if (href === "" || href === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: normalizeLinkHref(href) })
      .run();
  }, [editor]);

  const addYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Odkaz na video z YouTube:", "https://");
    if (!url) return;
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
  }, [editor]);

  const insertImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      onUploadingChange?.(true);
      try {
        const image = await uploadImage(file);
        const alt = window.prompt(
          "Popis fotky pro nevidomé a vyhledávače (alt text):",
          "",
        );
        editor
          .chain()
          .focus()
          .setImage({
            src: image.url,
            alt: alt?.trim() ?? "",
            width: image.width,
            height: image.height,
          })
          .run();
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

  return (
    <div>
      <Toolbar
        editor={editor}
        onLink={addLink}
        onYoutube={addYoutube}
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
    </div>
  );
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

  return (
    <div className="sticky top-14 z-10 flex flex-wrap items-center gap-1 rounded-t-lg border border-field bg-gray-50 px-2 py-2 lg:top-0">
      <Btn
        label="Tučně"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </Btn>
      <Btn
        label="Kurzíva"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </Btn>
      <Divider />
      <Btn
        label="Odstavec"
        active={state.paragraph}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        <Pilcrow size={16} />
      </Btn>
      <Btn
        label="Nadpis 2"
        active={state.h2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={16} />
      </Btn>
      <Btn
        label="Nadpis 3"
        active={state.h3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={16} />
      </Btn>
      <Divider />
      <Btn
        label="Odrážky"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={16} />
      </Btn>
      <Btn
        label="Číslovaný seznam"
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={16} />
      </Btn>
      <Btn
        label="Citace"
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={16} />
      </Btn>
      <Divider />
      <Btn label="Odkaz" active={state.link} onClick={onLink}>
        <LinkIcon size={16} />
      </Btn>
      <Btn
        label="Zrušit odkaz"
        onClick={() => editor.chain().focus().unsetLink().run()}
        disabled={!state.link}
      >
        <Link2Off size={16} />
      </Btn>
      <Btn
        label={uploadsEnabled ? "Fotka do textu" : UPLOADS_DISABLED_MESSAGE}
        onClick={onImageClick}
        disabled={uploading || !uploadsEnabled}
      >
        {uploading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <ImageIcon size={16} />
        )}
      </Btn>
      <Btn label="Video z YouTube" onClick={onYoutube}>
        <YoutubeIcon size={16} />
      </Btn>
      <Divider />
      <Btn
        label="Zpět"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!state.canUndo}
      >
        <Undo2 size={16} />
      </Btn>
      <Btn
        label="Znovu"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!state.canRedo}
      >
        <Redo2 size={16} />
      </Btn>
    </div>
  );
}

function Btn({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={
        "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-foreground transition-colors " +
        (active
          ? "bg-accent text-white"
          : "hover:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent")
      }
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px bg-gray-300" aria-hidden />;
}
