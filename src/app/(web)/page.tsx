import { pageMetadata } from "@/lib/metadata";
import { FA_EMAIL, FA_PHONE, FA_PHONE_HREF } from "@/lib/site";

// Dočasná úvodní stránka. Přepíše ji převod úvodu z klikacího modelu
// (prototyp/index.html), metadata zůstávají.
export const metadata = pageMetadata({
  title: "FLY America - létání na Floridě s mentorem",
  absoluteTitle: true,
  description:
    "Létání s českými piloty na Floridě. Domovská základna Orlando North Airpark (FA83), Cessna 182 a mentor Honza Čermák.",
  path: "/",
});

export default function HomePage() {
  return (
    <header className="page-head">
      <div className="fa-wrap">
        <h1>FLY America</h1>
        <p className="perex">Nový web se připravuje.</p>
        <ul className="contact-list" style={{ marginTop: 32 }}>
          <li>
            <span className="k">Telefon</span> <a href={FA_PHONE_HREF}>{FA_PHONE.replaceAll(" ", " ")}</a>
          </li>
          <li>
            <span className="k">E-mail</span> <a href={`mailto:${FA_EMAIL}`}>{FA_EMAIL}</a>
          </li>
        </ul>
      </div>
    </header>
  );
}
