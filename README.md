# TAJU

TAJU on mobile-first PWA, joka opettaa kiinnostavia ja käyttökelpoisia suomalaisia sanoja yksi kortti kerrallaan.

## Kehitys

```bash
npm install
npm run dev
```

Keskeiset tarkistukset:

```bash
npm run content:validate
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

## Sisältö

- `content/fi/words.json` sisältää julkaistut, buildissä validoitavat WordEntry-tietueet.
- `content/fi/categories.json` sisältää kontrolloidun kategoriataksonomian.
- `content/fi/manifest.json` versionoi sisältöskeeman ja sisältöjulkaisun.
- `content/backlog/fi-candidates.csv` on erillinen toimituksellinen ehdokaslista eikä päädy sovellusbundleen.

Julkaistulla sanalla on muuttumaton UUID. Slug pidetään vakaana julkaisun jälkeen, jotta suorat sanareitit ja laitteelle tallennettu käyttäjätila säilyvät.

## Käyttäjätila

Tallennetut ja osatut sanat sekä feedin rajattu tila säilytetään versionoituna selainkohtaisessa `localStorage`-dokumentissa. Käyttöliittymä asioi vain `UserWordStateRepository`-rajapinnan kanssa, joten myöhempi synkronoiva adapteri voidaan lisätä muuttamatta feature-komponentteja.

## Asetukset

Lukijan asetukset — tausta, tekstin koko, liike ja sanan alkuperän näyttäminen — säilytetään omassa `SettingsRepository`-rajapinnassaan avaimella `taju:settings:v1`. Rajapinta on tarkoituksella synkroninen, jotta tausta on voimassa jo ensimmäisessä piirrossa. Asetukset ovat erillään edistymisestä: `Nollaa edistyminen` tyhjentää tallennetut ja osatut sanat mutta ei koske asetuksiin.

`SettingsProvider` kirjoittaa valinnat juurielementin `data-theme`-, `data-text-size`- ja `data-motion`-attribuutteihin, ja koko visuaalinen järjestelmä johdetaan niistä CSS:ssä.

## Design

Käyttöliittymä noudattaa hyväksyttyä TAJU-designia: koko ruutu on sanakortti, hierarkia tehdään typografialla ja tyhjällä tilalla, ja osiot erotetaan piirretyillä viivoilla — ei laatikoita, varjoja tai liukuvärejä. Rusko on ainoa aksentti ja vain aktiivisissa tiloissa.

- `src/styles/tokens.css` sisältää typografian, rytmin ja mustesta johdetut sävyt.
- `src/styles/themes.css` sisältää viisi taustateemaa; teema vaihtaa taustan, musteen ja aksentin, ei typografiaa.
- Otsikkofontti sovitetaan mittaamalla (`HeroWord`), joten pitkä yhdyssana säilyttää display-koon eikä kaikkia sanoja tarvitse kutistaa. Sovitus on ensisijainen keino välttää rivinvaihto; jos sana silti taittuu, tavutus jätetään selaimen omalle `hyphens: auto` -sanakirjalle (`lang="fi"`). Sovellus ei tavuta itse: suomen yhdyssanoja ei voi tavuttaa luotettavasti nyrkkisäännöillä, ja väärä tavuviiva on näkyvä virhe.
- Sanan toimintorivi on navigaation yläpuolella omana kerroksenaan, joten sisältö vierii sen alta eikä jää sen taakse. Ylä- ja alareunan täytöt kunnioittavat iPhonen turva-alueita.
