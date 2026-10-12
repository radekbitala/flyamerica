import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

/**
 * HEAD by Next jinak obsloužil přes GET. Auth.js umí jen GET a POST, na HEAD
 * vyhodí UnknownAction („Only GET and POST requests are supported“) a zapíše
 * ji jako chybu do logu Vercelu. HEAD posílají roboti a kontroly
 * dostupnosti, přihlášení ho nepotřebuje: 405 bez volání Auth.js.
 */
export function HEAD() {
  return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
}
