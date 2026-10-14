/**
 * e2e testy administrace: přihlášení a přehled, poptávky, články Z cest,
 * vypršelé přihlášení, změna hesla, omezení pokusů, administrace na telefonu,
 * ochrana rozepsaného textu (výpadek sítě, odchod, záloha, galerie mimo
 * text), chyby u polí, rok cesty, editor (odkaz, video, vložení z Wordu),
 * poptávka na telefonu a (na konci plného běhu, část 2) uložení
 * importovaných článků.
 */
import path from "node:path";
import postgres from "postgres";
import { BASE_URL, ROOT, assert, database, fetchManual, login, part, test } from "./_lib.mjs";

test("přihlášení testovacího admina a přehled", async (page, { email, password }) => {
  // Nepřihlášeného administrace pošle na přihlášení.
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForURL(`${BASE_URL}/admin/login`);

  // Kontakt na Radka pro zapomenuté heslo (rozhodnutí R11, osobní e-mail).
  const help = page.getByRole("link", { name: "radek.bitala@gmail.com" });
  assert(
    (await help.getAttribute("href")) === "mailto:radek.bitala@gmail.com",
    "Přihlášení: chybí odkaz na e-mail Radka.",
  );
  await page.getByText("Zapomenuté heslo nebo problém? Napište Radkovi:").waitFor();

  // Špatné heslo neprojde.
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill("spatne-heslo");
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await page.getByRole("alert").filter({ hasText: "Nesprávný e-mail nebo heslo." }).waitFor();

  // Správné heslo vede na přehled.
  await page.getByLabel("Heslo").fill(password);
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await page.waitForURL(`${BASE_URL}/admin`);
  await page.getByRole("heading", { level: 1, name: "Přehled" }).waitFor();

  const nav = page.getByRole("navigation", { name: "Administrace" });
  for (const name of ["Přehled", "Z cest", "Poptávky"]) {
    await nav.getByRole("link", { name, exact: true }).waitFor();
  }

  // Počty jdou z databáze, ukázková data mají publikovaný článek.
  const published = await page.getByRole("link", { name: /Publikované články/ }).innerText();
  assert(/\d+/.test(published), `Karta publikovaných článků bez čísla: "${published}"`);

  // Odhlášení ukončí session.
  await page.getByRole("button", { name: "Odhlásit" }).click();
  await page.waitForURL(`${BASE_URL}/admin/login`);
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForURL(`${BASE_URL}/admin/login`);
});

/**
 * Poptávky v administraci: přehled, seznam s filtrem, detail, změna stavu,
 * poznámka, archivace a smazání. Poptávka se kvůli rychlosti vkládá rovnou
 * do databáze, odeslání formulářů na webu prověřují testy veřejného webu
 * níž a validaci server action scripts/test-inquiry-action.mjs.
 */
async function testPoptavky(page, credentials) {
  if (!credentials.databaseUrl) {
    throw new Error("Chybí DATABASE_URL. Spusťte npm run db:local.");
  }
  const sql = postgres(credentials.databaseUrl, { max: 1, onnotice: () => {} });
  const stamp = Date.now();
  const name = `E2E Poptávka ${stamp}`;
  const email = `e2e-${stamp}@test.local`;
  const rowLink = () => page.getByRole("link", { name: new RegExp(name) });
  let id;

  try {
    [{ id }] = await sql`
      insert into inquiries (kind, licence, about_pilot, package_slug, travel_date,
        pilot_count, companions, name, email, phone, referral_source, message,
        consent, consent_at)
      values ('inquiry', 'PPL', ${"Nalétáno 120 hodin.\nLétám C172."}, 'grand-tour',
        'březen 2027', '2', 'Ano', ${name}, ${email}, '+420 602 000 111',
        'Z vyhledávače', 'Testovací zpráva pro e2e', true, now())
      returning id`;

    await login(page, credentials);

    // Přehled: poptávka je mezi posledními.
    await page.getByRole("region", { name: "Poslední poptávky" }).getByRole("link", { name: new RegExp(name) }).waitFor();

    // Seznam: filtr Nové, poptávka v něm, odkaz na detail.
    await page.getByRole("link", { name: "Poptávky", exact: true }).first().click();
    await page.getByRole("heading", { level: 1, name: "Poptávky" }).waitFor();
    // Upozornění na e-maily bez názvů proměnných prostředí (úprava 48).
    const pageText = await page.locator("main").innerText();
    assert(!/RESEND_|NOTIFY_TO/.test(pageText), "Poptávky ukazují názvy proměnných prostředí.");
    if (pageText.includes("E-maily o nových poptávkách")) {
      await page.getByText("E-maily o nových poptávkách zatím nechodí, Radek je zapne.").waitFor();
    }
    const filters = page.getByRole("navigation", { name: "Filtr podle stavu" });
    await filters.getByRole("link", { name: /^Nové \d+$/ }).click();
    await page.waitForURL(`${BASE_URL}/admin/poptavky?stav=new`);
    await rowLink().click();
    await page.waitForURL(`${BASE_URL}/admin/poptavky/${id}`);

    // Detail: všechna pole a odkazy na e-mail a telefon.
    await page.getByRole("heading", { level: 1, name }).waitFor();
    const mailHref = await page.getByRole("link", { name: email }).getAttribute("href");
    assert(mailHref === `mailto:${email}`, `Odkaz na e-mail: "${mailHref}"`);
    const telHref = await page.getByRole("link", { name: "+420 602 000 111" }).getAttribute("href");
    assert(telHref === "tel:+420602000111", `Odkaz na telefon: "${telHref}"`);
    for (const text of [
      "Florida Grand Tour & Fly",
      "březen 2027",
      "PPL",
      "Z vyhledávače",
      "Testovací zpráva pro e2e",
      "Nalétáno 120 hodin.",
    ]) {
      await page.getByText(text).first().waitFor();
    }

    // Změna stavu.
    const statusGroup = page.getByRole("group", { name: "Stav poptávky" });
    await statusGroup.getByRole("button", { name: "Rozpracovaná", exact: true }).click();
    await page.getByText("Stav změněn: Rozpracovaná").waitFor();
    await statusGroup.getByRole("button", { name: "Rozpracovaná", pressed: true }).waitFor();
    const [afterStatus] = await sql`select status from inquiries where id = ${id}`;
    assert(afterStatus.status === "in_progress", `Stav v databázi: ${afterStatus.status}`);

    // Interní poznámka přežije znovunačtení stránky.
    const noteText = "Zavolat v pondělí, chce letět se synem.";
    await page.getByLabel("Interní poznámka").fill(noteText);
    await page.getByRole("button", { name: "Uložit poznámku" }).click();
    await page.getByText("Poznámka uložená").waitFor();
    await page.reload();
    const savedNote = await page.getByLabel("Interní poznámka").inputValue();
    assert(savedNote === noteText, `Poznámka po načtení: "${savedNote}"`);
    const [afterNote] = await sql`select internal_note from inquiries where id = ${id}`;
    assert(afterNote.internal_note === noteText, "Poznámka není v databázi.");

    // Filtr podle stavu: je mezi rozpracovanými, mezi novými už ne.
    await page.goto(`${BASE_URL}/admin/poptavky?stav=in_progress`);
    await rowLink().waitFor();
    await page.goto(`${BASE_URL}/admin/poptavky?stav=new`);
    assert((await rowLink().count()) === 0, "Rozpracovaná poptávka je pořád mezi novými.");

    // Archivace: zmizí z výchozího seznamu, zůstane v archivu.
    await page.goto(`${BASE_URL}/admin/poptavky/${id}`);
    // Stav archived má od 14. 10. 2026 popisek „Archiv“ jako filtr (úprava 55).
    await statusGroup.getByRole("button", { name: "Archiv", exact: true }).click();
    await page.getByText("Stav změněn: Archiv").waitFor();
    await page.goto(`${BASE_URL}/admin/poptavky`);
    assert((await rowLink().count()) === 0, "Archivovaná poptávka je ve výchozím seznamu.");
    await page.goto(`${BASE_URL}/admin/poptavky?stav=archived`);
    await rowLink().click();
    await page.waitForURL(`${BASE_URL}/admin/poptavky/${id}`);

    // Trvalé smazání až po potvrzení v dialogu.
    await page.getByRole("button", { name: "Smazat trvale" }).click();
    const dialog = page.getByRole("dialog", { name: "Smazat poptávku trvale?" });
    await dialog.getByRole("button", { name: "Zrušit" }).click();
    await dialog.waitFor({ state: "hidden" });
    const [kept] = await sql`select count(*)::int as n from inquiries where id = ${id}`;
    assert(kept.n === 1, "Poptávka zmizela bez potvrzení.");
    await page.getByRole("button", { name: "Smazat trvale" }).click();
    await dialog.getByRole("button", { name: "Smazat", exact: true }).click();
    await page.waitForURL(/\/admin\/poptavky(\?.*)?$/);
    await page.getByText("Smazáno").waitFor();
    const [gone] = await sql`select count(*)::int as n from inquiries where id = ${id}`;
    assert(gone.n === 0, "Poptávka po smazání zůstala v databázi.");

    // Neexistující a neplatné id skončí na stránce Nenalezeno.
    for (const missing of [id, "neni-uuid"]) {
      await page.goto(`${BASE_URL}/admin/poptavky/${missing}`);
      await page.getByRole("heading", { level: 1, name: "Nenalezeno" }).waitFor();
    }
  } finally {
    if (id) await sql`delete from inquiries where id = ${id}`;
    await sql.end();
  }
}

