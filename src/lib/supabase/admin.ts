import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Klient se servisním klíčem, jen na serveru (nahrávání a mazání obrázků).
 *
 * Vytvoří se až při prvním použití: build tak projde bez proměnných
 * prostředí a chybějící klíč se ohlásí až tam, kde je úložiště potřeba.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Chybí SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY, bez nich nejde nahrávat obrázky.",
    );
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Obrázky deníku (titulní fotky, fotky v textu, galerie). Veřejný bucket. */
export const DENIK_BUCKET = "denik";

/**
 * Do kterých bucketů smí nahrávací routa zapsat.
 *
 * Klíč posílá formulář, hodnota je skutečné jméno bucketu. Kdyby se jméno
 * bralo z formuláře rovnou, byl by to zápis servisním klíčem kamkoli
 * v projektu. Klíč, který tu není, routa odmítne.
 */
export const UPLOAD_BUCKETS = {
  denik: DENIK_BUCKET,
} as const;

export type UploadBucketKey = keyof typeof UPLOAD_BUCKETS;

export function isUploadBucketKey(value: unknown): value is UploadBucketKey {
  return typeof value === "string" && Object.hasOwn(UPLOAD_BUCKETS, value);
}

export function publicImageUrl(
  path: string,
  bucket: string = DENIK_BUCKET,
): string {
  return getSupabaseAdmin().storage.from(bucket).getPublicUrl(path).data
    .publicUrl;
}
