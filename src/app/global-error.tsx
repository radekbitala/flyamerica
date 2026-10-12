"use client";

import { FA_PHONE, FA_PHONE_HREF } from "@/lib/site";
import { NBSP } from "@/lib/typography";

/*
 * Chyba v kořenovém layoutu webu nebo administrace, kterou error.tsx
 * nezachytí (je pod layoutem). Stránka nahrazuje celý layout, proto má
 * vlastní <html> a <body>. Styly webu (web.css, písma) schválně nenačítá:
 * global-error patří k oběma layoutům a styly webu se nesmí dostat do
 * administrace. Barvy jsou z fa-tokeny.css, písmo systémové. Běžné chyby
 * stránek webu obsluhuje src/app/(web)/error.tsx.
 */

const CSS = `
body { margin: 0; background: #F5F2EC; color: #1D252D; font: 400 18px/1.6 system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
main { box-sizing: border-box; max-width: 1200px; min-height: 100svh; margin: 0 auto; padding: 96px 24px; }
.lbl { font-weight: 700; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: #4E5862; }
h1 { margin: 16px 0 0; font-size: clamp(36px, 7vw, 56px); line-height: 1.05; letter-spacing: -.02em; text-wrap: balance; }
p { margin: 20px 0 0; max-width: 34em; }
.perex { font-size: 21px; line-height: 1.5; color: #4E5862; }
.actions { display: flex; align-items: center; flex-wrap: wrap; gap: 20px 28px; margin-top: 32px; }
button { height: 52px; padding: 0 20px; border: 0; border-radius: 0; background: #1D252D; color: #F5F2EC; font: 700 17px/1 system-ui, sans-serif; letter-spacing: .07em; text-transform: uppercase; cursor: pointer; }
a { color: #1D252D; font-weight: 600; text-underline-offset: .22em; }
button:focus-visible, a:focus-visible { outline: 2px solid #1D252D; outline-offset: 3px; }
.tel { color: #4E5862; }
.tel a { white-space: nowrap; }
`;

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="cs">
      <head>
        <title>Stránku se nepodařilo načíst - FLY America</title>
        <meta name="robots" content="noindex, nofollow" />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>
        <main>
          <span className="lbl">Chyba</span>
          <h1>Stránku se nepodařilo načíst</h1>
          <p className="perex">Na webu se něco pokazilo. Zkuste to prosím znovu, případně za chvíli.</p>
          <div className="actions">
            <button type="button" onClick={() => retry()}>
              Zkusit znovu
            </button>
            {/* Obyčejný odkaz: po chybě v layoutu je bezpečnější načíst úvod celý znovu. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">Na úvodní stránku</a>
          </div>
          <p className="tel">
            Spěcháte? Zavolejte Honzovi: <a href={FA_PHONE_HREF}>{FA_PHONE.replaceAll(" ", NBSP)}</a>
          </p>
        </main>
      </body>
    </html>
  );
}
