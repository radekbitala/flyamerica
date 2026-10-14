/**
 * Česká typografie textu z databáze (články, perexy, popisky fotek) při
 * vykreslení: pevné mezery, české uvozovky a nezalomitelné rozsahy čísel.
 *
 * Uvozovky (rozhodnutí 12. 10. 2026): rovné dvojité uvozovky "…" ze starého
 * webu se zobrazí jako české „…“. Data v databázi se nemění. Párují se
 * v rámci jednoho bloku (odstavec, položka seznamu, popisek, nadpis):
 * - horní uvozovka “ na začátku slova (za mezerou, závorkou nebo na začátku
 *   bloku) je chybně sázená otevírací („takové “latentní“ kdy“ ve čtyřech
 *   archivních článcích) a zobrazí se jako dolní „,
 * - rovná uvozovka po otevřené české „ ji zavře („shutdownu" -> „shutdownu“),
 * - rovná uvozovka před českou zavírací “ ji otevře,
 * - zbylé rovné se střídají „ a “, jen když je jich v bloku sudý počet.
 *   Lichý počet nechá blok beze změny (nejde poznat, která chybí).
 * Nikdy v atributech (alt, href, title), v kódu (<code>, <pre>…) ani
 * v adrese URL v textu (https://…, www.…).
 *
 * Nezalomitelná místa (tieText): za spojovník v rozsahu čísel („3-3,5“,
 * „6-8“, „2-3“) a mezi „-“ a „>“ v archivní šipce „->“ se vloží neviditelný
 * znak WORD JOINER (U+2060), řádek se tam pak nezalomí. Znaky textu zůstávají,
 * spojovník je dál obyčejný „-“.
 *
 * Pevné mezery podle pravidla R4 z klikacího modelu (prototyp/_PRAVIDLA.md,
 * část 3 a 7). Mění se jen druh mezery (běžná na pevnou U+00A0), slova
 * a znaky nikdy:
 *
 * - za jednopísmennými předložkami a spojkami k, s, v, z, o, u, a, i
 *   (i s velkým písmenem): „v&nbsp;kabině“, „A&nbsp;pak“
 * - výjimka: jednopísmenné označení za slovem (velké písmeno uprostřed věty)
 *   se váže k předchozímu slovu, ne k následujícímu: „z bodu&nbsp;A do
 *   bodu&nbsp;B“, „raketami Saturn&nbsp;V nebo“
 * - mezi číslem a jednotkou, měnou nebo počítaným slovem: „6&nbsp;dní“,
 *   „2100&nbsp;metrů“, „$7&nbsp;400&nbsp;USD“, i v rozsazích „3-3,5&nbsp;hodiny“.
 *   Rok se váže jen s jednotkou („v roce 2017 jsme“ zůstává), číslo se
 *   neváže s předložkou, spojkou ani slovesem („Cessna 182 a palivo“, „1 ze 3“)
 * - v číslech s mezerou po tisících a v telefonu: „13&nbsp;900“,
 *   „+420&nbsp;602&nbsp;214&nbsp;719“
 * - u dat: „10.&nbsp;10.&nbsp;2026“, „14.&nbsp;dubna“
 * - v celcích: Key&nbsp;West, St.&nbsp;Augustine, Grand&nbsp;Tour a název
 *   s číslem (Cessna&nbsp;182, Generace&nbsp;6, Den&nbsp;1, Dash&nbsp;8)
 * - před samostatným spojovníkem a lomítkem mezi slovy, aby jimi nezačínal
 *   řádek: „6 dní&nbsp;- 4 letové“, „Palatka Municipal Airport&nbsp;/ Kay
 *   Larkin Airport“ (úprava 29 z auditu 13. 10. 2026). Spojovník ve slově
 *   (Pilot-mentor, SR-22), lomítko bez mezer (Class B/C/D) a šipka „->“
 *   zůstávají
 * - v názvech výletů kolem „&“: Florida Week&nbsp;&&nbsp;Fly, Florida
 *   Grand&nbsp;Tour&nbsp;&&nbsp;Fly (v HTML i jako entita „&amp;“), název se
 *   na konci řádku neroztrhne (úprava 29)
 *
 * Funguje jen v textu, nikdy v atributech (alt, title, href) a značkách.
 * Obsah <option>, <script>, <style>, <pre>, <code>, <textarea> a <title>
 * zůstává beze změny. Text uvnitř řádkových značek (<strong>, <a>, <em>…)
 * se posuzuje jako souvislý text odstavce, blokové značky (<p>, <li>, <br>…)
 * ho dělí.
 *
 * Volá se při vykreslení (deník z databáze, popisky fotek), ne při ukládání,
 * aby se pravidla dala měnit bez úpravy článků. Výstup je stejně bezpečný
 * jako vstup: HTML musí být předem vyčištěné (sanitizePostHtml), funkce
 * značky jen kopíruje.
 */

