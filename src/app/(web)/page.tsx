import { FA_EMAIL, FA_PHONE } from "@/lib/email";

// Dočasná úvodní stránka. Veřejné stránky z klikacího modelu se převedou
// v další fázi.
export default function HomePage() {
  return (
    <main id="obsah">
      <header className="page-head">
        <div className="fa-wrap">
          <h1>FLY America</h1>
          <p className="perex">Nový web se připravuje.</p>
          <ul className="contact-list" style={{ marginTop: 32 }}>
            <li>
              <span className="k">Telefon</span>{" "}
              <a href={`tel:${FA_PHONE.replaceAll(" ", "")}`}>{FA_PHONE}</a>
            </li>
            <li>
              <span className="k">E-mail</span>{" "}
              <a href={`mailto:${FA_EMAIL}`}>{FA_EMAIL}</a>
            </li>
          </ul>
        </div>
      </header>
    </main>
  );
}
