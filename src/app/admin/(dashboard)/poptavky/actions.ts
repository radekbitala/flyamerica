"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  requireAdmin,
  SESSION_EXPIRED_MESSAGE,
  signedOutAsNull,
} from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { inquiries } from "@/lib/db/schema";
import { INQUIRY_STATUSES } from "@/lib/inquiries/options";

type ActionResult = { ok: true } | { ok: false; error: string };

// Argumenty server action posílá prohlížeč, takže se ověřují stejně jako formulář.
const idSchema = z.uuid();
const statusSchema = z.enum(INQUIRY_STATUSES);
const NOTE_MAX = 5000;
const noteSchema = z.string().max(NOTE_MAX);

const GONE: ActionResult = { ok: false, error: "Poptávka už neexistuje." };
const SIGNED_OUT: ActionResult = { ok: false, error: SESSION_EXPIRED_MESSAGE };

function refreshAdmin() {
  // Přehled, seznam i detail ukazují stav poptávky.
  revalidatePath("/admin", "layout");
}

export async function setInquiryStatus(id: string, status: string): Promise<ActionResult> {
  if (!(await requireAdmin().catch(signedOutAsNull))) return SIGNED_OUT;

  const parsedId = idSchema.safeParse(id);
  const parsedStatus = statusSchema.safeParse(status);
  if (!parsedId.success || !parsedStatus.success) {
    return { ok: false, error: "Neplatný požadavek." };
  }

  const updated = await db
    .update(inquiries)
    .set({ status: parsedStatus.data })
    .where(eq(inquiries.id, parsedId.data))
    .returning({ id: inquiries.id });
  if (!updated.length) return GONE;

  refreshAdmin();
  return { ok: true };
}

export async function saveInquiryNote(id: string, note: string): Promise<ActionResult> {
  if (!(await requireAdmin().catch(signedOutAsNull))) return SIGNED_OUT;

  const parsedId = idSchema.safeParse(id);
  const parsedNote = noteSchema.safeParse(note);
  if (!parsedId.success) return { ok: false, error: "Neplatný požadavek." };
  if (!parsedNote.success) {
    return { ok: false, error: `Poznámka může mít nejvýš ${NOTE_MAX} znaků.` };
  }

  const text = parsedNote.data.trim();
  const updated = await db
    .update(inquiries)
    .set({ internalNote: text || null })
    .where(eq(inquiries.id, parsedId.data))
    .returning({ id: inquiries.id });
  if (!updated.length) return GONE;

  refreshAdmin();
  return { ok: true };
}

/** Trvalé smazání. Tlačítko v detailu se před voláním ptá na potvrzení. */
export async function deleteInquiry(id: string): Promise<ActionResult> {
  if (!(await requireAdmin().catch(signedOutAsNull))) return SIGNED_OUT;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Neplatný požadavek." };

  const deleted = await db
    .delete(inquiries)
    .where(eq(inquiries.id, parsedId.data))
    .returning({ id: inquiries.id });
  if (!deleted.length) return GONE;

  refreshAdmin();
  redirect("/admin/poptavky?toast=deleted");
}
