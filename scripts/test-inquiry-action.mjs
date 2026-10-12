#!/usr/bin/env node
/**
 * Test validace poptávky bez Next serveru a bez databáze:
 *   node scripts/test-inquiry-action.mjs
 *
 * Ověřuje to, o čem server action submitInquiry rozhoduje sama: zod schéma
 * (platná i neplatná data, hlášky z klikacího modelu), čtení FormData,
 * podepsaný token proti robotům a otisk IP. K tomu kontrolu polí, kterou
 * formulář dělá v prohlížeči (src/lib/inquiries/fields.ts): musí hlásit
 * totéž co server. Odeslání formulářů na webu a uložení do databáze
 * pokrývá e2e test (scripts/e2e.mjs). E-maily se bez Resendu jen zalogují,
 * žádný test je neposílá.
 *
 * TypeScript ze src/ načte Node sám (odstranění typů). Háček níž doplní
 * příponu .ts u relativních importů, přeloží alias @/ a nahradí
 * "server-only", který mimo Next schválně vyhazuje chybu.
 */
import { randomBytes } from "node:crypto";
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test } from "node:test";
import assert from "node:assert/strict";

const SRC = path.resolve(import.meta.dirname, "../src");

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,", shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      specifier = pathToFileURL(path.join(SRC, specifier.slice(2))).href;
    }
    let resolved;
    try {
      resolved = next(specifier, context);
    } catch (error) {
      if (!/^(\.|file:)/.test(specifier) || specifier.endsWith(".ts")) throw error;
      resolved = next(`${specifier}.ts`, context);
    }
    // package.json nemá "type", bez tohohle by Node u každého .ts varoval.
    return resolved.url.endsWith(".ts") ? { ...resolved, format: "module-typescript" } : resolved;
  },
});

// Náhodný klíč jen pro tenhle běh, žádná skutečná hodnota.
process.env.AUTH_SECRET = randomBytes(32).toString("base64url");
delete process.env.IP_HASH_SALT;

const {
  MESSAGES,
  INQUIRY_FIELDS,
  callbackSchema,
  firstErrors,
  inquirySchema,
  readFields,
} = await import("../src/lib/inquiries/schema.ts");
const { packageFromParam, packageName } = await import("../src/lib/inquiries/options.ts");
const { INQUIRY_STEPS, checkCallbackField, checkInquiryField } = await import(
  "../src/lib/inquiries/fields.ts"
);
const { MAX_FORM_AGE_MS, MIN_FILL_MS, checkFormToken, clientIp, createFormToken, hashIp } =
  await import("../src/lib/inquiries/spam.ts");

/** Platná poptávka tak, jak ji pošle formulář (všechno řetězce). */
const VALID = {
  licence: "PPL",
  aboutPilot: "Nalétáno 120 hodin, létám C172.\nChci zkusit přelet nad Everglades.",
  packageSlug: "grand-tour",
  travelDate: "březen 2027",
  pilotCount: "2",
  companions: "Ano",
  name: "Jan Novák",
  email: "jan.novak@example.cz",
  phone: "+420 602 214 719",
  referralSource: "Z časopisu Flying Revue",
  message: "Šlo by to na jaře?",
};

const EMPTY = Object.fromEntries(INQUIRY_FIELDS.map((f) => [f, ""]));

function errorsOf(schema, input) {
  const result = schema.safeParse(input);
  assert.equal(result.success, false, "data měla neprojít");
  return firstErrors(result.error);
}

function parse(schema, input) {
  const result = schema.safeParse(input);
  assert.ok(result.success, `data měla projít: ${JSON.stringify(result.error?.issues)}`);
  return result.data;
}

describe("poptávka: platná data", () => {
  test("úplná poptávka projde beze změny hodnot", () => {
    const data = parse(inquirySchema, VALID);
    assert.deepEqual(data, VALID);
  });

  test("nepovinná pole můžou zůstat prázdná", () => {
    parse(inquirySchema, {
      ...VALID,
      aboutPilot: "",
      companions: "",
      phone: "",
      referralSource: "",
      message: "",
    });
  });

  test("jednořádková pole se očistí od okrajových mezer a zalomení", () => {
    const data = parse(inquirySchema, {
      ...VALID,
      name: "  Jan \n  Novák\t",
      travelDate: " duben\r\n2027 ",
      email: "  jan.novak@example.cz ",
      phone: " +420  602 214\n719 ",
    });
    assert.equal(data.name, "Jan Novák");
    assert.equal(data.travelDate, "duben 2027");
    assert.equal(data.email, "jan.novak@example.cz");
    assert.equal(data.phone, "+420 602 214 719");
  });

  test("víceřádkové texty si zalomení nechají", () => {
    const data = parse(inquirySchema, { ...VALID, message: "  první řádek\ndruhý řádek  " });
    assert.equal(data.message, "první řádek\ndruhý řádek");
  });

  test("všechny volby z formuláře projdou", () => {
    // Všech pět voleb z prototyp/kontakt.html (rozhodnutí 10. 10.).
    for (const licence of ["PPL", "CPL/ATPL", "Ultralight", "Jiná", "Nemám"]) {
      parse(inquirySchema, { ...VALID, licence });
    }
    for (const packageSlug of ["florida-week", "grand-tour", "nevim"]) {
      parse(inquirySchema, { ...VALID, packageSlug });
    }
    for (const pilotCount of ["1", "2", "3 a víc"]) parse(inquirySchema, { ...VALID, pilotCount });
    for (const companions of ["Ano", "Ne", "Ještě nevím"]) {
      parse(inquirySchema, { ...VALID, companions });
    }
  });

  test("souhlas se nezaškrtává, poptávka projde bez něj", () => {
    // Rozhodnutí 10. 10.: místo zaškrtávátka jen informační věta.
    const data = parse(inquirySchema, { ...VALID, consent: "" });
    assert.equal("consent" in data, false);
  });
});