export const NBSP = " ";

/** Neviditelný znak, za kterým ani před kterým se řádek nezalomí (UAX #14, třída WJ). */
export const WORD_JOINER = "\u2060";

// Mezera, kterou jde nahradit pevnou (jen jeden znak, délka textu se nemění).
const SP = "[ \\t\\r\\n]";
// Před jednopísmennou předložkou: začátek textu, mezera nebo otevírací znak.
const OPEN = "(?:^|[\\s\\u00A0(\\[„“\"'‚‘/])";
// Číslo jako samostatné slovo: nesmí mu předcházet písmeno, číslice, tečka
// ani čárka. Spojovník jen v rozsahu (2-3) nebo před záporným číslem (-20),
// ne v označení typu (SR-22, L-410, AN-2).
const NUM_START = "(?:^|[^\\p{L}\\p{N}.,\\-]|(?<=^|[\\s\\u00A0\\p{N}])-)";

/** Znak „&“ v prostém textu i jako entita „&amp;“ v HTML (czechNbsp entitu nepřevádí). */
const AMP = "&(?:amp;)?";

/** Malá písmena, která za číslem nejsou jednotka, ale předložka nebo spojka. */
const SINGLE_LETTER_WORDS = new Set(["k", "s", "v", "z", "o", "u", "a", "i"]);

/** Slova, se kterými se číslo neváže (není to počítané slovo ani jednotka). */
const NUMBER_STOP_WORDS = new Set([
  "je", "jsou", "jsme", "jste", "byl", "byla", "bylo", "byli", "bude", "budou", "jako", "nebo", "ale",
  "ani", "což", "kde", "kdy", "když", "ze", "za", "na", "do", "od", "po", "se", "ve", "ke", "by", "už",
  "až", "či", "pro", "při", "přes", "nad", "pod", "před", "mezi", "který", "která", "které",
]);

/** Jednotky s velkým písmenem (malá písmena pokrývá obecné pravidlo). */
const UPPER_UNITS = new Set(["USD", "EUR", "CZK", "Kč", "NM"]);

/** Jednotky, se kterými se váže i číslo, které vypadá jako rok (2000 hodin). */
const YEAR_UNIT = /^(?:m|km|ft|kg|l|metr\p{L}*|kilometr\p{L}*|stop\p{L}*|mil\p{L}*|míl\p{L}*|hodin\p{L}*|litr\p{L}*|galon\p{L}*)$/u;

/** Slova s velkým písmenem, která se s číslem za nimi neváží („Pro 1 pilota“). */
const CAPITAL_STOP_WORDS = new Set([
  "Pro", "Na", "Do", "Od", "Po", "Za", "Ve", "Ke", "Se", "Ze", "Nad", "Pod", "Před", "Při", "Přes",
  "Mezi", "Bez", "Až", "Asi", "Jen", "Už", "Cca", "Kolem", "Okolo", "Je", "Jsou", "Bylo", "Byl", "Byla",
  "Jsme", "Ani", "Ale", "Nebo", "Když", "Kde", "Kdy", "Celkem", "Všech", "Všechny", "Každý", "Každá",
]);

interface Rule {
  re: RegExp;
  /** Dodatečná kontrola nálezu, kterou regulární výraz neumí popsat. */
  accept?: (match: RegExpExecArray) => boolean;
}

/**
 * Každé pravidlo najde právě jeden znak mezery, který se změní na pevnou.
 * Kontext je jen v lookbehind a lookahead, aby se pravidla nepřekrývala
 * a šla za sebou („a v Praze“ dá dvě pevné mezery).
 */