test("poptávky v administraci", testPoptavky);

/** Je článek vidět na webu? Detail, seznam Z cest a mapa webu. */
async function publicPost(slug) {
  const article = await fetchManual(`/z-cest/${slug}`);
  const list = await (await fetch(`${BASE_URL}/z-cest`)).text();
  const sitemap = await (await fetch(`${BASE_URL}/sitemap.xml`)).text();
  return {
    status: article.status,
    inList: list.includes(`href="/z-cest/${slug}"`),
    inSitemap: sitemap.includes(`/z-cest/${slug}</loc>`),
  };
}

function assertHidden(state, when) {
  assert(
    state.status === 404 && !state.inList && !state.inSitemap,
    `${when}: článek je na webu vidět (${JSON.stringify(state)}).`,
  );
}

/**
 * Články (Z cest) v administraci: koncept, úprava, publikace, kontrola
 * v seznamu, vrácení do konceptů a smazání, u každého kroku i to, co je
 * vidět na webu (detail, /z-cest, sitemap.xml). Bez nahrávání fotek, lokálně úložiště
 * nastavené není. Předpokládá přihlášeného admina. S databaseUrl po sobě
 * článek uklidí, i když test spadne uprostřed.
 */
async function testDenik(page, { databaseUrl } = {}) {
  const stamp = Date.now().toString(36);
  const title = `E2E článek ${stamp}`;
  const edited = `${title} upravený`;
  const slug = `e2e-clanek-${stamp}`;
  const editor = page.getByRole("textbox", { name: "Text článku" });
  const titleField = page.getByLabel("Název", { exact: true });
  const isAction = (response) =>
    response.request().method() === "POST" && "next-action" in response.request().headers();

  try {
    // Karta Koncepty na přehledu vede na seznam s filtrem konceptů.
    await page.goto(`${BASE_URL}/admin`);
    await page.getByRole("link", { name: /Koncepty$/ }).click();
    await page.waitForURL(`${BASE_URL}/admin/posts?stav=draft`);
    await page.getByRole("button", { name: /^Koncepty/, pressed: true }).waitFor();
    // Archivace článků není, filtr Archivované je skrytý (úprava 55).
    assert(
      (await page.getByRole("button", { name: /^Archivované/ }).count()) === 0,
      "Filtr Archivované u článků pořád je.",
    );
    assert(
      (await page.locator("tbody tr").filter({ hasText: "Publikováno" }).count()) === 0,
      "Filtr konceptů ukazuje publikovaný článek.",
    );

    // Nový koncept.
    await page.goto(`${BASE_URL}/admin/posts`);
    await page.getByRole("heading", { level: 1, name: "Z cest" }).waitFor();
    await page.getByRole("link", { name: "Nový článek" }).click();
    await page.waitForURL(`${BASE_URL}/admin/posts/new`);
    // Editor se vykreslí až po hydrataci, do té doby by React vyplněný
    // název přepsal.
    await editor.waitFor();
    await titleField.fill(title);
    const generatedSlug = await page.getByLabel("Adresa článku").inputValue();
    assert(generatedSlug === slug, `Adresa z názvu: "${generatedSlug}"`);
    await editor.click();
    await page.keyboard.type("První odstavec z e2e testu.");
    await page.getByRole("button", { name: "Uložit koncept" }).click();
    await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{36}\/edit/);
    await page.getByRole("heading", { level: 1, name: "Upravit článek" }).waitFor();
    await page.getByText("Koncept uložen").waitFor();
    const editUrl = page.url().replace(/\?.*$/, "");
    assertHidden(await publicPost(slug), "Koncept");

    // Úprava konceptu: název i text, adresa zůstává.
    await titleField.fill(edited);
    // Klik doprostřed jednořádkového odstavce = kurzor za poslední slovo
    // (klávesa End na macOS kurzor neposune).
    await editor.locator("p").first().click();
    await page.keyboard.type(" Doplněná věta.");
    await Promise.all([
      page.waitForResponse(isAction),
      page.getByRole("button", { name: "Uložit koncept" }).click(),
    ]);
    // Přesměrování po uložení nechat doběhnout, goto by ho přerušilo.
    await page.waitForLoadState("networkidle");
    await page.goto(editUrl);
    assert((await titleField.inputValue()) === edited, "Upravený název se neuložil.");
    assert(
      (await page.getByLabel("Adresa článku").inputValue()) === slug,
      "Adresa se po změně názvu změnila.",
    );
    await editor.getByText("Doplněná věta.").waitFor();

    // Publikace vede na seznam, článek je publikovaný. Hláška má odkaz na
    // článek na webu (úprava 55).
    await page.getByRole("button", { name: "Publikovat" }).click();
    await page.waitForURL(/\/admin\/posts(\?.*)?$/);
    const toastItem = page.locator("[data-sonner-toast]").filter({ hasText: "Článek publikován" });
    await toastItem.waitFor();
    const viewHref = await toastItem.getByRole("link", { name: "Zobrazit na webu" }).getAttribute("href");
    assert(viewHref === `/z-cest/${slug}`, `Odkaz v hlášce po publikaci: "${viewHref}"`);
    const row = page.getByRole("row").filter({ hasText: edited });
    await row.getByText("Publikováno").waitFor();
    await row.getByText(`/z-cest/${slug}`).waitFor();

    // Publikovaný článek je hned na webu: detail, seznam Z cest a mapa webu.
    const published = await publicPost(slug);
    assert(
      published.status === 200 && published.inList && published.inSitemap,
      `Publikovaný článek na webu: ${JSON.stringify(published)}`,
    );

    // Publikovaný článek: Uložit změny, ne Publikovat. Stažení z webu je
    // až na konci formuláře u mazání (úprava 47), v liště jen Uložit změny.
    await row.getByRole("link", { name: edited, exact: true }).click();
    await page.waitForURL(editUrl);
    await page.getByRole("button", { name: "Uložit změny" }).waitFor();
    assert(
      (await page.getByRole("button", { name: "Vrátit do konceptů" }).count()) === 0,
      "Tlačítko Vrátit do konceptů pořád existuje.",
    );
    await page.getByRole("link", { name: "Zpět na články" }).waitFor();

    // Stažení z webu článek z webu zase stáhne.
    await page.getByRole("button", { name: "Stáhnout z webu" }).click();
    await page.getByText("Článek stažen z webu").waitFor();
    await page.getByRole("button", { name: "Publikovat" }).waitFor();
    assertHidden(await publicPost(slug), "Po stažení z webu");

    // Smazání až po potvrzení v dialogu. Nadpis dialogu je h2 (úprava 56).
    await page.getByRole("button", { name: "Smazat článek" }).click();
    const dialog = page.getByRole("dialog", { name: "Smazat článek?" });
    await dialog.getByRole("heading", { level: 2, name: "Smazat článek?" }).waitFor();
    await dialog.getByRole("button", { name: "Smazat", exact: true }).click();
    await page.waitForURL(/\/admin\/posts(\?.*)?$/);
    await page.getByText("Článek smazán").waitFor();
    assert(
      (await page.getByRole("row").filter({ hasText: edited }).count()) === 0,
      "Smazaný článek je pořád v seznamu.",
    );
  } finally {
    if (databaseUrl) {
      const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
      try {
        await sql`delete from posts where slug = ${slug}`;
      } finally {
        await sql.end();
      }
    }
  }
}

