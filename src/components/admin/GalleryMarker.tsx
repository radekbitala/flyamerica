"use client";

import { createContext, useContext } from "react";
import { NodeSelection, Plugin } from "@tiptap/pm/state";
import {
  mergeAttributes,
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { Images, X } from "lucide-react";
import { photoCount } from "./image-upload";

export interface GalleryInfo {
  /** Pořadí galerie v sekci Galerie, od 1. */
  number: number;
  count: number;
}

/** Popis galerií pro bloky v editoru: id galerie -> číslo a počet fotek. */
export const GalleryInfoContext = createContext<Map<string, GalleryInfo>>(
  new Map(),
);

export const GALLERY_MARKER = "galleryMarker";

/**
 * Značka galerie v textu článku: <p data-gallery="ID"></p>. Na webu se na
 * jejím místě vykreslí galerie s tímto id. V editoru je to jeden blok bez
 * textu, který jde přesunout tlačítkem v sekci Galerie nebo odebrat
 * křížkem. Klávesy Backspace a Delete ho nesmažou, aby galerie nezmizela
 * z textu omylem při mazání sousedního odstavce.
 */
export const GalleryMarker = Node.create({
  name: GALLERY_MARKER,
  group: "block",
  atom: true,
  draggable: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-gallery"),
        renderHTML: (attributes) => ({ "data-gallery": attributes.id }),
      },
    };
  },

  parseHTML() {
    // Přednost před obyčejným odstavcem (pravidlo "p" má prioritu 50).
    return [{ tag: "p[data-gallery]", priority: 100 }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryMarkerView);
  },

  addKeyboardShortcuts() {
    const isMarker = (node: { type: { name: string } } | null | undefined) =>
      node?.type.name === GALLERY_MARKER;

    const guard = (direction: "backward" | "forward") => () => {
      const { selection, doc } = this.editor.state;
      if (selection instanceof NodeSelection) return isMarker(selection.node);
      if (!selection.empty) return false;

      const $pos = selection.$from;
      // Prázdný odstavec vedle galerie smazat jde (výchozí chování ho
      // odstraní a označí galerii, další stisk pak zachytí řádek výše).
      if ($pos.parent.content.size === 0) return false;

      if (direction === "backward") {
        if ($pos.parentOffset !== 0) return false;
        return isMarker(doc.resolve($pos.before()).nodeBefore);
      }
      if ($pos.parentOffset !== $pos.parent.content.size) return false;
      return isMarker(doc.resolve($pos.after()).nodeAfter);
    };

    return {
      Backspace: guard("backward"),
      "Mod-Backspace": guard("backward"),
      Delete: guard("forward"),
      "Mod-Delete": guard("forward"),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          // Psaní přes označený blok galerie by ho nahradilo textem.
          handleTextInput: (view) => {
            const { selection } = view.state;
            return (
              selection instanceof NodeSelection &&
              selection.node.type.name === GALLERY_MARKER
            );
          },
        },
      }),
    ];
  },
});

function GalleryMarkerView({ node, deleteNode, selected }: ReactNodeViewProps) {
  const galleries = useContext(GalleryInfoContext);
  const id = typeof node.attrs.id === "string" ? node.attrs.id : "";
  const info = galleries.get(id);

  return (
    <NodeViewWrapper contentEditable={false} className="my-4 font-sans">
      <div
        className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 text-sm ${
          selected ? "border-accent" : "border-field"
        } ${info ? "bg-warm-gray text-foreground" : "bg-white text-salmon"}`}
      >
        <Images size={18} aria-hidden />
        <span className="font-semibold">
          {info
            ? `Galerie ${info.number}: ${photoCount(info.count)}`
            : "Galerie, která už v článku není. Při uložení zmizí."}
        </span>
        <button
          type="button"
          onClick={deleteNode}
          title="Odebrat galerii z textu"
          aria-label="Odebrat galerii z textu"
          className="ml-auto cursor-pointer rounded p-1 text-text-secondary hover:bg-white hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>
    </NodeViewWrapper>
  );
}
