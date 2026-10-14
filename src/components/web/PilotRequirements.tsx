import { PILOT_REQUIREMENTS } from "@/data/pilot-requirements";
import { czechNbspText } from "@/lib/typography";

/**
 * Honzovy požadavky na piloty (src/data/pilot-requirements.ts) jako
 * odstavce pod sebou. Nadpis a vzhled bloku dává stránka: úvod v tmavé
 * sekci Průběh přípravy (.req), výlety pod přehledem programu (.pk-req).
 */
export function PilotRequirements({ className }: { className?: string }) {
  return (
    <div className={className}>
      {PILOT_REQUIREMENTS.map((paragraph) => (
        <p key={paragraph}>{czechNbspText(paragraph)}</p>
      ))}
    </div>
  );
}