test("články Z cest v administraci", async (page, credentials) => {
  await login(page, credentials);
  await testDenik(page, credentials);
});

/**
 * Přihlášení vyprší uprostřed psaní (odhlášení v jiné záložce, smazané
 * cookies): uložení vrátí hlášku a rozepsaný text zůstane v editoru.
 */
test("vypršelé přihlášení neztratí rozepsaný článek", async (page, credentials) => {
  const stamp = Date.now().toString(36);
  const title = `E2E vypršelé přihlášení ${stamp}`;
  const text = "Text, který se nesmí ztratit.";
  const editor = page.getByRole("textbox", { name: "Text článku" });

  try {
    await login(page, credentials);
    await page.goto(`${BASE_URL}/admin/posts/new`);
    await editor.waitFor();
    await page.getByLabel("Název", { exact: true }).fill(title);
    await editor.click();
    await page.keyboard.type(text);

    await page.context().clearCookies();
    await page.getByRole("button", { name: "Uložit koncept" }).click();
    await page.getByRole("alert").filter({ hasText: "Přihlášení vypršelo." }).waitFor();
    await editor.getByText(text).waitFor();

    // Přihlášení v nové záložce a uložení stejného formuláře.
    const second = await page.context().newPage();
    await login(second, credentials);
    await second.close();
    await page.getByRole("button", { name: "Uložit koncept" }).click();
    await page.getByText("Koncept uložen").waitFor();
    // Hláška z adresy zmizí až po dokončení navigace (ToastOnParam).
    await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{36}\/edit$/);
    await editor.getByText(text).waitFor();
  } finally {
    if (credentials.databaseUrl) {
      const sql = postgres(credentials.databaseUrl, { max: 1, onnotice: () => {} });
      try {
        await sql`delete from posts where title = ${title}`;
      } finally {
        await sql.end();
      }
    }
  }
});

/** Po změně hesla (vyšší session_version) přestane dřívější přihlášení platit. */
test("změna hesla odhlásí přihlášená zařízení", async (page, credentials) => {
  if (!credentials.databaseUrl) throw new Error("Chybí DATABASE_URL. Spusťte npm run db:local.");
  await login(page, credentials);
  const sql = postgres(credentials.databaseUrl, { max: 1, onnotice: () => {} });
  try {
    // Totéž dělá scripts/create-admin.mjs při změně hesla.
    await sql`update admin_users set session_version = session_version + 1
      where email = ${credentials.email}`;
  } finally {
    await sql.end();
  }
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForURL(`${BASE_URL}/admin/login`);
  await login(page, credentials);
});

/** Po 10 špatných heslech z jedné adresy se přihlášení na 15 minut zablokuje. */
test("omezení pokusů o přihlášení", async (page, credentials) => {
  if (!credentials.databaseUrl) throw new Error("Chybí DATABASE_URL. Spusťte npm run db:local.");
  const sql = postgres(credentials.databaseUrl, { max: 1, onnotice: () => {} });
  const button = page.getByRole("button", { name: "Přihlásit se" });
  const submit = async (password) => {
    await page.getByLabel("Heslo").fill(password);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
      button.click(),
    ]);
    // Během požadavku má tlačítko text Přihlašuji..., hláška je hotová,
    // až když se vrátí.
    await button.waitFor();
    // Formulář, ne oznamovač navigace z Next (taky role alert).
    return (await page.locator("form").getByRole("alert").innerText()).trim();
  };

  try {
    await sql`delete from login_attempts`;
    await page.goto(`${BASE_URL}/admin/login`);
    await page.getByLabel("E-mail").fill(credentials.email);
    for (let i = 1; i <= 10; i++) {
      const message = await submit(`spatne-heslo-${i}`);
      assert(message === "Nesprávný e-mail nebo heslo.", `Pokus ${i}: "${message}"`);
    }
    // Jedenáctý pokus neprojde ani se správným heslem.
    const blocked = await submit(credentials.password);
    assert(blocked.startsWith("Příliš mnoho neúspěšných pokusů"), `Po 10 pokusech: "${blocked}"`);
    assert(page.url() === `${BASE_URL}/admin/login`, "Zablokované přihlášení prošlo.");

    // Po vypršení okna (tady smazání záznamů) přihlášení funguje a pokusy vynuluje.
    await sql`delete from login_attempts`;
    await submit("spatne-heslo");
    await login(page, credentials);
    const [{ n }] = await sql`select count(*)::int as n from login_attempts`;
    assert(n === 0, `Po úspěšném přihlášení zůstalo ${n} pokusů.`);
  } finally {
    await sql`delete from login_attempts`;
    await sql.end();
  }
});