const RULES: Rule[] = [
  // Malé k, s, v, z, o, u, a, i: vždy předložka nebo spojka.
  { re: new RegExp(`(?<=${OPEN}[ksvzouai])${SP}(?=\\S)`, "gu") },
  // Velké K, S, V, Z, O, U, A, I: předložka jen na začátku věty, ne za slovem (to je označení, bod A).
  { re: new RegExp(`(?<=${OPEN}[KSVZOUAI])(?<![\\p{L}\\p{N}][\\s\\u00A0]+[KSVZOUAI])${SP}(?=\\S)`, "gu") },
  // Jednopísmenné označení za slovem: pevná mezera před ním (bodu A, Saturn V).
  { re: new RegExp(`(?<=[\\p{L}\\p{N}])${SP}(?=\\p{Lu}(?:$|[\\s\\u00A0.,;:!?)\\]“”"'’…]))`, "gu") },
  // Číslo (i desetinné) a jednotka, měna nebo počítané slovo.
  {
    re: new RegExp(`(?<=${NUM_START}(\\d+(?:[.,]\\d+)?))${SP}(?=(\\p{L}+|%|°[CF]))`, "gu"),
    accept: (m) => {
      const num = m[1];
      const word = m[2];
      if (word === "%" || word.startsWith("°")) return true;
      if (/^\p{Lu}/u.test(word)) return UPPER_UNITS.has(word);
      if (SINGLE_LETTER_WORDS.has(word) || NUMBER_STOP_WORDS.has(word)) return false;
      if (/^(?:19|20)\d{2}$/.test(num)) return YEAR_UNIT.test(word);
      return true;
    },
  },
  // Tisíce a telefon: skupiny po třech číslicích.
  { re: new RegExp(`(?<=${NUM_START}\\d{1,3}(?:[ \\u00A0]\\d{3})*)${SP}(?=\\d{3}(?:$|[^\\p{N}]))`, "gu") },
  // Datum a řadová číslovka: „10. 10. 2026“, „14. dubna“.
  { re: new RegExp(`(?<=${NUM_START}\\d{1,2}\\.)${SP}(?=\\d|\\p{Ll})`, "gu") },
  // Název s číslem: Cessna 182, Generace 6, Den 1, Dash 8. Ne předložka na začátku věty („Pro 1 pilota“).
  {
    re: new RegExp(`(?<=(?:^|[^\\p{L}\\p{N}\\-])(\\p{Lu}\\p{L}+))${SP}(?=\\d)`, "gu"),
    accept: (m) => !CAPITAL_STOP_WORDS.has(m[1]),
  },
  // Ustálené celky z modelu.
  { re: new RegExp(`(?<=(?:^|[^\\p{L}])(?:St|Sv)\\.)${SP}(?=\\p{Lu})`, "gu") },
  { re: new RegExp(`(?<=(?:^|[^\\p{L}])Key)${SP}(?=West)`, "gu") },
  { re: new RegExp(`(?<=(?:^|[^\\p{L}])Grand)${SP}(?=Tour)`, "gu") },
  // Samostatný spojovník nebo lomítko mezi slovy: pevná mezera před ním, za ním běžná
  // („6 dní~- 4 letové“). Řádek se tak zalomí až za znakem, nikdy před ním.
  { re: new RegExp(`(?<=[^\\s\\u00A0])${SP}(?=[-/][ \\t\\r\\n\\u00A0]+[^\\s\\u00A0])`, "gu") },
  // Názvy výletů „Week & Fly“ a „Tour & Fly“ (v HTML „&amp;“): pevné mezery před i za „&“.
  { re: new RegExp(`(?<=(?:^|[^\\p{L}])(?:Week|Tour))${SP}(?=${AMP}[ \\u00A0]Fly(?!\\p{L}))`, "gu") },
  { re: new RegExp(`(?<=(?:^|[^\\p{L}])(?:Week|Tour)[ \\u00A0]${AMP})${SP}(?=Fly(?!\\p{L}))`, "gu") },
];

/**
 * Pevné mezery, české uvozovky a nezalomitelné rozsahy čísel v souvislém
 * textu (bez značek), celý text je jeden blok. Vstup i výstup jsou prostý text.
 */
export function czechNbspText(text: string): string {
  if (!text) return text;
  return tieText(applyRules(czechQuotesText(collapseSpaces(text))));
}

// ---------------------------------------------------------------------------
// Nezalomitelná místa
// ---------------------------------------------------------------------------

