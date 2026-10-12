/*
 * NÁVRH k odsouhlasení Radkem a Honzou, zatím ne konečné znění.
 *
 * Zásady zpracování osobních údajů pro formuláře na stránce Kontakt
 * (poptávka a „Nechte číslo, Honza zavolá“). Na stránku odkazuje
 * informační věta pod oběma formuláři místo zaškrtávátka souhlasu
 * (rozhodnutí 10. 10. 2026). Údaje, které web opravdu ukládá, odpovídají tabulce
 * inquiries (src/lib/db/schema.ts) a server action v kontakt/actions.ts:
 * pole formuláře, otisk IP (sha256 se solí, samotná IP se neukládá)
 * a údaj o prohlížeči (user agent). Otisk i údaj o prohlížeči se po
 * TRACE_RETENTION_DAYS (src/lib/inquiries/spam.ts) mažou, lhůta v textu
 * musí sedět. Chybějící údaje jsou [doplnit: …].
 *
 * Rozložení: záhlaví a text ve sloupci 680 px na střed (src/styles/pages/
 * article.css, stejně jako články), text navazuje přímo na záhlaví.
 */
import { PageHead } from "@/components/web/PageHead";
import { pageMetadata } from "@/lib/metadata";
import { TRACE_RETENTION_DAYS } from "@/lib/inquiries/spam";
import { ROUTES } from "@/lib/routes";
import { FA_EMAIL } from "@/lib/site";
import styles from "./page.module.css";

export const metadata = pageMetadata({
  title: "Zásady zpracování osobních údajů",
  description:
    "Jak SKYSHARE s.r.o., provozovatel FLY America, zpracovává osobní údaje z formulářů na stránce Kontakt.",
  path: ROUTES.privacy,
});

const email = <a href={`mailto:${FA_EMAIL}`}>{FA_EMAIL}</a>;

export default function PrivacyPage() {
  return (
    <>
      <div className="read-head">
        <PageHead
          crumbs={{ href: ROUTES.contact, label: "Kontakt", current: "Osobní údaje" }}
          title="Zásady zpracování osobních údajů"
          perex={<>Jak zacházíme s&nbsp;údaji, které nám pošlete formulářem na stránce Kontakt.</>}
        />
      </div>

      <section className="sec sec--tight read-next" aria-label="Zásady zpracování osobních údajů">
        <div className="fa-wrap">
          <div className="read-body">
            <div className={`prose ${styles.policy}`}>
              <h2>Kdo údaje zpracovává</h2>
              <p>
                Správcem osobních údajů je SKYSHARE s.r.o., IČO&nbsp;03725235, se sídlem{" "}
                <span className="todo">[doplnit: sídlo firmy]</span>, provozovatel webu FLY America. Ve věcech
                osobních údajů nám napište na {email}.
              </p>

              <h2>Jaké údaje</h2>
              <p>Z&nbsp;poptávkového formuláře:</p>
              <ul>
                <li>jméno a&nbsp;příjmení, e-mail a&nbsp;telefon, pokud ho vyplníte,</li>
                <li>pilotní licenci, výlet, termín, počet pilotů, doprovod a&nbsp;odkud o&nbsp;nás víte,</li>
                <li>co sami napíšete do polí Pár slov o&nbsp;vás a&nbsp;Chcete ještě něco dodat.</li>
              </ul>
              <p>Z&nbsp;formuláře Nechte číslo, Honza zavolá: jméno a&nbsp;telefon.</p>
              <p>
                Kvůli ochraně formulářů před zneužitím ukládáme s&nbsp;každou poptávkou také pseudonymizovaný
                otisk IP adresy (samotnou IP adresu neukládáme) a&nbsp;údaj o&nbsp;prohlížeči, které po{" "}
                {TRACE_RETENTION_DAYS}&nbsp;dnech mažeme.
              </p>

              <h2>Proč a&nbsp;na jakém základě</h2>
              <p>
                Údaje použijeme jen k&nbsp;odpovědi na poptávku a&nbsp;k&nbsp;přípravě nabídky. Právním základem
                je jednání o&nbsp;smlouvě na vaši žádost (čl.&nbsp;6 odst.&nbsp;1 písm.&nbsp;b) GDPR).
              </p>
              <p>
                Otisk IP adresy a&nbsp;údaj o&nbsp;prohlížeči zpracováváme z&nbsp;oprávněného zájmu na ochraně
                formulářů před zneužitím (čl.&nbsp;6 odst.&nbsp;1 písm.&nbsp;f) GDPR).
              </p>

              <h2>Jak dlouho</h2>
              <p>
                <span className="todo">[doplnit: jak dlouho Honza poptávky uchovává]</span>
              </p>

              <h2>Kdo k&nbsp;údajům má přístup</h2>
              <p>
                Poptávky čte Honza Čermák za SKYSHARE s.r.o. Dál s&nbsp;údaji pracuje jen provozovatel webu, u&nbsp;kterého
                běží web a&nbsp;databáze, a&nbsp;e-mailová služba, přes kterou odchází upozornění na novou poptávku
                a&nbsp;potvrzení vám. Oba smí údaje použít jen pro nás. Nikomu dalšímu je nepředáváme.{" "}
                <span className="todo">[doplnit: názvy poskytovatelů a&nbsp;zda údaje opouštějí EU]</span>
              </p>

              <h2>Vaše práva</h2>
              <p>
                Máte právo na přístup ke svým údajům, na jejich opravu nebo výmaz, na omezení zpracování
                a&nbsp;na přenositelnost. Proti zpracování z&nbsp;oprávněného zájmu můžete vznést námitku. Stačí
                napsat na {email}, odpovíme nejpozději do měsíce.
              </p>
              <p>
                Když máte za to, že s&nbsp;údaji nezacházíme správně, můžete podat stížnost u&nbsp;Úřadu pro
                ochranu osobních údajů (ÚOOÚ), Pplk.&nbsp;Sochora&nbsp;27, 170&nbsp;00 Praha&nbsp;7.
              </p>

              <h2>Cookies</h2>
              <p>
                Web nepoužívá analytické ani reklamní cookies. Nezbytné cookies ukládá jen přihlášení do
                administrace webu, návštěvníků se netýkají.
              </p>
              <p>
                Video z&nbsp;YouTube v&nbsp;článcích Z&nbsp;cest se načte až po kliknutí na Přehrát video. Do té
                doby se prohlížeč se službou YouTube nespojí, náhled videa posílá náš web. Po spuštění přehrává
                video YouTube (Google) ze své adresy youtube-nocookie.com a&nbsp;může ukládat údaje podle svých
                zásad.
              </p>

              <p>
                Platné od <span className="todo">[doplnit: datum spuštění webu]</span>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
