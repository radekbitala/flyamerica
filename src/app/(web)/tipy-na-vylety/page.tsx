import { Arrow } from "@/components/web/ArrowSymbol";
import { CtaSection } from "@/components/web/CtaSection";
import { Figure } from "@/components/web/Figure";
import { PageHead } from "@/components/web/PageHead";
import { Photo } from "@/components/web/Photo";
import { pageMetadata } from "@/lib/metadata";

// Tipy na výlety podle prototyp/tipy-na-vylety.html. Texty destinací doslova
// z Honzova „Výběru destinací kam letět“ (10. 10. 2026), názvy a kódy letišť
// tak, jak je Honza napsal. Kotvy destinací (#fa83, #cedar-key, ...) jsou
// cíle odkazů z úvodní stránky, nepřejmenovávat.
export const metadata = pageMetadata({
  title: "Tipy na výlety",
  description:
    "Tipy na výlety z Orlanda od Honzy Čermáka: Orlando North Airpark, Cedar Key, Albert Whitted, Vero Beach, Palatka, Kissimmee, Merritt Island, Key West a Everglades.",
  path: "/tipy-na-vylety",
});

/** sizes dlaždice v přehledu (.tipy-prehled: 4 / 2 sloupce, na mobilu náhled 112 px vlevo). */
const TILE_SIZES = "(max-width: 600px) 112px, (max-width: 1100px) 50vw, 270px";
/** sizes fotky v galerii destinace na 3 sloupce (.dest-gal). Fotky jen 580 px (2010) next/image nezvětší. */
const GALLERY_SIZES = "(max-width: 600px) 100vw, (max-width: 960px) 50vw, 370px";
/** sizes fotky v galerii destinace na 2 sloupce (.dest-gal--2). */
const GALLERY_2_SIZES = "(max-width: 600px) 100vw, 50vw";