/**
 * Místo hned za spojovníkem mezi dvěma čísly (rozsah „3-3,5“, „6-8“) a mezi
 * „-“ a „>“ v šipce „->“ (v HTML „-&gt;“). Za spojovníkem prohlížeč jinak
 * řádek zalomit smí („3-“ na konci řádku, „3,5 hodiny“ na dalším). Kde už
 * WORD_JOINER je, regulární výraz nic nenajde (opakované použití nic nezmění).
 */
const TIE_AFTER_HYPHEN = /(?<=\p{N}-)(?=\p{N})|(?<=-)(?=>|&gt;)/gu;

/**
 * Za spojovník v rozsahu čísel a v šipce „->“ vloží WORD_JOINER. Mění délku
 * textu, proto až po pravidlech, která pracují znak za znak.
 */
export function tieText(text: string): string {
  if (!text.includes("-")) return text;
  return text.replace(TIE_AFTER_HYPHEN, WORD_JOINER);
}

// ---------------------------------------------------------------------------
// Uvozovky
// ---------------------------------------------------------------------------

const OPEN_QUOTE = "„";
const CLOSE_QUOTE = "“";

/** Adresa v textu. Uvozovky v ní se nemění, interpunkce na konci k ní nepatří. */
const URL_IN_TEXT = /\b(?:https?:\/\/|www\.)[^\s\uE000]+/gi;
const URL_TRAILING = /[.,;:!?)\]"'»“”]+$/;

/**
 * České uvozovky v jednom bloku textu (bez značek): rovné dvojité "…"
 * na „…“ podle pravidel v úvodu souboru. Délka textu se nemění (znak za
 * znak), proto jde použít i na spojené úseky textu v czechNbsp().
 */
export function czechQuotesText(text: string): string {
  if (!text.includes('"') && !text.includes(CLOSE_QUOTE)) return text;

  const insideUrl: [number, number][] = [];
  for (const match of text.matchAll(URL_IN_TEXT)) {
    const url = match[0].replace(URL_TRAILING, "");
    insideUrl.push([match.index, match.index + url.length]);
  }
  const inUrl = (i: number) => insideUrl.some(([start, end]) => i >= start && i < end);

  const out = text.split("");
  // Rovné uvozovky, které se nepodařilo přiřadit k české (indexy do textu).
  const pending: number[] = [];
  let czechOpen = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === OPEN_QUOTE) {
      czechOpen++;
    } else if (ch === CLOSE_QUOTE && opensWord(text, i) && !inUrl(i)) {
      // Horní uvozovka na začátku slova je chybně sázená otevírací (“latentní“).
      out[i] = OPEN_QUOTE;
      czechOpen++;
    } else if (ch === CLOSE_QUOTE || ch === "”") {
      if (czechOpen > 0) czechOpen--;
      else if (pending.length > 0) out[pending.pop()!] = OPEN_QUOTE;
    } else if (ch === '"' && !inUrl(i)) {
      if (czechOpen > 0) {
        out[i] = CLOSE_QUOTE;
        czechOpen--;
      } else {
        pending.push(i);
      }
    }
  }
  if (pending.length % 2 === 0) {
    pending.forEach((index, k) => {
      out[index] = k % 2 === 0 ? OPEN_QUOTE : CLOSE_QUOTE;
    });
  }
  return out.join("");
}

/**
 * Znak na pozici i stojí na začátku slova: před ním začátek textu, mezera,
 * závorka, lomítko nebo oddělovač úseků z czechNbsp(), za ním písmeno nebo
 * číslice. Zavírací uvozovka tak stát nemůže (ta je hned za slovem).
 */
function opensWord(text: string, i: number): boolean {
  const before = i === 0 ? "" : text[i - 1];
  const after = text[i + 1] ?? "";
  return (before === "" || /[\s\u00A0(\[/\uE000]/u.test(before)) && /[\p{L}\p{N}]/u.test(after);
}

function collapseSpaces(text: string): string {
  // Víc mezer za sebou se v HTML stejně zobrazí jako jedna. Sjednocením se
  // pevná mezera nedostane vedle obyčejné (ta by řádek zalomit dovolila).
  return text.replace(/[ \t\r\n]{2,}/g, " ");
}

function applyRules(text: string): string {
  const marks = new Set<number>();
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.re.exec(text)) !== null) {
      if (!rule.accept || rule.accept(match)) marks.add(match.index);
    }
  }
  if (marks.size === 0) return text;
  let out = "";
  for (let i = 0; i < text.length; i++) out += marks.has(i) ? NBSP : text[i];
  return out;
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

