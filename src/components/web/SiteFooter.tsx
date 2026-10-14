import Link from "next/link";
import { NAV_ITEMS, inquiryHref } from "@/components/web/nav";
import { FA_COMPANY_SEAT, FA_EMAIL, FA_PHONE, FA_PHONE_HREF } from "@/lib/site";

/**
 * Patička webu, stejná na všech stránkách (je v layoutu (web)). Texty
 * doslova z modelu, u provozovatele navíc sídlo od Honzy (13. 10. 2026).
 * Podle systému bez loga, polohová tabule FA83 je jediný tabulový prvek.
 */
export function SiteFooter() {
  return (
    <footer className="ftr on-dark">
      <div className="fa-wrap">
        <div className="ftr-top">
          <div>
            <p className="ftr-claim">Létání s&nbsp;českými piloty na Floridě.</p>
            <p className="base">
              <span className="fa-loc fa-loc--m">FA83</span> Orlando North Airpark, Florida
            </p>
          </div>
          <div>
            <span className="lbl">Kontakt</span>
            <ul>
              <li>Jan Čermák</li>
              <li>
                <a href={FA_PHONE_HREF}>{FA_PHONE.replaceAll(" ", " ")}</a>
              </li>
              <li>
                <a href={`mailto:${FA_EMAIL}`}>{FA_EMAIL}</a>
              </li>
              <li>
                <Link href={inquiryHref()}>Poptávkový formulář</Link>
              </li>
            </ul>
          </div>
          <div>
            <span className="lbl">Web</span>
            <ul>
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="lbl">Provozovatel</span>
            <ul>
              <li>SKYSHARE s.r.o.</li>
              <li>IČO 03725235</li>
              <li>{FA_COMPANY_SEAT}</li>
            </ul>
          </div>
        </div>
        <div className="ftr-bot">
          <span>
            © 2026 FLY America
            <span className="dot" aria-hidden="true"></span>
            flyamerica.cz
          </span>
          <span>Fotografie: archiv FLY America</span>
        </div>
      </div>
    </footer>
  );
}