export default function TipsPage() {
  return (
    <>
      {/* ===== ZÁHLAVÍ STRÁNKY (stránka sekce: bez drobečků) ===== */}
      <PageHead
        label="Tipy na výlety"
        title={<>Kam z&nbsp;Orlanda doletět</>}
        perex={<>Výběr destinací od Honzy: domovská základna Orlando North Airpark a&nbsp;sedm míst, kam se z&nbsp;ní dá letět. U&nbsp;každého najdete zajímavosti a&nbsp;důvod, proč tam letět.</>}
      />

      {/* ===== PŘEHLED: dlaždice s proklikem na detail níže (kód letiště jen v trase, Overpass Mono) ===== */}
      <section className="sec sec--tight tipy-prehled" id="prehled" aria-labelledby="prehled-nadpis">
        <div className="fa-wrap">
          <h2 className="vh" id="prehled-nadpis">Přehled destinací</h2>
          {/* První řada dlaždic je hned pod záhlavím: v modelu bez loading="lazy", tady priority (bez líného načítání). */}
          <div className="grid-4">
            <a className="tip" href="#fa83">
              <div className="tip-img"><Photo photo="fa83-orlando-north-letecky" sizes={TILE_SIZES} priority /></div>
              <h3>Orlando North Airpark - Naše domovská základna</h3>
              <div className="route">FA83</div>
              <p>Malé, komunitní a&nbsp;dříve zemědělské letiště s&nbsp;pohodovou atmosférou, které slouží jako ideální výchozí bod pro úniky z&nbsp;turistického shonu Orlanda.</p>
            </a>
            <a className="tip" href="#cedar-key">
              <div className="tip-img"><Photo photo="cedar-key-letecky" sizes={TILE_SIZES} priority /></div>
              <h3>Cedar Key Airport</h3>
              <div className="route">FA83 <Arrow /> KCDK</div>
              <p>Unikátní asfaltová dráha doslova na krok od Mexického zálivu.</p>
            </a>
            <a className="tip" href="#albert-whitted">
              <div className="tip-img"><Photo photo="albert-whitted-letecky" sizes={TILE_SIZES} priority /></div>
              <h3>Albert Whitted Airport - St.&nbsp;Petersburg</h3>
              <div className="route">FA83 <Arrow /> KSPG</div>
              <p>Městské letiště umístěné přímo na nábřeží v&nbsp;zálivu Tampa Bay, jen pár kroků od muzea Salvadora Dalího a&nbsp;přístavu.</p>
            </a>
            <a className="tip" href="#vero-beach">
              <div className="tip-img"><Photo photo="vero-beach-stojanka" sizes={TILE_SIZES} priority /></div>
              <h3>Vero Beach Regional Airport</h3>
              <div className="route">FA83 <Arrow /> KVRB</div>
              <p>Moderní a&nbsp;výborně vybavené regionální letiště na pobřeží Atlantiku, které dýchá bohatou historií spojenou s&nbsp;výcvikem pilotů a&nbsp;leteckým průmyslem.</p>
            </a>
            <a className="tip" href="#palatka">
              <div className="tip-img"><Photo photo="palatka-tankovani" sizes={TILE_SIZES} /></div>
              <h3>Palatka Municipal Airport / Kay Larkin Airport</h3>
              <div className="route">FA83 <Arrow /> KFLZ</div>
              <p>Klidné letiště ležící v&nbsp;blízkosti řeky St.&nbsp;Johns, obklopené typickou floridskou přírodou a&nbsp;historickým městem Palatka.</p>
            </a>
            <a className="tip" href="#kissimmee">
              <div className="tip-img"><Photo photo="kissimmee-falcon" sizes={TILE_SIZES} /></div>
              <h3>Kissimmee Gateway Airport</h3>
              <div className="route">FA83 <Arrow /> KISM</div>
              <p>Rušnější a&nbsp;perfektně vybavené řízené letiště jižně od Orlanda, které je oblíbenou základnou pro soukromá a&nbsp;byznysová letadla, ale skvěle připravené i&nbsp;pro menší stroje typu C182.</p>
            </a>
            <a className="tip" href="#merritt-island">
              <div className="tip-img"><Photo photo="merritt-island-pristani" sizes={TILE_SIZES} /></div>
              <h3>Merritt Island Airport</h3>
              <div className="route">FA83 <Arrow /> KCOI</div>
              <p>Letiště situované na stejnojmenném ostrově v&nbsp;těsné blízkosti vesmírného pobřeží (Space Coast).</p>
            </a>
            <a className="tip" href="#key-west-everglades">
              <div className="tip-img"><Photo photo="key-west-plaz" sizes={TILE_SIZES} /></div>
              <h3>Key&nbsp;West International Airport &amp; Everglades</h3>
              <div className="route">FA83 <Arrow /> EYW</div>
              <p>Přistání na Key Westu nabízí ikonické panorama korálových ostrovů a&nbsp;tyrkysového moře pod křídly.</p>
            </a>
          </div>
        </div>
      </section>

      {/* ===== DETAILY DESTINACÍ: texty doslova z Honzova „Výběru destinací kam letět“ (10. 10. 2026),
           názvy a kódy letišť tak, jak je Honza napsal. Kód s polem (.fa-code) jen v záhlaví detailu. ===== */}
      <section className="sec sec--white dest" id="fa83" aria-labelledby="fa83-nadpis">
        <div className="fa-wrap">
          <div className="dest-head">
            <span className="fa-code">FA83</span>
            <h2 id="fa83-nadpis">Orlando North Airpark - Naše domovská základna</h2>
          </div>
          <div className="prose">
            <h3>Zajímavosti</h3>
            <p>Malé, komunitní a&nbsp;dříve zemědělské letiště s&nbsp;pohodovou atmosférou, které slouží jako ideální výchozí bod pro úniky z&nbsp;turistického shonu Orlanda. Žádné poplatky za odbavení, jen čistá letecká svoboda mezi floridskými jezery a&nbsp;sady s&nbsp;pomeranči.</p>
            <h3>Proč je dobré odtud létat</h3>
            <p>Perfektní logistika pro starty bez zdržování v&nbsp;hustém provozu, přátelská místní atmosféra a&nbsp;okamžitý nálet do krásného floridského vzdušného prostoru.</p>
          </div>
          <p className="dest-todo"><span className="todo">[doplnit: jak daleko je to z&nbsp;Orlanda, tip pro piloty]</span></p>
          <div className="gallery dest-gal dest-gal--2">
            <Figure photo="fa83-orlando-north-letecky" sizes={GALLERY_2_SIZES} />
            <Figure photo="fa83-pripravy-pred-odletem" sizes={GALLERY_2_SIZES} />
          </div>
          <p className="dest-back"><a className="fa-link" href="#prehled">Zpět na přehled tipů</a></p>
        </div>
      </section>
      <section className="sec dest" id="cedar-key" aria-labelledby="cedar-key-nadpis">
        <div className="fa-wrap">
          <div className="dest-head">
            <span className="fa-code">KCDK</span>
            <h2 id="cedar-key-nadpis">Cedar Key Airport</h2>
          </div>
          <div className="prose">
            <h3>Zajímavosti</h3>
            <p>Unikátní asfaltová dráha doslova na krok od Mexického zálivu. Městečko si zachovalo starou floridskou ospalou atmosféru bez velkých hotelových resortů.</p>
            <h3>Proč je dobré tam letět</h3>
            <p>Absolutní letecká klasika - přistanete a&nbsp;kousek od letiště se můžete projít po dřevěných molech a&nbsp;dát si vyhlášené čerstvé ústřice a&nbsp;mořské plody v&nbsp;místních rodinných restauracích.</p>
          </div>
          <p className="dest-todo"><span className="todo">[doplnit: jak dlouho se letí z&nbsp;Orlanda, tip pro piloty]</span></p>
          {/* Fotka „Letiště Lewis (CDK)“ jen jako dlaždice: popisek z archivu má jiný kód než Honza (KCDK), čeká na potvrzení kódů */}
          <div className="gallery dest-gal dest-gal--2">
            <Figure photo="cedar-key-cessna-170" sizes={GALLERY_2_SIZES} />
            <Figure photo="cedar-key-okoli" sizes={GALLERY_2_SIZES} />
          </div>
          <p className="dest-back"><a className="fa-link" href="#prehled">Zpět na přehled tipů</a></p>
        </div>
      </section>
      <section className="sec sec--white dest" id="albert-whitted" aria-labelledby="albert-whitted-nadpis">
        <div className="fa-wrap">
          <div className="dest-head">
            <span className="fa-code">KSPG</span>
            <h2 id="albert-whitted-nadpis">Albert Whitted Airport - St.&nbsp;Petersburg</h2>
          </div>
          <div className="prose">
            <h3>Zajímavosti</h3>
            <p>Městské letiště umístěné přímo na nábřeží v&nbsp;zálivu Tampa Bay, jen pár kroků od muzea Salvadora Dalího a&nbsp;přístavu.</p>
            <h3>Proč je dobré tam letět</h3>
            <p>Přiblížení (approach) s&nbsp;výhledem na mrakodrapy a&nbsp;tyrkysovou hladinu zálivu je nezapomenutelný zážitek. Letiště má skvělou restauraci přímo na ploše, odkud můžete sledovat provoz na dráze a&nbsp;skvěle poobědvat.</p>
          </div>
          <p className="dest-todo"><span className="todo">[doplnit: jak dlouho se letí z&nbsp;Orlanda, tip pro piloty]</span></p>
          <div className="gallery dest-gal">
            <Figure photo="albert-whitted-letecky" sizes={GALLERY_SIZES} />
            <Figure photo="albert-whitted-vyhled-z-restaurace" sizes={GALLERY_SIZES} />
            <Figure photo="albert-whitted-budova" sizes={GALLERY_SIZES} />
          </div>
          <p className="dest-back"><a className="fa-link" href="#prehled">Zpět na přehled tipů</a></p>
        </div>
      </section>
      <section className="sec dest" id="vero-beach" aria-labelledby="vero-beach-nadpis">
        <div className="fa-wrap">
          <div className="dest-head">
            <span className="fa-code">KVRB</span>
            <h2 id="vero-beach-nadpis">Vero Beach Regional Airport</h2>
          </div>
          <div className="prose">
            <h3>Zajímavosti</h3>
            <p>Moderní a&nbsp;výborně vybavené regionální letiště na pobřeží Atlantiku, které dýchá bohatou historií spojenou s&nbsp;výcvikem pilotů a&nbsp;leteckým průmyslem.</p>
            <h3>Proč je dobré tam letět</h3>
            <p>Spojení perfektní infrastruktury pro GA (general aviation) s&nbsp;okamžitou dostupností krásných klidných pláží a&nbsp;příjemných restaurací u&nbsp;oceánu. Skvělá a&nbsp;pohodová trať z&nbsp;vnitrozemí k&nbsp;východnímu pobřeží.</p>
          </div>
          <p className="dest-todo"><span className="todo">[doplnit: jak dlouho se letí z&nbsp;Orlanda, tip pro piloty]</span></p>
          <div className="gallery dest-gal">
            <Figure photo="vero-beach-stojanka" sizes={GALLERY_SIZES} />
            <Figure photo="vero-beach-po-bource" sizes={GALLERY_SIZES} />
            <Figure photo="vero-beach-nase-letadlo" sizes={GALLERY_SIZES} />
          </div>
          <p className="dest-back"><a className="fa-link" href="#prehled">Zpět na přehled tipů</a></p>
        </div>
      </section>
      <section className="sec sec--white dest" id="palatka" aria-labelledby="palatka-nadpis">
        <div className="fa-wrap">
          <div className="dest-head">
            <span className="fa-code">KFLZ</span>
            <h2 id="palatka-nadpis">Palatka Municipal Airport / Kay Larkin Airport</h2>
          </div>
          <div className="prose">
            <h3>Zajímavosti</h3>
            <p>Klidné letiště ležící v&nbsp;blízkosti řeky St.&nbsp;Johns, obklopené typickou floridskou přírodou a&nbsp;historickým městem Palatka.</p>
            <h3>Proč je dobré tam letět</h3>
            <p>Ideální zastávka pro piloty, kteří mají rádi nekomplikované přistání, zelené scenérie severovýchodní Floridy a&nbsp;možnost odpočinout si od rušnějších řízených letišť.</p>
          </div>
          <p className="dest-todo"><span className="todo">[doplnit: jak dlouho se letí z&nbsp;Orlanda, tip pro piloty, fotky letiště Palatka]</span></p>
          {/* Archivní fotka „Letiště Palatka Larkin (K28J)“ jen jako dlaždice: Honza uvádí KFLZ, kód čeká na potvrzení */}
          <p className="dest-back"><a className="fa-link" href="#prehled">Zpět na přehled tipů</a></p>
        </div>
      </section>
      <section className="sec dest" id="kissimmee" aria-labelledby="kissimmee-nadpis">
        <div className="fa-wrap">
          <div className="dest-head">
            <span className="fa-code">KISM</span>
            <h2 id="kissimmee-nadpis">Kissimmee Gateway Airport</h2>
          </div>
          <div className="prose">
            <h3>Zajímavosti</h3>
            <p>Rušnější a&nbsp;perfektně vybavené řízené letiště jižně od Orlanda, které je oblíbenou základnou pro soukromá a&nbsp;byznysová letadla, ale skvěle připravené i&nbsp;pro menší stroje typu C182.</p>
            <h3>Proč je dobré tam letět</h3>
            <p>Leží strategicky blízko zábavních parků a&nbsp;atrakcí střední Floridy, nabízí perfektní zázemí, plné služby pro letadlo (fuel, parking) a&nbsp;rychlý odskok do celé oblasti.</p>
          </div>
          <p className="dest-todo"><span className="todo">[doplnit: jak dlouho se letí z&nbsp;Orlanda, tip pro piloty, další fotka letiště Kissimmee]</span></p>
          {/* Archivní fotka má jen 580 px a větší originál v záloze není: galerie na 3 sloupce, aby nebyla zvětšená (nález Impeccable 22) */}
          <div className="gallery dest-gal">
            <Figure photo="kissimmee-falcon" sizes={GALLERY_SIZES} />
          </div>
          <p className="dest-back"><a className="fa-link" href="#prehled">Zpět na přehled tipů</a></p>
        </div>
      </section>
      <section className="sec sec--white dest" id="merritt-island" aria-labelledby="merritt-island-nadpis">
        <div className="fa-wrap">
          <div className="dest-head">
            <span className="fa-code">KCOI</span>
            <h2 id="merritt-island-nadpis">Merritt Island Airport</h2>
          </div>
          <div className="prose">
            <h3>Zajímavosti</h3>
            <p>Letiště situované na stejnojmenném ostrově v&nbsp;těsné blízkosti vesmírného pobřeží (Space Coast).</p>
            <h3>Proč je dobré tam letět</h3>
            <p>Je to ideální a&nbsp;nejbližší letecká brána pro půldenní exkurzi do Kennedy Space Center. Z&nbsp;letiště se dá snadno zajistit doprava a&nbsp;během chvíle stojíte pod obřími raketami Saturn&nbsp;V nebo u&nbsp;odpalovacích ramp.</p>
          </div>
          <p className="dest-todo"><span className="todo">[doplnit: jak dlouho se letí z&nbsp;Orlanda, tip pro piloty]</span></p>
          {/* Fotka „Přistání na Merritt Island (MCOI)“ jen jako dlaždice: Honza uvádí KCOI, kód čeká na potvrzení */}
          {/* Fotka FBO má jen 580 px a větší originál v záloze není: galerie na 3 sloupce, aby nebyla zvětšená (nález Impeccable 22) */}
          <div className="gallery dest-gal">
            <Figure photo="merritt-island-space-coast" sizes={GALLERY_SIZES} />
            <Figure photo="merritt-island-fbo" sizes={GALLERY_SIZES} />
          </div>
          <p className="dest-back"><a className="fa-link" href="#prehled">Zpět na přehled tipů</a></p>
        </div>
      </section>
      <section className="sec dest" id="key-west-everglades" aria-labelledby="key-west-everglades-nadpis">
        <div className="fa-wrap">
          <div className="dest-head">
            <span className="fa-code">EYW</span>
            <h2 id="key-west-everglades-nadpis">Key&nbsp;West International Airport &amp; Everglades</h2>
          </div>
          <div className="prose">
            <h3>Zajímavosti</h3>
            <p>Přistání na Key Westu nabízí ikonické panorama korálových ostrovů a&nbsp;tyrkysového moře pod křídly. Oblast Everglades zase představuje unikátní, divoký ekosystém rozsáhlých mokřadů.</p>
            <h3>Proč je dobré tam letět</h3>
            <p>Let nad celým řetězcem ostrovů Florida Keys (Overseas Highway z&nbsp;ptačí perspektivy nemá konkurenci). Kombinace s&nbsp;návštěvou Everglades, kde si objednáte jízdu na rychlém člunu (airboat) mezi mangrovy a&nbsp;zblízka pozorujete aligátory, tvoří absolutní vrchol každé floridské expedice.</p>
          </div>
          <p className="dest-todo"><span className="todo">[doplnit: jak dlouho se letí z&nbsp;Orlanda, tip pro piloty]</span></p>
          <div className="gallery dest-gal">
            <Figure photo="key-west-plaz" sizes={GALLERY_SIZES} />
            <Figure photo="tipy-florida-keys-silnice" sizes={GALLERY_SIZES} />
            <Figure photo="everglades-letecky" sizes={GALLERY_SIZES} />
          </div>
          <p className="dest-back"><a className="fa-link" href="#prehled">Zpět na přehled tipů</a></p>
        </div>
      </section>

      {/* Výzva na konci stránky */}
      <CtaSection />
    </>
  );
}
