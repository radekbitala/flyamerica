/**
 * Symbol šipky #arr. web.css s ním počítá u odkazů a tabulí:
 * <svg aria-hidden="true" focusable="false"><use href="#arr" /></svg>
 */
export function ArrowSymbol() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
      focusable="false"
    >
      <symbol id="arr" viewBox="0 0 100 70">
        <path d="M0 29h68v12H0z M66 3 L100 35 L66 67z" />
      </symbol>
    </svg>
  );
}

export function Arrow() {
  return (
    <svg aria-hidden="true" focusable="false">
      <use href="#arr" />
    </svg>
  );
}
