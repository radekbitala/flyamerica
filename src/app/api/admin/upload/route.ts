import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin, signedOutAsNull } from "@/lib/admin-guard";
import { isStorageConfigured } from "@/lib/post-files";
import { UPLOADS_DISABLED_MESSAGE } from "@/lib/post-form";
import {
  getSupabaseAdmin,
  isUploadBucketKey,
  publicImageUrl,
  UPLOAD_BUCKETS,
} from "@/lib/supabase/admin";

// Vercel pustí do funkce nejvýš 4,5 MB. Prohlížeč fotky před nahráním
// zmenší (src/components/admin/image-upload.ts), takže se sem běžně vejdou.
const MAX_BYTES = 4 * 1024 * 1024;

interface ImageType {
  mime: string;
  ext: string;
}

/**
 * Typ podle prvních bajtů souboru, ne podle toho, co tvrdí prohlížeč.
 * Do veřejného bucketu se tak nedostane nic jiného než obrázek.
 */
function detectImageType(bytes: Uint8Array): ImageType | null {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return { mime: "image/png", ext: "png" };
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") {
    return { mime: "image/gif", ext: "gif" };
  }
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { mime: "image/webp", ext: "webp" };
  }
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) {
    return { mime: "image/avif", ext: "avif" };
  }
  return null;
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Rozměry změří prohlížeč a routa je jen vrátí zpět do formuláře. */
function dimension(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= 20000 ? n : null;
}

export async function POST(request: Request) {
  const admin = await requireAdmin().catch(signedOutAsNull);
  if (!admin) return error("Přihlášení vypršelo. Přihlaste se znovu.", 401);

  if (!isStorageConfigured()) return error(UPLOADS_DISABLED_MESSAGE, 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error("Chybí soubor.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return error("Chybí soubor.", 400);
  }
  if (file.size > MAX_BYTES) {
    return error("Fotka je větší než 4 MB.", 413);
  }

  // Formulář posílá klíč, ne jméno bucketu (viz UPLOAD_BUCKETS).
  const bucketKey = form.get("bucket") ?? "denik";
  if (!isUploadBucketKey(bucketKey)) return error("Neznámé úložiště.", 400);
  const bucket = UPLOAD_BUCKETS[bucketKey];

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) {
    return error(
      "Nepodporovaný formát. Nahrajte fotku ve formátu JPEG, PNG, WebP, GIF nebo AVIF.",
      415,
    );
  }

  // Náhodné jméno: původní název souboru může nést osobní údaje a dva
  // soubory se stejným názvem se nepřepíšou.
  const path = `${new Date().getFullYear()}/${randomUUID()}.${type.ext}`;

  const { error: uploadError } = await getSupabaseAdmin()
    .storage.from(bucket)
    .upload(path, bytes, {
      contentType: type.mime,
      cacheControl: "31536000, immutable",
      upsert: false,
    });

  if (uploadError) {
    console.error("[admin/upload] nahrání selhalo:", uploadError);
    return error("Fotku se nepodařilo uložit, zkuste to znovu.", 502);
  }

  return NextResponse.json({
    url: publicImageUrl(path, bucket),
    path,
    width: dimension(form.get("width")),
    height: dimension(form.get("height")),
  });
}
