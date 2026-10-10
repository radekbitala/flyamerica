/**
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

// Mezera, kterou jde nahradit pevnou (jen jeden znak, délka textu se nemění).
const SP = "[ \\t\\r\\n]";
// Před jednopísmennou předložkou: začátek textu, mezera nebo otevírací znak.
const OPEN = "(?:^|[\\s\\u00A0(\\[„“\"'‚‘/])";
// Číslo jako samostatné slovo: nesmí mu předcházet písmeno, číslice, tečka
// ani čárka. Spojovník jen v rozsahu (2-3) nebo před záporným číslem (-20),
// ne v označení typu (SR-22, L-410, AN-2).
const NUM_START = "(?:^|[^\\p{L}\\p{N}.,\\-]|(?<=^|[\\s\\u00A0\\p{N}])-)";

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
  "Jsme", "Ani", "Ale", "Nebo", "Když", "Kde", "Kdy",
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
];

/** Pevné mezery v souvislém textu (bez značek). Vstup i výstup jsou prostý text. */
export function czechNbspText(text: string): string {
  if (!text) return text;
  return applyRules(collapseSpaces(text));
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
 * Pevné mezery v HTML (text článku z databáze). Mění jen textové uzly,
 * atributy a značky zůstávají znak po znaku.
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
    const texts = run.map((i) => collapseSpaces(decodeNbsp(parts[i])));
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
    const result = applyRules(joined);
    run.forEach((partIndex, k) => {
      parts[partIndex] = result.slice(starts[k], starts[k] + texts[k].length);
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