describe("poptávka: neplatná data", () => {
  test("prázdný formulář hlásí povinná pole hláškami z prototypu", () => {
    assert.deepEqual(errorsOf(inquirySchema, EMPTY), {
      licence: "Vyberte licenci, nebo možnost Nemám.",
      packageSlug: "Vyberte výlet, nebo možnost Zatím nevím.",
      travelDate: "Napište přibližný termín, třeba měsíc.",
      pilotCount: "Vyberte počet pilotů.",
      name: "Napište své jméno.",
      email: "Zadejte e-mail ve tvaru jmeno@domena.cz.",
    });
  });

  test("pole jen z mezer je prázdné", () => {
    const errors = errorsOf(inquirySchema, { ...VALID, name: "   ", travelDate: "\n\t" });
    assert.equal(errors.name, MESSAGES.name);
    assert.equal(errors.travelDate, MESSAGES.travelDate);
  });

  test("špatný tvar e-mailu", () => {
    for (const email of [
      "jan",
      "jan@",
      "jan@seznam",
      "@seznam.cz",
      "jan novak@seznam.cz",
      "jan@seznam@cz.cz",
      "jan..novak@seznam.cz",
      "jan@seznam.cz,druhy@seznam.cz",
      `${"a".repeat(250)}@b.cz`,
    ]) {
      assert.deepEqual(errorsOf(inquirySchema, { ...VALID, email }), { email: MESSAGES.email }, email);
    }
  });

  test("vyplněný telefon musí mít aspoň 9 číslic", () => {
    assert.equal(
      errorsOf(inquirySchema, { ...VALID, phone: "602 214 71" }).phone,
      "Telefon napište aspoň s 9 číslicemi, nebo pole nechte prázdné.",
    );
    assert.equal(errorsOf(inquirySchema, { ...VALID, phone: "volejte večer" }).phone, MESSAGES.phone);
    parse(inquirySchema, { ...VALID, phone: "602214719" });
  });

  test("hodnota mimo nabídku (podvržený formulář)", () => {
    assert.equal(errorsOf(inquirySchema, { ...VALID, licence: "SPL" }).licence, MESSAGES.licence);
    assert.equal(
      errorsOf(inquirySchema, { ...VALID, packageSlug: "luxury" }).packageSlug,
      MESSAGES.packageSlug,
    );
    assert.equal(errorsOf(inquirySchema, { ...VALID, pilotCount: "5" }).pilotCount, MESSAGES.pilotCount);
    assert.equal(errorsOf(inquirySchema, { ...VALID, companions: "Možná" }).companions, MESSAGES.option);
    assert.equal(
      errorsOf(inquirySchema, { ...VALID, referralSource: "Z televize" }).referralSource,
      MESSAGES.option,
    );
  });

  test("maximální délky", () => {
    assert.equal(
      errorsOf(inquirySchema, { ...VALID, name: "J".repeat(121) }).name,
      MESSAGES.tooLong(120),
    );
    parse(inquirySchema, { ...VALID, name: "J".repeat(120) });
    assert.equal(
      errorsOf(inquirySchema, { ...VALID, travelDate: "x".repeat(121) }).travelDate,
      MESSAGES.tooLong(120),
    );
    assert.equal(
      errorsOf(inquirySchema, { ...VALID, aboutPilot: "x".repeat(2001) }).aboutPilot,
      MESSAGES.tooLong(2000),
    );
    assert.equal(
      errorsOf(inquirySchema, { ...VALID, message: "x".repeat(2001) }).message,
      MESSAGES.tooLong(2000),
    );
    assert.equal(errorsOf(inquirySchema, { ...VALID, phone: "1".repeat(41) }).phone, MESSAGES.tooLong(40));
  });

  test("u každého pole jen první chyba", () => {
    const errors = errorsOf(inquirySchema, { ...VALID, phone: "1 ".repeat(30) });
    assert.deepEqual(Object.keys(errors), ["phone"]);
    assert.equal(errors.phone, MESSAGES.tooLong(40));
  });
});

