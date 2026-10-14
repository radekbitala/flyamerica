import { FA_EMAIL, FA_PHONE, FA_PHONE_HREF, FA_WHATSAPP_HREF } from "@/lib/site";
import { NBSP } from "@/lib/typography";

/**
 * Kontakty pod výzvou k poptávce (CtaSection na konci stránek, TripAsk
 * u výletu): Telefon, WhatsApp, E-mail. Vzhled .contact-list z web.css
 * (model). WhatsApp je jen řádek s odkazem, bez plovoucí bubliny (úprava 21,
 * rozhodnutí 14. 10. 2026). Skrytá část odkazu říká čtečce, kam zpráva jde,
 * štítek řádku do názvu odkazu nepatří.
 */
export function ContactList() {
  return (
    <ul className="contact-list">
      <li>
        <span className="k">Telefon</span> <a href={FA_PHONE_HREF}>{FA_PHONE.replaceAll(" ", NBSP)}</a>
      </li>
      <li>
        <span className="k">WhatsApp</span>{" "}
        <a href={FA_WHATSAPP_HREF}>
          Napsat zprávu<span className="vh"> na WhatsApp</span>
        </a>
      </li>
      <li>
        <span className="k">E-mail</span> <a href={`mailto:${FA_EMAIL}`}>{FA_EMAIL}</a>
      </li>
    </ul>
  );
}