/** Značky, které dělí text (konec odstavce, položky, řádku). */
const BLOCK_TAGS = new Set([
  "address", "article", "aside", "blockquote", "br", "caption", "dd", "details", "div", "dl", "dt",
  "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "iframe",
  "img", "li", "main", "nav", "ol", "p", "section", "summary", "table", "tbody", "td", "tfoot", "th",
  "thead", "tr", "ul", "video", "picture", "source", "select",
]);

/** Značky, jejichž obsah se nemění. */
const RAW_TAGS = new Set(["script", "style", "pre", "code", "textarea", "option", "title", "svg", "math", "kbd", "samp"]);

/** Oddělovač úseků textu (soukromý znak Unicode, není písmeno, číslice ani mezera). */
const SEPARATOR = "\uE000";

const TOKEN = /<!--[\s\S]*?-->|<![^>]*>|<\/?([a-zA-Z][a-zA-Z0-9-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>|[^<]+|</g;

/**
 * Pevné mezery a české uvozovky v HTML (text článku z databáze). Mění jen
 * textové uzly, atributy a značky zůstávají znak po znaku. Uvozovky se
 * párují v rámci bloku (odstavec, položka seznamu, nadpis…) i přes řádkové
 * značky („<em>Key West</em>“).
 */
export function czechNbsp(html: string): string {
  if (!html) return html;

  const parts: string[] = [];
  // Rozpracovaný úsek textu mezi blokovými značkami: indexy do parts.
  let run: number[] = [];
  let rawDepth = 0;
  let rawTag = "";

  const flush = () => {
    if (run.length === 0) return;
    const texts = run.map((i) => collapseSpaces(decodeQuotes(decodeNbsp(parts[i]))));
    // Úseky se spojí do jednoho textu, aby pravidla viděla přes řádkové
    // značky („v <em>Key West</em>“). Kde na sebe dva úseky narážejí bez
    // mezery (od</span><strong>10 800 USD</strong><span>za), vloží se mezi
    // ně oddělovač: jinak by „od10“ nebylo číslo a „USDza“ jednotka.
    let joined = "";
    const starts: number[] = [];
    texts.forEach((t, k) => {
      if (k > 0 && /\S$/.test(joined) && /^\S/.test(t)) joined += SEPARATOR;
      starts.push(joined.length);
      joined += t;
    });
    const result = applyRules(czechQuotesText(joined));
    // tieText až po rozdělení zpět na úseky: vložený znak mění délku textu.
    // Rozsah rozdělený značkou („3-<b>5</b>“) tak zůstane zalomitelný.
    run.forEach((partIndex, k) => {
      parts[partIndex] = tieText(result.slice(starts[k], starts[k] + texts[k].length));
    });
    run = [];
  };

  for (const match of html.matchAll(TOKEN)) {
    const token = match[0];
    const tagName = match[1]?.toLowerCase();

    if (token.startsWith("<!")) {
      parts.push(token);
      continue;
    }

    if (tagName) {
      const closing = token.startsWith("</");
      const selfClosing = token.endsWith("/>");
      if (rawDepth > 0) {
        if (tagName === rawTag && !selfClosing) rawDepth += closing ? -1 : 1;
        parts.push(token);
        continue;
      }
      if (RAW_TAGS.has(tagName) && !closing) {
        flush();
        if (!selfClosing) {
          rawTag = tagName;
          rawDepth = 1;
        }
        parts.push(token);
        continue;
      }
      if (BLOCK_TAGS.has(tagName)) flush();
      parts.push(token);
      continue;
    }

    // Text (nebo osamělé „<“, které není značka).
    parts.push(token);
    if (rawDepth === 0 && token !== "<") run.push(parts.length - 1);
  }
  flush();
  return parts.join("");
}

/** &nbsp; v textu jako znak, aby ho pravidla poznala jako mezeru. */
function decodeNbsp(text: string): string {
  return text.replace(/&nbsp;|&#160;|&#x0*a0;/gi, NBSP);
}

/** &quot; v textu jako znak, aby se z něj mohla stát česká uvozovka. V textu HTML je " platný znak. */
function decodeQuotes(text: string): string {
  return text.replace(/&quot;|&#0*34;|&#x0*22;/gi, '"');
}
