#!/usr/bin/env node
/**
 * Test pevných mezer (pravidlo R4 z klikacího modelu) bez Next serveru:
 *   node scripts/test-typography.mjs
 *
 * Očekávané výsledky jsou texty z modelu (prototyp/*.html), kde jsou pevné
 * mezery vysázené ručně. TypeScript ze src/ načte Node sám (odstranění typů).
 */
import { registerHooks } from "node:module";
import { describe, test } from "node:test";
import assert from "node:assert/strict";

// package.json nemá "type", bez tohohle by Node u .ts varoval.
registerHooks({
  resolve(specifier, context, next) {
    const resolved = next(specifier, context);
    return resolved.url.endsWith(".ts") ? { ...resolved, format: "module-typescript" } : resolved;
  },
});

const { czechNbsp, czechNbspText, NBSP } = await import("../src/lib/typography.ts");

/** Zápis očekávaného textu: „~“ = pevná mezera. */
const nb = (s) => s.replaceAll("~", NBSP);

/** Dvojice vstup (běžné mezery) a výstup podle modelu. */
const MODEL_TEXTS = [
  // index.html
  [
    "O veškerou organizaci a servis se postaráme a v kabině vás bude doprovázet zkušený mentor.",
    "O~veškerou organizaci a~servis se postaráme a~v~kabině vás bude doprovázet zkušený mentor.",
  ],
  ["Balíčky od $7 400 USD", "Balíčky od $7~400~USD"],
  [
    "za osobu při 2 pilotech. Pro 1 pilota $13 900 USD.",
    "za osobu při 2~pilotech. Pro 1~pilota $13~900~USD.",
  ],
  [
    "za osobu při 2 pilotech. Pro 1 pilota 20 100 USD.",
    "za osobu při 2~pilotech. Pro 1~pilota 20~100~USD.",
  ],
  ["Pilot-mentor a doprovod", "Pilot-mentor a~doprovod"],
  ["Cessna 182 a palivo", "Cessna~182 a~palivo"],
  [
    "6 dní - 4 letové a 2 volné dny na pláž, nákupy nebo návštěvu Universal Studios.",
    "6~dní - 4~letové a~2~volné dny na pláž, nákupy nebo návštěvu Universal Studios.",
  ],
  [
    "Cessna 182 Skylane - prostorný čtyřmístný stroj vhodný pro delší lety ve 2-3 lidech.",
    "Cessna~182 Skylane - prostorný čtyřmístný stroj vhodný pro delší lety ve 2-3~lidech.",
  ],
  ["20 hodin, přibližně 3-3,5 hodiny za letový den.", "20~hodin, přibližně 3-3,5~hodiny za letový den."],
  ["6-8 týdnů před odletem", "6-8~týdnů před odletem"],
  [
    "Zahájíme ověření zahraniční pilotní licence u FAA (Foreign Pilot Verification).",
    "Zahájíme ověření zahraniční pilotní licence u~FAA (Foreign Pilot Verification).",
  ],
  [
    "„Létání pro mě není jen o přesunu z bodu A do bodu B - je o vášni, přátelství, o rozhodování, důkladné přípravě a jistotě za řízením i na zemi a hlavně o nikdy nekončícím procesu učení.“",
    "„Létání pro mě není jen o~přesunu z~bodu~A do bodu~B - je o~vášni, přátelství, o~rozhodování, důkladné přípravě a~jistotě za řízením i~na zemi a~hlavně o~nikdy nekončícím procesu učení.“",
  ],
  [
    "Grónsko má největší ledovec na severní polokouli. Sahá do výšky přes 2100 metrů a říká se mu ledová čepice, Ice cap.",
    "Grónsko má největší ledovec na severní polokouli. Sahá do výšky přes 2100~metrů a~říká se mu ledová čepice, Ice cap.",
  ],
  ["+420 602 214 719", "+420~602~214~719"],
  ["Nebo zavolejte Honzovi: +420 602 214 719", "Nebo zavolejte Honzovi: +420~602~214~719"],
  ["Létání s českými piloty na Floridě.", "Létání s~českými piloty na Floridě."],
  ["Key West & Everglades", "Key~West & Everglades"],
  ["Florida Grand Tour & Fly", "Florida Grand~Tour & Fly"],
  ["Albert Whitted, St. Petersburg", "Albert Whitted, St.~Petersburg"],
  ["jako jsou Cedar Key nebo Albert Whitted v St. Petersburgu", "jako jsou Cedar Key nebo Albert Whitted v~St.~Petersburgu"],
  ["na sever ke St. Augustine.", "na sever ke St.~Augustine."],
  // denik-druhy-prelet-atlantiku-2017.html
  [
    "Přelet nového letadla Cirrus SR-22, Generace 6 z Knoxville do Prahy",
    "Přelet nového letadla Cirrus SR-22, Generace~6 z~Knoxville do Prahy",
  ],
  ["1. 11. 2017", "1.~11.~2017"],
  ["10. 10. 2026", "10.~10.~2026"],
  ["do 14. dubna", "do 14.~dubna"],
  ["Den 1: Přípravy před odletem", "Den~1: Přípravy před odletem"],
  // výjimka: jednopísmenné označení za slovem se váže dozadu
  ["raketami Saturn V nebo", "raketami Saturn~V nebo"],
  // velké písmeno na začátku věty je předložka nebo spojka
  ["Honza přistál. A pak jsme letěli dál.", "Honza přistál. A~pak jsme letěli dál."],
  ["V kabině i na zemi.", "V~kabině i~na zemi."],
  ["Kam dál? K moři.", "Kam dál? K~moři."],
];

