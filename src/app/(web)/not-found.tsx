import type { Metadata } from "next";
import { NotFoundContent } from "@/components/web/NotFoundContent";

// Pro notFound() ve stránkách webu (např. neexistující článek deníku).
// Neznámé adresy obsluhuje src/app/global-not-found.tsx.
export const metadata: Metadata = {
  title: "Stránka nenalezena",
};

export default function NotFound() {
  return <NotFoundContent />;
}