/** Administrace na šířce telefonu nepřetéká do strany (tabulka článků, galerie). */
test("administrace na telefonu", async (page, credentials) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, credentials);
  const overflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  for (const url of ["/admin", "/admin/posts", "/admin/poptavky"]) {
    await page.goto(`${BASE_URL}${url}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    const px = await overflow();
    assert(px <= 0, `${url} přetéká o ${px} px.`);
  }

  // Ukázkový článek z scripts/local-db.mjs má galerii se dvěma fotkami.
  await page.goto(`${BASE_URL}/admin/posts`);
  await page.getByRole("link", { name: "Ukázkový článek s galerií", exact: true }).click();
  await page.getByRole("heading", { level: 3, name: "Galerie 1" }).waitFor();
  const px = await overflow();
  assert(px <= 0, `Úprava článku s galerií přetéká o ${px} px.`);
});

// ---------------------------------------------------------------------------
// Ochrana rozepsaného textu a editor (úpravy 10, 33, 44 až 56 z auditu
// 13. 10. 2026, rozhodnutí 14. 10. 2026)
// ---------------------------------------------------------------------------

const editorBox = (page) => page.getByRole("textbox", { name: "Text článku" });
const titleBox = (page) => page.getByLabel("Název", { exact: true });
const unsaved = (page) => page.getByRole("status").filter({ hasText: "Neuložené změny" });
const NEW_BACKUP = "fa-admin-clanek:new";
const backupKeys = (page) =>
  page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("fa-admin-clanek:")));

/** Testovací článek rovnou v databázi (rychlejší než přes formulář). Vrátí id. */
async function insertPost(sql, { slug, title, content, gallery = [], status = "draft", image = null }) {
  const [{ id }] = await sql`
    insert into posts (slug, title, content, gallery, status, published_at,
      image_url, image_width, image_height)
    values (${slug}, ${title}, ${content}, ${JSON.stringify(gallery)}::jsonb, ${status},
      ${status === "published" ? new Date() : null},
      ${image}, ${image ? 1600 : null}, ${image ? 900 : null})
    returning id`;
  return id;
}

/** Testovací poptávka rovnou v databázi. Vrátí id. */
async function insertInquiry(sql, name) {
  const [{ id }] = await sql`
    insert into inquiries (kind, licence, package_slug, travel_date, pilot_count,
      companions, name, email, phone, referral_source, message, consent, consent_at)
    values ('inquiry', 'PPL', 'grand-tour', 'březen 2027', '2', 'Ano', ${name},
      'e2e-telefon@test.local', '+420 602 000 222', 'Z vyhledávače',
      'Testovací zpráva', true, now())
    returning id`;
  return id;
}

const sampleGallery = (id) => [
  {
    id,
    items: [
      {
        path: "e2e/galerie-1.png",
        url: "https://placehold.co/1200x800/png?text=E2E+1",
        width: 1200,
        height: 800,
        caption: "První testovací fotka",
      },
      {
        path: "e2e/galerie-2.png",
        url: "https://placehold.co/800x1200/png?text=E2E+2",
        width: 800,
        height: 1200,
        caption: "Druhá testovací fotka",
      },
    ],
  },
];

/**
 * Výpadek sítě při uložení (úprava 10): místo chybové stránky hláška
 * v liště a text zůstane ve formuláři, po obnovení spojení jde uložit.
 * Totéž u interní poznámky poptávky. Smazání poptávky při výpadku skončí
 * chybovou stránkou administrace s kontaktem na Radka (R11).
 */
test("výpadek sítě při uložení nechá text a ukáže hlášku", async (page, credentials) => {
  const sql = database(credentials);
  const stamp = Date.now().toString(36);
  const title = `E2E výpadek sítě ${stamp}`;
  const text = "Odstavec napsaný na hotelové Wi-Fi.";
  let inquiryId;
  try {
    await login(page, credentials);
    await page.goto(`${BASE_URL}/admin/posts/new`);
    await editorBox(page).waitFor();
    await titleBox(page).fill(title);
    await editorBox(page).click();
    await page.keyboard.type(text);

    await page.context().setOffline(true);
    await page.getByRole("button", { name: "Uložit koncept" }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Článek se nepodařilo uložit. Zkontrolujte připojení a zkuste to znovu, text zůstává tady." })
      .waitFor();
    await page.getByRole("heading", { level: 1, name: "Nový článek" }).waitFor();
    await editorBox(page).getByText(text).waitFor();
    assert((await titleBox(page).inputValue()) === title, "Název po výpadku sítě zmizel.");
    await unsaved(page).waitFor();

    // Po obnovení spojení se stejný formulář uloží a záloha zmizí.
    await page.context().setOffline(false);
    await page.getByRole("button", { name: "Uložit koncept" }).click();
    await page.getByText("Koncept uložen").waitFor();
    await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{36}\/edit$/);
    await editorBox(page).getByText(text).waitFor();
    assert(!(await backupKeys(page)).includes(NEW_BACKUP), "Záloha nového článku po uložení zůstala.");

    // Interní poznámka poptávky.
    inquiryId = await insertInquiry(sql, `E2E výpadek ${stamp}`);
    await page.goto(`${BASE_URL}/admin/poptavky/${inquiryId}`);
    const note = page.getByLabel("Interní poznámka");
    await note.fill("Poznámka psaná bez signálu.");
    await unsaved(page).waitFor();
    await page.context().setOffline(true);
    await page.getByRole("button", { name: "Uložit poznámku" }).click();
    await page.getByRole("alert").filter({ hasText: "Poznámku se nepodařilo uložit." }).waitFor();
    assert((await note.inputValue()) === "Poznámka psaná bez signálu.", "Poznámka po výpadku sítě zmizela.");
    await page.context().setOffline(false);
    await page.getByRole("button", { name: "Uložit poznámku" }).click();
    await page.getByText("Poznámka uložená").waitFor();
    const [saved] = await sql`select internal_note from inquiries where id = ${inquiryId}`;
    assert(saved.internal_note === "Poznámka psaná bez signálu.", "Poznámka se po obnovení spojení neuložila.");

    // Chybová stránka administrace má kontakt na Radka. Vyvolá ji smazání
    // poptávky bez spojení (jiná cesta k chybě stránky lokálně není).
    await page.getByRole("button", { name: "Smazat trvale" }).click();
    await page.context().setOffline(true);
    await page.getByRole("dialog", { name: "Smazat poptávku trvale?" }).getByRole("button", { name: "Smazat", exact: true }).click();
    await page.getByRole("heading", { level: 1, name: "Něco se pokazilo" }).waitFor();
    const help = await page.getByRole("link", { name: "radek.bitala@gmail.com" }).getAttribute("href");
    assert(help === "mailto:radek.bitala@gmail.com", `Chybová stránka: odkaz na Radka "${help}"`);
    await page.context().setOffline(false);
  } finally {
    await page.context().setOffline(false);
    await sql`delete from posts where title = ${title}`;
    if (inquiryId) await sql`delete from inquiries where id = ${inquiryId}`;
    await sql.end();
  }
});

/**
 * Neuložené změny (úprava 10): ukazatel v liště, dotaz před odchodem
 * odkazem v administraci (menu, drobečky, Odhlásit) a při zavření okna.
 */
test("neuložené změny a dotaz při odchodu", async (page, credentials) => {
  const sql = database(credentials);
  const stamp = Date.now().toString(36);
  const slug = `e2e-odchod-${stamp}`;
  let inquiryId;
  try {
    const id = await insertPost(sql, { slug, title: `E2E odchod ${stamp}`, content: "<p>Uložený text.</p>" });
    await login(page, credentials);
    const editUrl = `${BASE_URL}/admin/posts/${id}/edit`;
    await page.goto(editUrl);
    await editorBox(page).waitFor();
    assert((await unsaved(page).count()) === 0, "Neuložené změny hned po otevření článku.");

    await editorBox(page).locator("p").first().click();
    await page.keyboard.type(" Dopsaná věta.");
    await unsaved(page).waitFor();

    // Menu: Zůstat nechá formulář i text.
    const leave = page.getByRole("dialog", { name: "Odejít bez uložení?" });
    await page.getByRole("navigation", { name: "Administrace" }).getByRole("link", { name: "Přehled", exact: true }).click();
    await leave.waitFor();
    await leave.getByRole("button", { name: "Zůstat" }).click();
    await leave.waitFor({ state: "hidden" });
    assert(page.url() === editUrl, `Po Zůstat jiná stránka: ${page.url()}`);
    await editorBox(page).getByText("Dopsaná věta.").waitFor();

    // Odhlášení je taky odchod.
    await page.getByRole("button", { name: "Odhlásit" }).click();
    await leave.waitFor();
    await leave.getByRole("button", { name: "Zůstat" }).click();
    await leave.waitFor({ state: "hidden" });
    assert(page.url() === editUrl, "Odhlášení prošlo bez dotazu.");

    // Zavření okna: dotaz prohlížeče (beforeunload). Zrušení nechá stránku otevřenou.
    const unload = page.waitForEvent("dialog");
    await page.close({ runBeforeUnload: true });
    const dialog = await unload;
    assert(dialog.type() === "beforeunload", `Při zavření okna dialog typu ${dialog.type()}.`);
    await dialog.dismiss();
    assert(!page.isClosed(), "Okno se zavřelo i přes neuložené změny.");

    // Drobečky: Odejít bez uložení opravdu odejde.
    await page.getByRole("navigation", { name: "Drobečková navigace" }).getByRole("link", { name: "Z cest" }).click();
    await leave.waitFor();
    await leave.getByRole("button", { name: "Odejít bez uložení" }).click();
    await page.waitForURL(`${BASE_URL}/admin/posts`);
    const [row] = await sql`select content from posts where id = ${id}`;
    assert(!row.content.includes("Dopsaná věta."), "Odchod bez uložení článek uložil.");

    // Bez změn se odchází bez dotazu.
    await page.goto(editUrl);
    await editorBox(page).waitFor();
    await page.getByRole("link", { name: "Zpět na články" }).click();
    await page.waitForURL(`${BASE_URL}/admin/posts`);

    // Interní poznámka poptávky.
    inquiryId = await insertInquiry(sql, `E2E odchod ${stamp}`);
    await page.goto(`${BASE_URL}/admin/poptavky/${inquiryId}`);
    await page.getByLabel("Interní poznámka").fill("Rozepsaná poznámka.");
    await unsaved(page).waitFor();
    await page.getByRole("link", { name: "Zpět na poptávky" }).click();
    await leave.waitFor();
    await leave.getByRole("button", { name: "Zůstat" }).click();
    assert((await page.getByLabel("Interní poznámka").inputValue()) === "Rozepsaná poznámka.", "Poznámka po Zůstat zmizela.");
  } finally {
    await sql`delete from posts where slug = ${slug}`;
    if (inquiryId) await sql`delete from inquiries where id = ${inquiryId}`;
    await sql.end();
  }
});

/** Záloha rozepsaného článku v prohlížeči a nabídka obnovy (úprava 10). */
test("obnova zálohy rozepsaného článku", async (page, credentials) => {
  const sql = database(credentials);
  const stamp = Date.now().toString(36);
  const title = `E2E záloha ${stamp}`;
  const text = "Text, který přežije zavření panelu.";
  try {
    await login(page, credentials);
    await page.goto(`${BASE_URL}/admin/posts/new`);
    await editorBox(page).waitFor();
    await page.evaluate((key) => localStorage.removeItem(key), NEW_BACKUP);
    await titleBox(page).fill(title);
    await editorBox(page).click();
    await page.keyboard.type(text);
    await page.waitForFunction((key) => localStorage.getItem(key)?.includes("přežije"), NEW_BACKUP);

    // Obnovení stránky (beforeunload bez posluchače Playwright potvrdí).
    await page.reload();
    await editorBox(page).waitFor();
    const offer = page.getByText(/^Máte neuloženou verzi z \d{1,2}:\d{2}\. Obnovit\?$/);
    await offer.waitFor();
    assert((await titleBox(page).inputValue()) === "", "Formulář se obnovil bez zeptání.");
    await page.getByRole("button", { name: "Obnovit", exact: true }).click();
    await offer.waitFor({ state: "hidden" });
    assert((await titleBox(page).inputValue()) === title, "Obnova nevrátila název.");
    await editorBox(page).getByText(text).waitFor();
    await unsaved(page).waitFor();

    // Po uložení záloha zmizí a při dalším otevření se nenabízí.
    await page.getByRole("button", { name: "Uložit koncept" }).click();
    await page.getByText("Koncept uložen").waitFor();
    await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{36}\/edit$/);
    assert((await backupKeys(page)).length === 0, `Po uložení zůstala záloha: ${await backupKeys(page)}`);
    await page.reload();
    await editorBox(page).getByText(text).waitFor();
    assert((await page.getByText("Máte neuloženou verzi").count()) === 0, "Po uložení se nabízí záloha.");

    // Zahodit zálohu smaže.
    await editorBox(page).locator("p").first().click();
    await page.keyboard.type(" Navíc.");
    const key = `fa-admin-clanek:${page.url().match(/posts\/([0-9a-f-]{36})/)[1]}`;
    await page.waitForFunction((k) => localStorage.getItem(k)?.includes("Navíc"), key);
    await page.reload();
    await page.getByRole("button", { name: "Zahodit" }).click();
    assert(!(await backupKeys(page)).includes(key), "Zahozená záloha zůstala.");
    assert((await editorBox(page).getByText("Navíc").count()) === 0, "Zahozená záloha se obnovila.");
  } finally {
    await sql`delete from posts where title = ${title}`;
    await sql.end();
  }
});

/**
 * Galerie mimo text (úprava 10): publikace se zeptá a galerii vloží na
 * konec článku. Nová galerie se po nahrání fotek vloží do textu sama.
 * Odebranou fotku jde vrátit (úprava 47).
 *
 * Lokálně není úložiště fotek a formulář má nahrávání vypnuté. Pro
 * nahrání test přepíše v odpovědi serveru (RSC při přechodu na stránku
 * odkazem) uploadsEnabled na true a podvrhne odpověď /api/admin/upload
 * s adresou z placehold.co (při vývoji povolená). Zmenšení fotky
 * v prohlížeči i vložení galerie běží skutečně. Při zapnutém nahrávání
 * ověří i titulní fotku (tlačítko, nápověda k HEIC, odebrání a Vrátit)
 * a sekci Video pod článkem (úpravy 45, 47, 50 a 54).
 */
test("galerie mimo text se při publikaci zeptá, nová galerie jde do textu", async (page, credentials) => {
  const sql = database(credentials);
  const stamp = Date.now().toString(36);
  const slug = `e2e-galerie-${stamp}`;
  const title = `E2E galerie ${stamp}`;
  try {
    const id = await insertPost(sql, {
      slug,
      title,
      content: "<p>Text článku s galerií mimo text.</p>",
      gallery: sampleGallery("g-e2e-mimo"),
    });
    await login(page, credentials);
    const editUrl = `${BASE_URL}/admin/posts/${id}/edit`;

    // Nahrávání zapnuté jen v tomto testu (viz komentář nad testem).
    await page.route(
      (url) => url.pathname === `/admin/posts/${id}/edit`,
      async (route) => {
        const request = route.request();
        if (request.method() !== "GET" || !request.headers().rsc) return route.continue();
        const response = await route.fetch();
        const body = (await response.text()).replaceAll('"uploadsEnabled":false', '"uploadsEnabled":true ');
        await route.fulfill({ response, body });
      },
    );
    await page.route(`${BASE_URL}/api/admin/upload`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://placehold.co/1200x800/png?text=E2E+nahrana", path: "e2e/nahrana.png" }),
      }),
    );
    await page.goto(`${BASE_URL}/admin/posts`);
    await page.getByRole("link", { name: title, exact: true }).click();
    await page.waitForURL(editUrl);
    await editorBox(page).waitFor();

    const gallery1 = page.getByRole("region", { name: "Galerie 1" });
    await gallery1.getByText("Není v textu").waitFor();
    await gallery1.getByRole("button", { name: "Vložit na místo kurzoru" }).waitFor();

    // Video pod článkem má vlastní sekci s nápovědou (úprava 54).
    const video = page.getByRole("group", { name: "Video pod článkem" });
    await video.getByLabel("Video z YouTube (nepovinné)").waitFor();
    await video.getByText("Ukáže se pod textem. Video doprostřed textu vložíte tlačítkem v liště editoru.").waitFor();

    // Titulní fotka (úpravy 45, 47 a 50): tlačítko pro počítač i telefon,
    // nápověda k HEIC, „Popisek fotky“ a odebranou fotku jde vrátit i s popiskem.
    const hero = page.getByRole("group", { name: "Titulní fotka" });
    await hero.getByText("Fotky ve formátu HEIC uložte jako JPEG.").waitFor();
    const heroChooser = page.waitForEvent("filechooser");
    await hero.getByRole("button", { name: "Nahrát fotku z počítače nebo telefonu" }).click();
    await (await heroChooser).setFiles(path.join(ROOT, "public/img/cedar-key-letecky.jpg"));
    const heroAlt = hero.getByLabel("Popisek fotky", { exact: true });
    await heroAlt.fill("Testovací titulní fotka");
    await hero.getByText("Zobrazí se pod fotkou na webu a přečtou ho i nevidomí.", { exact: false }).waitFor();
    await hero.getByRole("button", { name: "Odebrat" }).click();
    await heroAlt.waitFor({ state: "detached" });
    await page.locator("[data-sonner-toast]").filter({ hasText: "Fotka odebrána" }).getByRole("button", { name: "Vrátit" }).click();
    await heroAlt.waitFor();
    assert((await heroAlt.inputValue()) === "Testovací titulní fotka", "Po vrácení titulní fotky zmizel popisek.");
    await hero.getByRole("button", { name: "Vyměnit fotku" }).waitFor();
    await page.locator("[data-sonner-toast]").filter({ hasText: "Fotka odebrána" }).waitFor({ state: "detached" });

    // Odebraná fotka se vrátí na své místo.
    await gallery1.getByRole("button", { name: "Odebrat fotku 1" }).click();
    await gallery1.getByText("1 fotka").waitFor();
    await page.locator("[data-sonner-toast]").filter({ hasText: "Fotka odebrána" }).getByRole("button", { name: "Vrátit" }).click();
    await gallery1.getByText("2 fotky").waitFor();
    assert(
      (await gallery1.getByLabel("Popisek fotky 1 v galerii 1").inputValue()) === "První testovací fotka",
      "Vrácená fotka není na původním místě.",
    );

    // Nová galerie: po nahrání fotky je hned v textu. Galerie se číslují
    // podle pořadí v textu, nová je teď Galerie 1 a ta mimo text Galerie 2.
    await page.getByRole("button", { name: "Přidat galerii" }).click();
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("region", { name: "Galerie 2" })
      .getByRole("button", { name: "Nahrát fotky z počítače nebo telefonu" })
      .click();
    await (await chooser).setFiles(path.join(ROOT, "public/img/cedar-key-letecky.jpg"));
    const added = page.getByRole("region", { name: "Galerie 1" });
    await added.getByText("1 fotka").waitFor();
    await added.getByText("V textu").waitFor();
    await added.getByRole("button", { name: "Přesunout na místo kurzoru" }).waitFor();
    await editorBox(page).getByText("Galerie 1: 1 fotka").waitFor();
    await page.getByText("Galerie je vložená na konec textu.").waitFor();
    await page.getByRole("region", { name: "Galerie 2" }).getByText("Není v textu").waitFor();

    // Publikace s galerií mimo text se zeptá. Zpět k úpravám nic neuloží.
    const prompt = page.getByRole("dialog", { name: "Galerie 2 (2 fotky) není v textu" });
    await page.getByRole("button", { name: "Publikovat" }).click();
    await prompt.getByText("Na webu se neukáže. Vložit ji na konec článku?").waitFor();
    await prompt.getByRole("button", { name: "Zpět k úpravám" }).click();
    await prompt.waitFor({ state: "hidden" });
    const [draft] = await sql`select status from posts where id = ${id}`;
    assert(draft.status === "draft", "Zpět k úpravám článek publikoval.");

    await page.getByRole("button", { name: "Publikovat" }).click();
    await prompt.getByRole("button", { name: "Vložit a publikovat" }).click();
    await page.waitForURL(/\/admin\/posts(\?.*)?$/);
    await page.getByText("Článek publikován").first().waitFor();
    const [saved] = await sql`select status, content, gallery from posts where id = ${id}`;
    const markers = [...saved.content.matchAll(/data-gallery="([^"]+)"/g)].map((m) => m[1]);
    assert(saved.status === "published", `Stav po publikaci: ${saved.status}`);
    assert(markers.length === 2 && markers.includes("g-e2e-mimo"), `Značky galerií v textu: ${markers}`);
    assert(saved.gallery.length === 2 && saved.gallery.every((g) => markers.includes(g.id)), "Galerie a značky nesedí.");
    // Galerie vložená při publikaci je na konci textu.
    assert(markers.at(-1) === "g-e2e-mimo", `Galerie z dotazu není na konci textu: ${markers}`);
  } finally {
    await sql`delete from posts where slug = ${slug}`;
    await sql.end();
  }
});

/**
 * Po neúspěšném uložení posun a fokus na první chybné pole, v liště
 * klikací hláška a počet dalších chyb (úprava 44), „Popisek fotky“ místo
 * alt textu (úprava 45).
 */
test("chyba posune na pole a dá mu fokus", async (page, credentials) => {
  const sql = database(credentials);
  const stamp = Date.now().toString(36);
  const slug = `e2e-chyba-${stamp}`;
  try {
    const id = await insertPost(sql, {
      slug,
      title: `E2E chyba ${stamp}`,
      content: "<p>Text.</p>",
      image: "https://placehold.co/1600x900/png?text=E2E",
    });
    await login(page, credentials);
    await page.goto(`${BASE_URL}/admin/posts/${id}/edit`);
    await editorBox(page).waitFor();
    assert(!/alt text/i.test(await page.locator("main").innerText()), "Ve formuláři je slovo alt text.");
    await page.getByText("Zobrazí se pod fotkou na webu a přečtou ho i nevidomí.").waitFor();

    // Rok cesty mimo rozsah a chybějící popisek: první chyba je Rok cesty.
    await page.getByLabel("Rok cesty (nepovinné)").fill("1800");
    await page.getByRole("button", { name: "Uložit koncept" }).click();
    const bar = page.getByRole("alert").filter({ hasText: "Ještě 1 další chyba níž." });
    await bar.waitFor();
    await bar.getByRole("button", { name: /^Rok cesty musí být mezi 1950 a \d{4}\.$/ }).waitFor();
    await page.waitForFunction(() => document.activeElement?.id === "post-trip-year");

    // Jedna chyba: fokus na popisek fotky, pole je na obrazovce.
    await page.getByLabel("Rok cesty (nepovinné)").fill("");
    await page.getByRole("button", { name: "Uložit koncept" }).click();
    await page.getByRole("alert").getByRole("button", { name: "Chybí popisek titulní fotky." }).waitFor();
    await page.waitForFunction(() => document.activeElement?.id === "post-image-alt");
    const inView = await page.evaluate(() => {
      const rect = document.getElementById("post-image-alt").getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    assert(inView, "Pole Popisek fotky po chybě není na obrazovce.");

    // Klik na hlášku v liště vrátí fokus na pole.
    await editorBox(page).click();
    await page.getByRole("alert").getByRole("button", { name: "Chybí popisek titulní fotky." }).click();
    await page.waitForFunction(() => document.activeElement?.id === "post-image-alt");

    // Publikace bez textu: fokus do editoru.
    await page.getByLabel("Popisek fotky", { exact: true }).fill("Testovací titulní fotka");
    await editorBox(page).click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Backspace");
    await page.getByLabel("Název", { exact: true }).click();
    await page.getByRole("button", { name: "Publikovat" }).click();
    await page.getByRole("alert").getByRole("button", { name: "Před publikováním napište text článku." }).waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Text článku");
  } finally {
    await sql`delete from posts where slug = ${slug}`;
    await sql.end();
  }
});

/**
 * Značka [doplnit…] z podkladů (úprava 7, nález z kontroly 14. 10. 2026):
 * publikaci zablokuje hláška a fokus jde do textu, koncept s ní jde uložit.
 * Článek 2025 má v textu značku, dokud se nedoplní závěr.
 */
test("značka [doplnit] zablokuje publikaci, koncept jde uložit", async (page, credentials) => {
  const sql = database(credentials);
  const stamp = Date.now().toString(36);
  const slug = `e2e-doplnit-${stamp}`;
  try {
    const id = await insertPost(sql, {
      slug,
      title: `E2E doplnit ${stamp}`,
      content: "<p>Text článku. Neloučím se nadlouho - budu se moc [doplnit: závěr článku]</p>",
    });
    await login(page, credentials);
    await page.goto(`${BASE_URL}/admin/posts/${id}/edit`);
    await editorBox(page).waitFor();
    await page.getByRole("button", { name: "Publikovat" }).click();
    await page
      .getByRole("alert")
      .getByRole("button", { name: "Text obsahuje značku [doplnit…]. Před publikováním ji nahraďte textem, koncept jde uložit i s ní." })
      .waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Text článku");
    const [blocked] = await sql`select status from posts where id = ${id}`;
    assert(blocked.status === "draft", `Článek se značkou se publikoval: ${blocked.status}`);

    // Koncept se značkou jde uložit.
    await page.getByLabel("Název", { exact: true }).fill(`E2E doplnit ${stamp} koncept`);
    await page.getByRole("button", { name: "Uložit koncept" }).click();
    await page.getByText("Koncept uložen").first().waitFor();
    const [saved] = await sql`select title, status from posts where id = ${id}`;
    assert(saved.title.endsWith("koncept") && saved.status === "draft", `Koncept se značkou: ${JSON.stringify(saved)}`);
  } finally {
    await sql`delete from posts where slug = ${slug}`;
    await sql.end();
  }
});

/**
 * Rok cesty (úprava 33): výchozí rok v poli je rok ze štítku v názvu
 * („| 2017“), jinak rok publikace. Uložený rok ukáže web u článku.
 */
test("rok cesty se uloží a web ho u článku ukáže", async (page, credentials) => {
  const sql = database(credentials);
  const stamp = Date.now().toString(36);
  const title = `E2E rok cesty ${stamp}`;
  const slug = `e2e-rok-cesty-${stamp}`;
  try {
    await login(page, credentials);
    await page.goto(`${BASE_URL}/admin/posts/new`);
    await editorBox(page).waitFor();
    const year = page.getByLabel("Rok cesty (nepovinné)");
    await titleBox(page).fill(`${title} | 2017`);
    assert((await year.getAttribute("placeholder")) === "2017", "Výchozí rok cesty není rok ze štítku v názvu.");
    await titleBox(page).fill(title);
    const thisYear = String(new Date().getFullYear());
    assert((await year.getAttribute("placeholder")) === thisYear, "Výchozí rok cesty nového článku není letošní.");
    await year.fill("2019");
    await editorBox(page).click();
    await page.keyboard.type("Článek o cestě z roku 2019.");
    await page.getByRole("button", { name: "Publikovat" }).click();
    await page.waitForURL(/\/admin\/posts(\?.*)?$/);
    await page.getByText("Článek publikován").first().waitFor();

    const [saved] = await sql`select id, trip_year from posts where slug = ${slug}`;
    assert(saved?.trip_year === 2019, `Rok cesty v databázi: ${saved?.trip_year}`);

    // Web: nejnovější článek na /z-cest ukazuje rok cesty, ne rok publikace.
    await page.goto(`${BASE_URL}/z-cest`);
    const teaser = page.locator(".diary").filter({ has: page.locator(`a[href="/z-cest/${slug}"]`) }).first();
    const teaserText = await teaser.innerText();
    assert(teaserText.includes("2019") && !teaserText.includes(thisYear), `Web u článku neukazuje rok cesty: ${teaserText.slice(0, 200)}`);

    // Úprava roku a prázdné pole = výchozí rok.
    await page.goto(`${BASE_URL}/admin/posts/${saved.id}/edit`);
    await editorBox(page).waitFor();
    assert((await year.inputValue()) === "2019", "Rok cesty se v úpravách nenačetl.");
    await year.fill("");
    await page.getByRole("button", { name: "Uložit změny" }).click();
    await page.waitForURL(/\/admin\/posts(\?.*)?$/);
    const [cleared] = await sql`select trip_year from posts where slug = ${slug}`;
    assert(cleared.trip_year === null, `Prázdný rok cesty v databázi: ${cleared.trip_year}`);
  } finally {
    await sql`delete from posts where slug = ${slug}`;
    await sql.end();
  }
});

/**
 * Editor (úprava 46): odkaz bez označeného textu se zeptá i na text, video
 * mimo YouTube ukáže hlášku. Vlastní okno místo window.prompt.
 */
test("odkaz bez označení a video mimo YouTube nehlásí ticho", async (page, credentials) => {
  let prompts = 0;
  page.on("dialog", async (dialog) => {
    if (dialog.type() === "prompt") prompts++;
    await dialog.dismiss();
  });
  await login(page, credentials);
  await page.goto(`${BASE_URL}/admin/posts/new`);
  const editor = editorBox(page);
  await editor.waitFor();
  await editor.click();
  await page.keyboard.type("Více na ");

  const toolbar = page.getByRole("group", { name: "Formát textu" });
  await toolbar.getByRole("button", { name: "Odkaz", exact: true }).click();
  const linkDialog = page.getByRole("dialog", { name: "Vložit odkaz" });
  await linkDialog.getByLabel("Text odkazu").waitFor();
  await linkDialog.getByRole("button", { name: "Vložit odkaz" }).click();
  await linkDialog.getByRole("alert").filter({ hasText: "Napište text odkazu" }).waitFor();
  await linkDialog.getByLabel("Text odkazu").fill("webu letiště");
  await linkDialog.getByLabel("Adresa odkazu").fill("flyamerica.cz");
  await linkDialog.getByLabel("Adresa odkazu").press("Enter");
  await linkDialog.waitFor({ state: "hidden" });
  const link = editor.getByRole("link", { name: "webu letiště" });
  assert((await link.getAttribute("href")) === "https://flyamerica.cz", `Odkaz v textu: ${await link.getAttribute("href")}`);
  // Psaní za odkazem už odkaz neprodlužuje.
  await page.keyboard.type(" a dál.");
  assert((await link.innerText()) === "webu letiště", `Text odkazu po psaní: ${await link.innerText()}`);

  // Video: Vimeo neprojde, YouTube ano.
  await toolbar.getByRole("button", { name: "Video z YouTube do textu" }).click();
  const videoDialog = page.getByRole("dialog", { name: "Video z YouTube do textu" });
  await videoDialog.getByLabel("Odkaz na video").fill("https://vimeo.com/76979871");
  await videoDialog.getByRole("button", { name: "Vložit video" }).click();
  await videoDialog.getByRole("alert").filter({ hasText: "Tohle není odkaz na YouTube." }).waitFor();
  assert((await editor.locator("iframe").count()) === 0, "Vimeo se vložilo jako video.");
  await videoDialog.getByLabel("Odkaz na video").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await videoDialog.getByRole("button", { name: "Vložit video" }).click();
  await videoDialog.waitFor({ state: "hidden" });
  await editor.locator('iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]').waitFor({ state: "attached" });

  // Esc okno zavře bez vložení.
  await toolbar.getByRole("button", { name: "Video z YouTube do textu" }).click();
  await videoDialog.waitFor();
  await page.keyboard.press("Escape");
  await videoDialog.waitFor({ state: "hidden" });
  assert(prompts === 0, "Editor použil window.prompt.");
});

/**
 * Vložení z Wordu (úprava 52): tabulka jako řádky textu, H1 jako
 * Mezititulek, obrázek z jiného webu označený k nahrazení. Koncept jde
 * uložit, publikaci zablokuje hláška. HTML jako ve snímcích d31 a d32 auditu.
 */
test("vložení z Wordu a obrázek z jiného webu", async (page, credentials) => {
  const sql = database(credentials);
  const stamp = Date.now().toString(36);
  const title = `E2E Word ${stamp}`;
  const slug = `e2e-word-${stamp}`;
  const foreign = "https://www.flyamerica.cz/wp-content/uploads/2017/foto.jpg";
  const html = `<h1 style="font-family:Calibri">Přelet přes Atlantik</h1><p class=MsoNormal><span style="color:#C00000;font-size:14pt">Odlétali jsme </span><b>za úsvitu</b>.</p><table><tr><td>Den</td><td>Trasa</td></tr><tr><td>1</td><td>KISM - KJAX</td></tr></table><p><img src="${foreign}" alt="foto"></p><p>Poslední odstavec.</p>`;
  try {
    await login(page, credentials);
    await page.goto(`${BASE_URL}/admin/posts/new`);
    const editor = editorBox(page);
    await editor.waitFor();
    await titleBox(page).fill(title);
    await editor.click();
    await page.evaluate((content) => {
      const el = document.querySelector('[aria-label="Text článku"][contenteditable="true"]');
      const data = new DataTransfer();
      data.setData("text/html", content);
      data.setData("text/plain", "Přelet přes Atlantik");
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    }, html);
    await editor.getByRole("heading", { level: 2, name: "Přelet přes Atlantik" }).waitFor();
    await editor.getByText("Den, Trasa", { exact: true }).waitFor();
    await editor.getByText("1, KISM - KJAX", { exact: true }).waitFor();
    assert((await editor.locator("table").count()) === 0, "Tabulka zůstala v editoru.");
    const note = editor.locator("[data-foreign-image-note]");
    await note.waitFor();
    assert((await note.innerText()).includes("Obrázek z jiného webu"), "Cizí obrázek není označený.");
    const label = await editor.locator(`img[src="${foreign}"]`).getAttribute("aria-label");
    assert(label?.includes("Obrázek z jiného webu"), "Cizí obrázek nemá popis pro čtečky.");

    // Koncept jde uložit i s cizím obrázkem, na webu není.
    await page.getByRole("button", { name: "Uložit koncept" }).click();
    await page.getByText("Koncept uložen").waitFor();
    await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{36}\/edit$/);
    await editor.locator("[data-foreign-image-note]").waitFor();
    const [draft] = await sql`select content, status from posts where slug = ${slug}`;
    assert(draft.status === "draft" && draft.content.includes(foreign), "Koncept s cizím obrázkem se neuložil.");
    assert(draft.content.includes("<h2>Přelet přes Atlantik</h2>"), "H1 se neuložil jako mezititulek.");
    assert((await fetchManual(`/z-cest/${slug}`)).status === 404, "Koncept je na webu.");

    // Publikaci zablokuje srozumitelná hláška, fokus jde do textu.
    await page.getByRole("button", { name: "Publikovat" }).click();
    await page.getByRole("alert").getByRole("button", { name: /^Text obsahuje obrázek z jiného webu/ }).waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Text článku");
    const [still] = await sql`select status from posts where slug = ${slug}`;
    assert(still.status === "draft", "Článek s cizím obrázkem se publikoval.");
  } finally {
    await sql`delete from posts where slug = ${slug}`;
    await sql.end();
  }
});

/**
 * Detail poptávky na telefonu (úprava 53): pod jménem Zavolat a Napsat
 * e-mail, pak stav a poznámka, podrobnosti až pod nimi. Na počítači
 * podrobnosti vlevo a stav vpravo jako dřív.
 */
test("poptávka na 375 px má stav a poznámku nad podrobnostmi", async (page, credentials) => {
  const sql = database(credentials);
  const stamp = Date.now().toString(36);
  let id;
  try {
    id = await insertInquiry(sql, `E2E telefon ${stamp}`);
    await login(page, credentials);
    await page.goto(`${BASE_URL}/admin/poptavky/${id}`);
    const top = async (locator) => (await locator.boundingBox()).y;
    const call = page.getByRole("link", { name: "Zavolat" });
    const mail = page.getByRole("link", { name: "Napsat e-mail" });
    assert((await call.getAttribute("href")) === "tel:+420602000222", "Zavolat: špatný odkaz.");
    assert((await mail.getAttribute("href")) === "mailto:e2e-telefon@test.local", "Napsat e-mail: špatný odkaz.");
    const status = page.getByRole("group", { name: "Stav poptávky" });
    const note = page.getByLabel("Interní poznámka");
    const contact = page.getByRole("heading", { level: 2, name: "Kontakt" });
    const heading = page.getByRole("heading", { level: 1 });
    const order = [await top(heading), await top(call), await top(status), await top(note), await top(contact)];
    assert(order.every((y, i) => i === 0 || y > order[i - 1]), `Pořadí na telefonu (jméno, Zavolat, stav, poznámka, Kontakt): ${order}`);
    const callBox = await call.boundingBox();
    assert(callBox.height >= 44, `Tlačítko Zavolat má ${callBox.height} px.`);
    for (const button of await status.getByRole("button").all()) {
      const box = await button.boundingBox();
      assert(box.height >= 44, `Tlačítko stavu má ${box.height} px.`);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 0, `Detail poptávky přetéká o ${overflow} px.`);

    // Počítač beze změny: tlačítka nahoře skrytá, stav vpravo od podrobností.
    await page.setViewportSize({ width: 1440, height: 900 });
    await call.waitFor({ state: "hidden" });
    const statusBox = await status.boundingBox();
    const contactBox = await contact.boundingBox();
    assert(statusBox.x > contactBox.x && statusBox.y < contactBox.y + 200, "Na počítači není stav vpravo nahoře.");
  } finally {
    if (id) await sql`delete from inquiries where id = ${id}`;
    await sql.end();
  }
}, { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

/**
 * Editor na telefonu (úprava 51): lišta v jednom řádku a zbytek pod Další,
 * dotykové cíle aspoň 44 px, při psaní se schová spodní lišta s tlačítky.
 */
test("editor na telefonu: jeden řádek lišty a dotykové cíle", async (page, credentials) => {
  await login(page, credentials);
  await page.goto(`${BASE_URL}/admin/posts`);
  // Tužka v seznamu článků.
  const pencil = page.getByRole("link", { name: /^Upravit článek / }).first();
  const pencilBox = await pencil.boundingBox();
  assert(pencilBox.width >= 44 && pencilBox.height >= 44, `Tužka v seznamu: ${pencilBox.width} x ${pencilBox.height} px.`);

  await page.getByRole("link", { name: "Ukázkový článek s galerií", exact: true }).click();
  const editor = editorBox(page);
  await editor.waitFor();
  const toolbar = page.getByRole("group", { name: "Formát textu" });
  const visibleButtons = async () => {
    const result = [];
    for (const button of await toolbar.getByRole("button").all()) {
      if (await button.isVisible()) result.push({ name: await button.getAttribute("aria-label") ?? (await button.innerText()), box: await button.boundingBox() });
    }
    return result;
  };
  const row = await visibleButtons();
  const names = row.map((b) => b.name);
  assert(
    JSON.stringify(names.slice(0, 3)) === JSON.stringify(["Tučně", "Mezititulek", "Odkaz"]) && names.length === 5 && /Další/.test(names[4]),
    `Lišta na telefonu: ${names.join(", ")}`,
  );
  assert(new Set(row.map((b) => Math.round(b.box.y))).size === 1, "Lišta na telefonu má víc řádků.");
  assert(row.every((b) => b.box.width >= 44 && b.box.height >= 44), "Tlačítko lišty menší než 44 px.");
  await toolbar.getByRole("button", { name: "Další" }).click();
  await toolbar.getByRole("button", { name: "Menší mezititulek" }).waitFor();
  await toolbar.getByRole("button", { name: "Méně" }).click();
  await toolbar.getByRole("button", { name: "Menší mezititulek" }).waitFor({ state: "hidden" });

  // Šipky a koš u fotek galerie.
  for (const name of ["Posunout fotku 1 dolů", "Odebrat fotku 1"]) {
    const box = await page.getByRole("button", { name }).boundingBox();
    assert(box.width >= 44 && box.height >= 44, `${name}: ${box.width} x ${box.height} px.`);
  }

  // Při psaní spodní lišta s tlačítky zmizí, po klepnutí mimo text se vrátí.
  const save = page.getByRole("button", { name: "Uložit změny" });
  await editor.locator("p").first().tap();
  await save.waitFor({ state: "hidden" });
  await page.getByLabel("Perex").tap();
  await save.waitFor();
}, { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

/**
 * Kontrast ukázkového textu ve viditelných polích stránky. Barvu
 * z getComputedStyle(…, "::placeholder") převede plátno (canvas) na RGB
 * složené na pozadí pole: výchozí barva Tailwindu je oklab s průhledností
 * a regex na čísla by z ní vyčetl skoro černou.
 */
const placeholderContrast = (page) =>
  page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const rgb = (background, color) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const lum = (c) =>
      c
        .map((v) => v / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    return [...document.querySelectorAll("input[placeholder], textarea[placeholder]")]
      .filter((el) => el.offsetParent !== null && el.placeholder)
      .map((el) => {
        const bg = rgb("#fff", getComputedStyle(el).backgroundColor);
        const fg = rgb(`rgb(${bg.join(",")})`, getComputedStyle(el, "::placeholder").color);
        const [hi, lo] = [lum(bg), lum(fg)].sort((a, b) => b - a);
        return { name: el.placeholder, color: `rgb(${fg.join(", ")})`, ratio: (hi + 0.05) / (lo + 0.05) };
      });
  });

/**
 * Ukázkový text v polích má kontrast aspoň 4,5 : 1 (úprava 56): hledání na
 * seznamu článků, pole nového článku a malé okno editoru (odkaz).
 */
test("kontrast ukázkového textu v polích administrace", async (page, credentials) => {
  await login(page, credentials);
  const checked = [];
  const measure = async (where) => {
    const fields = await placeholderContrast(page);
    assert(fields.length > 0, `${where}: žádné pole s ukázkovým textem.`);
    checked.push(...fields.map((field) => ({ where, ...field })));
  };
  await page.goto(`${BASE_URL}/admin/posts`);
  await page.getByPlaceholder("Hledat podle názvu").waitFor();
  await measure("seznam článků");
  await page.goto(`${BASE_URL}/admin/posts/new`);
  await editorBox(page).waitFor();
  await measure("nový článek");
  await editorBox(page).click();
  await page.getByRole("group", { name: "Formát textu" }).getByRole("button", { name: "Odkaz", exact: true }).click();
  await page.getByRole("dialog", { name: "Vložit odkaz" }).getByLabel("Adresa odkazu").waitFor();
  await measure("okno Vložit odkaz");
  const low = checked.filter((field) => field.ratio < 4.5);
  assert(
    low.length === 0,
    `Kontrast ukázkového textu pod 4,5 : 1: ${low.map((f) => `${f.where} „${f.name}“ ${f.ratio.toFixed(2)} : 1 (${f.color})`).join("; ")}`,
  );
});

// Při plném běhu až na konci, po testech Z cest: ukládá importované články
// (editor přidá prázdný odstavec za galerii na konci).
part(2);

/**
 * Články importované ze starého webu jde v administraci uložit beze změny
 * (limity popisků a galerií, adresy fotek z 127.0.0.1:8816 při vývoji).
 * Text, značky galerií a galerie zůstanou. Editor přidá prázdný odstavec
 * za galerii na konci a formulář posílá konce řádků jako \r\n, obojí web
 * ignoruje. Bez importu deníku se přeskočí.
 */
test("administrace uloží importované články beze změny", async (page, credentials) => {
  const sql = database(credentials);
  try {
    const posts = await sql`
      select id, slug, content, gallery from posts
      where status = 'published' and image_url like 'http://127.0.0.1:8816/%'
      order by published_at desc`;
    if (posts.length === 0) {
      console.log("         (přeskočeno: lokální databáze je bez importu deníku)");
      return;
    }
    const plain = (html) =>
      html
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;| /g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const markers = (html) => [...html.matchAll(/data-gallery="([^"]+)"/g)].map((m) => m[1]).join(",");
    const images = (html) => [...html.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]).join(",");
    const galleries = (gallery) =>
      JSON.stringify(
        gallery.map((g) => [g.id, g.items.map((item) => [item.url, item.caption, item.alt ?? null, item.width, item.height])]),
      );

    await login(page, credentials);
    for (const post of posts) {
      await page.goto(`${BASE_URL}/admin/posts/${post.id}/edit`);
      await page.getByRole("textbox", { name: "Text článku" }).waitFor();
      await page.getByRole("button", { name: "Uložit změny" }).click();
      try {
        await page.waitForURL(/\/admin\/posts(\?.*)?$/, { timeout: 30_000 });
      } catch {
        const errors = await page.locator("[role=alert]").allInnerTexts();
        throw new Error(`${post.slug} se neuložil: ${errors.join(" | ")}`);
      }
      const [saved] = await sql`select content, gallery from posts where id = ${post.id}`;
      assert(plain(saved.content) === plain(post.content), `${post.slug}: uložení změnilo text.`);
      assert(markers(saved.content) === markers(post.content), `${post.slug}: uložení změnilo značky galerií.`);
      assert(images(saved.content) === images(post.content), `${post.slug}: uložení změnilo fotky v textu.`);
      assert(galleries(saved.gallery) === galleries(post.gallery), `${post.slug}: uložení změnilo galerie.`);
    }
  } finally {
    await sql.end();
  }
});
