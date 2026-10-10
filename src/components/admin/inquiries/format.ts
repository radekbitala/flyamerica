// Server běží v UTC, Honza čte časy pražské.
const dateTime = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Prague",
});

export function formatDateTime(d: Date): string {
  return dateTime.format(d);
}

/** Odkaz tel: bez mezer a závorek, jen + a číslice. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