describe("žádost o zavolání", () => {
  test("jméno a telefon stačí", () => {
    const data = parse(callbackSchema, { name: " Jana ", phone: "602 214 719" });
    assert.deepEqual(data, { name: "Jana", phone: "602 214 719" });
  });

  test("telefon je povinný a musí mít aspoň 9 číslic", () => {
    assert.deepEqual(errorsOf(callbackSchema, { name: "", phone: "" }), {
      name: "Napište své jméno.",
      phone: "Napište telefon, aspoň 9 číslic.",
    });
    assert.equal(
      errorsOf(callbackSchema, { name: "Jana", phone: "12345678" }).phone,
      MESSAGES.callbackPhone,
    );
  });
});

describe("kontrola v prohlížeči", () => {
  /** Chyby, které by formulář ukázal před odesláním (src/lib/inquiries/fields.ts). */
  function clientErrors(input) {
    const out = {};
    for (const field of INQUIRY_FIELDS) {
      const message = checkInquiryField(field, input[field] ?? "");
      if (message) out[field] = message;
    }
    return out;
  }

  function serverErrors(schema, input) {
    const result = schema.safeParse(input);
    return result.success ? {} : firstErrors(result.error);
  }

  test("kroky formuláře obsahují všechna pole poptávky v pořadí", () => {
    assert.deepEqual(INQUIRY_STEPS.flat(), [...INQUIRY_FIELDS]);
  });

  test("hlásí stejné chyby a hlášky jako server", () => {
    const cases = [
      VALID,
      EMPTY,
      { ...VALID, aboutPilot: "", companions: "", phone: "", referralSource: "", message: "" },
      { ...VALID, name: "   ", travelDate: "\n\t" },
      { ...VALID, name: "  Jan \n  Novák\t", travelDate: " duben\r\n2027 " },
      { ...VALID, phone: "602 214 71" },
      { ...VALID, phone: "volejte večer" },
      { ...VALID, phone: "1 ".repeat(30) },
      { ...VALID, phone: " +420  602 214\n719 " },
      { ...VALID, licence: "SPL", packageSlug: "luxury", pilotCount: "5" },
      { ...VALID, companions: "Možná", referralSource: "Z televize" },
      { ...VALID, name: "J".repeat(121), travelDate: "x".repeat(121) },
      { ...VALID, name: "J".repeat(120), travelDate: "x".repeat(120) },
      { ...VALID, aboutPilot: "x".repeat(2001), message: "x".repeat(2001) },
      { ...VALID, aboutPilot: ` ${"x".repeat(2000)} `, message: "x".repeat(2000) },
      { ...VALID, email: "jan" },
      { ...VALID, email: "jan@seznam" },
      { ...VALID, email: "jan novak@seznam.cz" },
      { ...VALID, email: `${"a".repeat(250)}@b.cz` },
      { ...VALID, email: "  jan.novak@example.cz " },
    ];
    for (const input of cases) {
      assert.deepEqual(clientErrors(input), serverErrors(inquirySchema, input), JSON.stringify(input));
    }
  });

  test("e-mail kontroluje volněji, přísnější chybu ukáže až server", () => {
    for (const email of ["jan..novak@seznam.cz", "jan@seznam.c"]) {
      assert.equal(checkInquiryField("email", email), undefined, email);
      assert.equal(serverErrors(inquirySchema, { ...VALID, email }).email, MESSAGES.email, email);
    }
  });

  test("žádost o zavolání hlásí totéž co server", () => {
    for (const input of [
      { name: "", phone: "" },
      { name: " Jana ", phone: "602 214 719" },
      { name: "Jana", phone: "12345678" },
      { name: "J".repeat(121), phone: "1".repeat(41) },
    ]) {
      const client = {};
      for (const field of ["name", "phone"]) {
        const message = checkCallbackField(field, input[field]);
        if (message) client[field] = message;
      }
      assert.deepEqual(client, serverErrors(callbackSchema, input), JSON.stringify(input));
    }
  });
});

describe("čtení FormData", () => {
  test("chybějící pole jsou prázdná, soubory a cizí pole se zahodí", () => {
    const fd = new FormData();
    fd.set("name", "Jan");
    fd.set("email", new Blob(["x"]), "soubor.txt");
    fd.set("$ACTION_ID_abc", "");
    fd.set("isAdmin", "true");
    const values = readFields(fd, INQUIRY_FIELDS);
    assert.deepEqual(Object.keys(values), [...INQUIRY_FIELDS]);
    assert.equal(values.name, "Jan");
    assert.equal(values.email, "");
    assert.equal(values.licence, "");
    assert.equal("isAdmin" in values, false);
  });

  test("odeslaný formulář projde schématem stejně jako objekt", () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(VALID)) fd.set(k, v);
    assert.deepEqual(parse(inquirySchema, readFields(fd, INQUIRY_FIELDS)), VALID);
  });
});

