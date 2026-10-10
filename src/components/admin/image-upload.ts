// Nahrávání fotek z administrace (titulní fotka, galerie, fotky v textu).
// Jen pro prohlížeč: používá canvas a fetch na /api/admin/upload.

export const ACCEPTED_IMAGE_TYPES =
  "image/jpeg,image/png,image/webp,image/gif,image/avif";

/** Delší strana fotky po zmenšení. Na webu se fotka nikdy neukáže větší. */
const MAX_EDGE = 2560;
/** Stejný limit jako v routě, ta musí zůstat pod 4,5 MB (Vercel). */
const MAX_BYTES = 4 * 1024 * 1024;

export interface UploadedImage {
  url: string;
  path: string;
  width: number;
  height: number;
  /** Malý data URL náhled pro rozmazaný placeholder. */
  blur: string;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth > 0 && img.naturalHeight > 0) resolve(img);
      else reject(new Error("empty image"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function drawScaled(img: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Prohlížeč neumí fotku zpracovat.");
  // Průhledné PNG by v JPEG zčernalo.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

function blurPreview(img: HTMLImageElement): string {
  const MAX_BLUR = 20;
  const ratio = img.naturalWidth / img.naturalHeight;
  const w = ratio >= 1 ? MAX_BLUR : Math.max(1, Math.round(MAX_BLUR * ratio));
  const h = ratio >= 1 ? Math.max(1, Math.round(MAX_BLUR / ratio)) : MAX_BLUR;
  try {
    const canvas = drawScaled(img, w, h);
    const webp = canvas.toDataURL("image/webp", 0.5);
    return webp.startsWith("data:image/webp")
      ? webp
      : canvas.toDataURL("image/jpeg", 0.6);
  } catch {
    return "";
  }
}

/**
 * Fotku zmenší na MAX_EDGE a překóduje do JPEG. Fotky z fotoaparátu
 * a telefonu (JPEG, WebP, AVIF) nesou EXIF a XMP včetně GPS polohy, kde
 * vznikly, a překódováním metadata zmizí. Průhlednost a animace WebP se
 * přitom ztratí. Beze změny zůstane jen malé PNG (grafika, průhlednost),
 * i s případnými metadaty, a GIF, ze kterého by canvas udělal statický
 * obrázek.
 */
async function prepare(file: File) {
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    throw new Error(
      "Soubor se nepodařilo otevřít jako obrázek. Fotky z iPhonu (HEIC) uložte jako JPEG.",
    );
  }

  const { naturalWidth: w, naturalHeight: h } = img;
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const keepPng = file.type === "image/png" && scale === 1 && file.size <= MAX_BYTES;
  const reencode = file.type !== "image/gif" && !keepPng;

  let blob: Blob = file;
  let width = w;
  let height = h;
  if (reencode) {
    width = Math.max(1, Math.round(w * scale));
    height = Math.max(1, Math.round(h * scale));
    const canvas = drawScaled(img, width, height);
    blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("Fotku se nepodařilo zpracovat.")),
        "image/jpeg",
        0.85,
      ),
    );
  }

  if (blob.size > MAX_BYTES) throw new Error("Fotka je větší než 4 MB.");
  return { blob, width, height, blur: blurPreview(img) };
}

/** Zmenší fotku a nahraje ji do bucketu "denik". Při chybě hodí Error s českou hláškou. */
export async function uploadImage(file: File): Promise<UploadedImage> {
  const { blob, width, height, blur } = await prepare(file);

  const form = new FormData();
  form.append("file", blob, "foto");
  form.append("bucket", "denik");
  form.append("width", String(width));
  form.append("height", String(height));

  let res: Response;
  try {
    res = await fetch("/api/admin/upload", { method: "POST", body: form });
  } catch {
    throw new Error("Nepodařilo se spojit se serverem. Zkontrolujte připojení.");
  }

  const data = (await res.json().catch(() => null)) as {
    url?: string;
    path?: string;
    error?: string;
  } | null;
  if (!res.ok || !data?.url || !data.path) {
    throw new Error(
      data?.error ??
        (res.status === 413 ? "Fotka je příliš velká." : "Nahrání se nepovedlo."),
    );
  }

  return { url: data.url, path: data.path, width, height, blur };
}

/** 1 fotka, 2 fotky, 5 fotek. */
export function photoCount(n: number): string {
  if (n === 1) return "1 fotka";
  if (n >= 2 && n <= 4) return `${n} fotky`;
  return `${n} fotek`;
}
