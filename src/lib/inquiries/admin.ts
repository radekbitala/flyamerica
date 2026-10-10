import "server-only";
import { desc, eq, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { inquiries } from "@/lib/db/schema";
import { INQUIRY_STATUSES, type InquiryStatus } from "./options";

/**
 * Dotazy pro administraci poptávek. Volají se jen ze stránek, které už
 * prošly requireAdminPage().
 */

export type Inquiry = typeof inquiries.$inferSelect;

/** Filtr seznamu: konkrétní stav, nebo „active" = vše kromě archivu. */
export type InquiryFilter = "active" | InquiryStatus;

export const INQUIRY_PAGE_SIZE = 50;

export function parseInquiryFilter(value: string | undefined): InquiryFilter {
  return INQUIRY_STATUSES.includes(value as InquiryStatus) ? (value as InquiryStatus) : "active";
}

function filterWhere(filter: InquiryFilter): SQL {
  return filter === "active" ? ne(inquiries.status, "archived") : eq(inquiries.status, filter);
}

/** Počty podle stavu, chybějící stav je 0. */
export async function getInquiryCounts(): Promise<Record<InquiryFilter, number>> {
  const rows = await db
    .select({ status: inquiries.status, count: sql<number>`count(*)::int` })
    .from(inquiries)
    .groupBy(inquiries.status);

  const counts = { active: 0, new: 0, in_progress: 0, done: 0, archived: 0 };
  for (const { status, count } of rows) {
    counts[status] = count;
    if (status !== "archived") counts.active += count;
  }
  return counts;
}

/** Sloupce pro řádek seznamu. Volné texty se do přehledu netahají. */
const listColumns = {
  id: inquiries.id,
  kind: inquiries.kind,
  status: inquiries.status,
  name: inquiries.name,
  email: inquiries.email,
  phone: inquiries.phone,
  packageSlug: inquiries.packageSlug,
  travelDate: inquiries.travelDate,
  pilotCount: inquiries.pilotCount,
  createdAt: inquiries.createdAt,
};

export type InquiryListItem = Pick<Inquiry, keyof typeof listColumns>;

/** Stránka seznamu, nové nahoře. hasMore říká, jestli existuje další stránka. */
export async function listInquiries(
  filter: InquiryFilter,
  page: number,
): Promise<{ items: InquiryListItem[]; hasMore: boolean }> {
  const rows = await db
    .select(listColumns)
    .from(inquiries)
    .where(filterWhere(filter))
    .orderBy(desc(inquiries.createdAt), desc(inquiries.id))
    .limit(INQUIRY_PAGE_SIZE + 1)
    .offset((page - 1) * INQUIRY_PAGE_SIZE);

  return { items: rows.slice(0, INQUIRY_PAGE_SIZE), hasMore: rows.length > INQUIRY_PAGE_SIZE };
}

/** Posledních pár poptávek na přehled administrace (bez archivovaných). */
export async function listRecentInquiries(limit = 5): Promise<InquiryListItem[]> {
  return db
    .select(listColumns)
    .from(inquiries)
    .where(filterWhere("active"))
    .orderBy(desc(inquiries.createdAt), desc(inquiries.id))
    .limit(limit);
}

export async function getInquiry(id: string): Promise<Inquiry | null> {
  const [row] = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1);
  return row ?? null;
}