describe("výlety", () => {
  test("parametr ?vylet= (dřív ?balicek=) z odkazů na web", () => {
    assert.equal(packageFromParam("florida-week"), "florida-week");
    assert.equal(packageFromParam("Week"), "florida-week");
    assert.equal(packageFromParam("2"), "grand-tour");
    assert.equal(packageFromParam("nevim"), "nevim");
    assert.equal(packageFromParam("neco"), null);
    assert.equal(packageFromParam(null), null);
  });

  test("název výletu pro e-mail a administraci", () => {
    assert.equal(packageName("grand-tour"), "Florida Grand Tour & Fly");
    assert.equal(packageName("nevim"), "Zatím neví");
    assert.equal(packageName("zruseny-vylet"), "zruseny-vylet");
    assert.equal(packageName(null), null);
  });
});

describe("token proti robotům", () => {
  const now = Date.now();

  test("token vyplněný dost dlouho je platný", () => {
    assert.equal(checkFormToken(createFormToken(now - MIN_FILL_MS - 1), now), "ok");
    assert.equal(checkFormToken(createFormToken(now - MAX_FORM_AGE_MS + 1000), now), "ok");
  });

  test("náhradní token po vypršení platí hned, po podvrženém až za 3 s", () => {
    // Tak je vydává checkSpam v src/app/(web)/kontakt/actions.ts.
    assert.equal(checkFormToken(createFormToken(now - MIN_FILL_MS), now), "ok");
    assert.equal(checkFormToken(createFormToken(now), now), "too-fast");
  });

  test("odeslání hned po vykreslení je příliš rychlé", () => {
    assert.equal(checkFormToken(createFormToken(now), now), "too-fast");
    assert.equal(checkFormToken(createFormToken(now - MIN_FILL_MS + 500), now), "too-fast");
  });

  test("vypršelý token je expired, budoucí, podvržený nebo chybějící invalid", () => {
    const token = createFormToken(now - 10_000);
    const [time, signature] = token.split(".");
    assert.equal(checkFormToken(createFormToken(now - MAX_FORM_AGE_MS - 1), now), "expired");
    assert.equal(checkFormToken(createFormToken(now + 5 * 60_000), now), "invalid");
    assert.equal(checkFormToken(`${Number(time) - 60_000}.${signature}`, now), "invalid");
    const flipped = signature.endsWith("A") ? "B" : "A";
    assert.equal(checkFormToken(`${time}.${signature.slice(0, -1)}${flipped}`, now), "invalid");
    assert.equal(checkFormToken(`${token}.navic`, now), "invalid");
    for (const bad of ["", "abc", "123", ".", "1.2.3", `-1.${signature}`, `1e3.${signature}`]) {
      assert.equal(checkFormToken(bad, now), "invalid", bad);
    }
  });

  test("token podepsaný jiným klíčem neprojde", () => {
    const token = createFormToken(now - 10_000);
    const original = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = randomBytes(32).toString("base64url");
    try {
      assert.equal(checkFormToken(token, now), "invalid");
    } finally {
      process.env.AUTH_SECRET = original;
    }
  });
});

describe("otisk IP", () => {
  test("stejná IP dá stejný otisk, IP v něm není vidět", () => {
    const hash = hashIp("203.0.113.7");
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.equal(hashIp("203.0.113.7"), hash);
    assert.notEqual(hashIp("203.0.113.8"), hash);
  });

  test("sůl mění otisk, bez soli i AUTH_SECRET se otisk nedělá", () => {
    const withAuthSecret = hashIp("203.0.113.7");
    const authSecret = process.env.AUTH_SECRET;
    process.env.IP_HASH_SALT = randomBytes(16).toString("hex");
    try {
      assert.notEqual(hashIp("203.0.113.7"), withAuthSecret);
      delete process.env.IP_HASH_SALT;
      delete process.env.AUTH_SECRET;
      assert.equal(hashIp("203.0.113.7"), null);
    } finally {
      delete process.env.IP_HASH_SALT;
      process.env.AUTH_SECRET = authSecret;
    }
  });

  test("IP z hlaviček", () => {
    assert.equal(clientIp(new Headers({ "x-real-ip": "203.0.113.7" })), "203.0.113.7");
    assert.equal(
      clientIp(new Headers({ "x-forwarded-for": " 203.0.113.9 , 10.0.0.1" })),
      "203.0.113.9",
    );
    assert.equal(clientIp(new Headers()), null);
  });
});