describe("czechNbspText: texty z modelu", () => {
  for (const [input, expected] of MODEL_TEXTS) {
    test(input.slice(0, 60), () => {
      assert.equal(czechNbspText(input), nb(expected));
    });
  }
});

describe("czechNbspText: co se nemění", () => {
  test("označení letadel a avioniky (SR22, G7) není číslo s jednotkou", () => {
    const text = "Cirrus SR22 šesté generace, sedmá generace (G7) láká na novou avioniku";
    assert.equal(czechNbspText(text), text);
  });
  test("název s číslem ano, předložka na začátku věty ne", () => {
    assert.equal(czechNbspText("Dash 8, Bell 212 a Falconů 10."), nb("Dash~8, Bell~212 a~Falconů~10."));
    assert.equal(czechNbspText("Krok 1 ze 3"), nb("Krok~1 ze 3"));
    assert.equal(czechNbspText("Pro 1 pilota"), nb("Pro 1~pilota"));
  });
  test("rok se váže jen s jednotkou", () => {
    assert.equal(czechNbspText("v roce 2017 jsme vyrazili"), nb("v~roce 2017 jsme vyrazili"));
    assert.equal(czechNbspText("nalétal přes 2000 hodin"), nb("nalétal přes 2000~hodin"));
  });
  test("číslo se neváže se slovesem ani předložkou", () => {
    assert.equal(czechNbspText("Generace 6 je jedním z mála"), nb("Generace~6 je jedním z~mála"));
    assert.equal(czechNbspText("na dráhu 28 za silného větru"), "na dráhu 28 za silného větru");
  });
  test("označení typu se spojovníkem není číslo s jednotkou", () => {
    assert.equal(czechNbspText("Antonov AN-2 byl"), "Antonov AN-2 byl");
    assert.equal(czechNbspText("české L-410 Turbolet"), "české L-410 Turbolet");
    assert.equal(czechNbspText("Ve vrtulníku R-44 na Dymníku u Rumburka"), nb("Ve vrtulníku R-44 na Dymníku u~Rumburka"));
  });
  test("slova a znaky zůstávají, mění se jen druh mezery", () => {
    for (const [input] of MODEL_TEXTS) {
      assert.equal(czechNbspText(input).replaceAll(NBSP, " "), input);
    }
  });
  test("opakované použití nic dalšího nezmění", () => {
    for (const [input] of MODEL_TEXTS) {
      const once = czechNbspText(input);
      assert.equal(czechNbspText(once), once);
    }
  });
  test("prázdný text", () => {
    assert.equal(czechNbspText(""), "");
  });
});

describe("czechNbsp: HTML", () => {
  test("jen textové uzly, atributy beze změny", () => {
    const html =
      '<p>Jedeme <a href="/denik/v kabine" title="v kabině a s Honzou">v kabině</a> a <strong>s Honzou</strong>.</p>' +
      '<img src="https://x.cz/a b.jpg" alt="Přistání v Grónsku a na Islandu" width="800" height="600">';
    assert.equal(
      czechNbsp(html),
      nb(
        '<p>Jedeme <a href="/denik/v kabine" title="v kabině a s Honzou">v~kabině</a> a~<strong>s~Honzou</strong>.</p>' +
          '<img src="https://x.cz/a b.jpg" alt="Přistání v Grónsku a na Islandu" width="800" height="600">',
      ),
    );
  });

  test("předložka před řádkovou značkou se váže k jejímu obsahu", () => {
    assert.equal(czechNbsp("<p>Letiště v <em>Key West</em></p>"), nb("<p>Letiště v~<em>Key~West</em></p>"));
  });

  test("označení za slovem v jiné řádkové značce", () => {
    assert.equal(czechNbsp("<p>z <strong>bodu</strong> A do bodu B</p>"), nb("<p>z~<strong>bodu</strong>~A do bodu~B</p>"));
  });

  test("blokové značky text dělí", () => {
    assert.equal(czechNbsp("<p>z bodu</p><p>A pak</p>"), nb("<p>z~bodu</p><p>A~pak</p>"));
    assert.equal(czechNbsp("<p>jsem a<br>pak v</p><p>kabině</p>"), "<p>jsem a<br>pak v</p><p>kabině</p>");
  });

  test("&nbsp; v textu se počítá jako mezera", () => {
    assert.equal(czechNbsp("<p>a&nbsp;v kabině</p>"), nb("<p>a~v~kabině</p>"));
  });

  test("option, script, style, pre a code beze změny", () => {
    const html =
      "<select><option>v kabině</option></select><script>var a = 'v kabině';</script>" +
      "<style>a > b { color: red }</style><pre>a  v   kabině</pre><code>a v</code>";
    assert.equal(czechNbsp(html), html);
  });

  test("komentář a značka galerie beze změny", () => {
    const html = '<!-- a v kabině --><p data-gallery="g-1"></p><p>Galerie a fotky</p>';
    assert.equal(czechNbsp(html), nb('<!-- a v kabině --><p data-gallery="g-1"></p><p>Galerie a~fotky</p>'));
  });

  test("YouTube ve značce div a iframe", () => {
    const html =
      '<div data-youtube-video=""><iframe src="https://www.youtube-nocookie.com/embed/x" width="640" height="360" allowfullscreen="true"></iframe></div><p>Video z 2017 a z Grónska</p>';
    assert.equal(
      czechNbsp(html),
      nb(
        '<div data-youtube-video=""><iframe src="https://www.youtube-nocookie.com/embed/x" width="640" height="360" allowfullscreen="true"></iframe></div><p>Video z~2017 a~z~Grónska</p>',
      ),
    );
  });

  test("úseky bez mezery mezi značkami (cena v modelu)", () => {
    const html = '<div><span class="from">od</span><strong>10 800 USD</strong><span class="note">za osobu</span></div>';
    assert.equal(
      czechNbsp(html),
      nb('<div><span class="from">od</span><strong>10~800~USD</strong><span class="note">za osobu</span></div>'),
    );
  });

  test("entity a znak > v atributu", () => {
    const html = '<p title="a > b">Week &amp; Fly a v&nbsp;kabině</p>';
    assert.equal(czechNbsp(html), nb('<p title="a > b">Week &amp; Fly a~v~kabině</p>'));
  });

  test("opakované použití nic dalšího nezmění", () => {
    const html = "<p>Letiště v <em>Key West</em>, 1. 11. 2017 a $7 400 USD.</p>";
    const once = czechNbsp(html);
    assert.equal(czechNbsp(once), once);
  });
});
