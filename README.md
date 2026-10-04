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
- `content/fi/concepts.json` sisältää 49 suomenkielistä käsitettä; `concept-categories.json` sisältää niiden aiheet.
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

## Käsitteet

Päänavigaation **Käsitteet** avaa reitin `/kasitteet`. Suorat osoitteet ovat `/kasitteet/:slug`. Käsitehaussa voi käyttää suomea, englantia, aliaksia, osittaista nimeä tai kysymystä, kuten `Mikä on Ponzi-huijaus?`. Aihevalinta rajaa listaa. Tuloksia näytetään 30 kerrallaan, ja lisää voi avata painikkeella.

Käsitteen sivu näyttää määritelmän ja esimerkin ensin. Yksinkertainen selitys, tarkempi selitys ja mahdolliset lähteet avautuvat erikseen. Tulkinnalliset rajaukset näytetään näkyvästi omassa osiossaan. Liittyvät käsitteet ovat linkkejä. Selainkohtaiset teema-, tekstikoko- ja liikeasetukset toimivat myös tässä osiossa.

Vertailuun voi valita minkä tahansa kaksi käsitettä tai kirjoittaa `Mikä ero on Ponzi-huijauksella ja pyramidihuijauksella?`. Varmat osumat avautuvat rinnakkain, epävarmat vaativat käyttäjän valinnan. Ponzi- ja pyramidihuijauksilla on lisäksi tiedot rahavirrasta, osallistujarakenteesta ja erottavasta piirteestä. Muiden käsitteiden vertailu näyttää määritelmän, yksinkertaisen toimintaperiaatteen ja esimerkin.

### Arkkitehtuuri ja muutetut moduulit

| Tiedostot | Tehtävä |
| --- | --- |
| `content/fi/concepts.json`, `concept-categories.json`, `manifest.json` | Paikallinen, versionoitu sisältö; ei tietokantamigraatiota. |
| `src/domain/concepts/schema.ts` | Yhteinen Zod-skeema ja siitä johdetut tyypit; tunnisteiden, kategorioiden ja viittausten validointi. |
| `src/domain/concepts/normalize.ts`, `query-parser.ts`, `search.ts` | Puhtaat normalisointi-, kysymys- ja hakufunktiot ilman käyttöliittymä- tai selainriippuvuutta. |
| `src/content/ContentRepository.ts`, `loadContent.ts` | Nykyisen sisältörajapinnan laajennus ja ID-/slug-hakemistot. |
| `src/features/concepts/catalog.ts` | Kerran rakennettava hakuhakemisto ja aiheiden nimet. |
| `src/features/concepts/ConceptsPage.tsx`, `ConceptRow.tsx`, `ConceptDetailPage.tsx`, `ConceptComparison.tsx` | Selain, rivit, käsitesivu ja vertailu. |
| `src/services/speech/VoiceInput.ts`, `SpeechOutput.ts` | Korvattavat selainadapterit; käynnistys, tapahtumat, aikarajat, virheet ja peruutus. |
| `src/services/concepts/OnlineConceptSearch.ts`, `src/features/concepts/OnlineConceptFallback.tsx` | Korvattava verkkohakurajapinta, Wikipedia-adapteri ja lähteistettyjen tulosten käyttöliittymä. |
| `src/features/concepts/useVoiceInput.ts`, `SpeakButton.tsx` | Adapterien React-elinkaari ja käyttöliittymän ääneenluku. |
| `src/styles/concepts.css`, `src/main.tsx` | Olemassa oleviin tokeneihin perustuva ulkoasu. |
| `src/app/App.tsx`, `src/app/navigation/BottomNavigation.tsx` | Reitit ja navigaatio. |
| `scripts/validate-content.ts` | Käsitteiden validointi ennen kehityspalvelinta ja tuotantobuildiä. |
| `src/domain/concepts/concepts.test.ts`, `src/services/speech/*.test.ts`, `e2e/concepts.spec.ts` | Sisältö-, haku-, kysymys-, ääni- ja selaintestit. |

Nykyinen käyttöliittymä käyttää aiempaan tapaan staattista `contentCatalog`-oliota. Tuleva tietokanta-adapteri voi palauttaa saman katalogin; etälataus vaatii lisäksi lataus- ja virhetilan sovelluksen alustukseen. Pelkkä hakumoottorin tai puhepalvelun vaihtaminen ei vaadi sisällön tai käsitesivun rakennemuutosta. AI-palvelua tai uusia riippuvuuksia ei lisätty.

### Uuden käsitteen lisääminen

1. Lisää olio tiedostoon `content/fi/concepts.json`. Anna pysyvä, yksilöllinen `id` ja `slug` muodossa `pienia-kirjaimia-ja-yhdysmerkkeja`. ID:t ovat käsitteiden pysyviä sisältöavaimia, eivät listan indeksejä. Älä muuta julkaistuja tunnisteita tai slugeja.
2. Täytä `name`, tarvittaessa `englishName`, sekä `shortDefinition`, `explanation`, `simpleExplanation` ja `example`. Pidä ensimmäinen määritelmä yhdessä lauseessa ja esimerkki konkreettisena.
3. Valitse `category` tiedostosta `concept-categories.json`. Uuden aiheen voi lisätä sinne ilman UI-muutoksia.
4. Täytä taulukot `tags`, `aliases`, `searchKeywords` ja `relatedConceptIds` (tyhjät taulukot ovat sallittuja). Liittyvät käsitteet käyttävät ID:tä, eivät slugia. Lisää puheessa esiintyvät oikeat nimivariaatiot aliaksiksi; selviä kirjoitusvirheitä voi käsitellä sumea haku.
5. Lisää tarvittaessa `nuanceNote` ja tarkistetut `sources: [{ label, url }]`. Lähteet ovat vapaaehtoisia; älä keksi viitteitä. Vapaaehtoinen `comparison` sisältää `mechanism`- ja `distinctiveFeature`-kentät sekä haluttaessa `moneySource`- ja `participantStructure`-kentät.
6. Päivitä `manifest.json`-tiedoston sisältöversio ja aja `npm run content:validate`, `npm test` ja `npm run build`.

Sisältömallissa ei ole kiinteää ylärajaa. Lisääminen ei edellytä uutta komponenttia, reittiä, hakuehtoa tai testien lukumäärävakion muuttamista. Nykyinen haku käy esinormalisoidun hakemiston läpi paikallisesti; huomattavasti suuremmille kokoelmille voidaan vaihtaa indeksoitu hakumoottori saman rajapinnan taakse.

### Verkkohaku puuttuvalle käsitteelle

Kun kirjoitetulle tai puhutulle käsitteelle ei löydy yhtään osumaa TAJUn omasta aineistosta, haku jatkuu automaattisesti Wikipediaan. Tulokset näytetään erillisessä **Verkosta**-osiossa: enintään kolme artikkelia, johdantokatkelmat, kieli, lähdelinkit ja CC BY-SA 4.0 -tekijämaininta. **Hae Googlesta** avaa samalla käsitteellä laajemman verkkohaun uuteen välilehteen. Sovelluksen sisäiset verkkotulokset tulevat vain Wikipediasta.

`OnlineConceptSearch` erottaa palveluntarjoajan käyttöliittymästä. Nykyinen `WikipediaConceptSearch` käyttää julkista [MediaWiki Action API:a](https://www.mediawiki.org/wiki/API:Query), [CirrusSearchin otsikkohakua](https://www.mediawiki.org/wiki/Help:CirrusSearch#Intitle_and_incategory) ja [TextExtracts-katkelmia](https://www.mediawiki.org/wiki/Extension:TextExtracts). Ensin ratkaistaan kysytyn käsitteen täsmällinen sivunimi ja Wikipedian uudelleenohjaukset (`titles` ja `redirects`), ensin suomeksi ja sitten englanniksi. Vasta jos kumpikaan ei löydy, tehdään laajempi otsikkohaku samassa kielijärjestyksessä. Englanninkielinen haku käyttää samaa hakusanaa; sovellus ei käännä kysymystä tai lähdetekstiä. Kaikkia nimiä tai taivutusmuotoja ei löydy.

Uudelleenohjauksessa otsikkona näkyy kysytty nimi ja sen alla lähdeartikkelin nimi: esimerkiksi **Diversiteetti → Monimuotoisuus (sosiologia)**. Näin laajemman haun ensimmäinen lähiaihe ei syrjäytä täsmällistä käsitettä. Jos täsmällistä osumaa ei ole, käyttöliittymä kertoo tulosten olevan vain aiheeseen liittyviä. Artikkelin tiettyyn osioon osoittava ohjaus avaa kyseisen osion; koko artikkelin johdantoa ei tällöin näytetä kysytyn termin määritelmänä.

Kysymysparseri säilyttää verkkoon lähetettävän käsitteen ääkköset. Paikallinen hakuhakemisto normalisoi ne edelleen entiseen tapaan. Verkkohaku odottaa 700 ms kirjoitustaukoa ja vaatii vähintään kolme merkkiä. Olemassa oleva paikallinen osuma, myös kirjoitusvirhe-ehdotus, estää automaattisen verkkohaun. Aihevalinnan piilottamaa paikallista osumaa ei tulkita puuttuvaksi. Vertailussa vain puuttuvat käsitteet haetaan verkosta erikseen; katkelmista ei muodosteta automaattista vertailuvastausta.

Hakusana lähetetään suoraan Wikipediaan [anonyymin CORS-pyynnön](https://www.mediawiki.org/wiki/API:Cross-site_requests#Unauthenticated_CORS_Requests) mukana, ilman evästeitä tai viittaavaa sivuosoitetta. API-avainta, uutta palvelinta tai maksullista palvelua ei tarvita. TAJU ei lisää verkkotuloksia omaan sisältöaineistoon eikä tallenna niitä tai hakuhistoriaa pysyvästi; nykyinen haku näkyy entiseen tapaan sivun URL-parametrissa. Vastaukset validoidaan, teksti renderöidään tekstinä ja artikkelilinkit muodostetaan Wikipedian osoitteesta ja sivutunnisteesta.

Verkkopyyntö keskeytetään haun vaihtuessa tai sivulta poistuttaessa. Jokaisella pyynnöllä on kahdeksan sekunnin aikaraja. Katkennut yhteys, API-virhe ja tyhjä tulos näytetään erikseen; epäonnistuneen haun voi yrittää uudelleen. Yhteyden palautuminen käynnistää haun uudelleen. TAJUn oma aineisto toimii edelleen offline-tilassa. Täsmennyssivu ohjaa käyttäjää valitsemaan oikean merkityksen lähteessä.

### Puhehaku ja ääneenluku

Mikrofonipainike luo selaimen `SpeechRecognition`- tai `webkitSpeechRecognition`-istunnon kielellä `fi-FI`. Käyttö vaatii selaimen tuen ja suojatun yhteyden (HTTPS tai localhost). TAJU näyttää aluksi käynnistymisen; **Kuunnellaan** näkyy vasta `audiostart`-tapahtumasta. Käynnistyksen rinnalla tarkistetaan jo evätty mikrofonilupa Permissions API:lla, jos selain tukee sitä. Alustava tunnistusteksti näkyy jo kuuntelun aikana **Kuultu (alustava)** -rivillä. `audioend` vaihtaa käsittelytilaan. Lopullinen teksti näytetään **Kuultu**-rivillä ja hakukentässä.

Kuuntelun aikana mikrofonin uusi painallus tai **Lopeta ja hae** kutsuu tunnistimen `stop()`-metodia ja odottaa tulosta. Myös tunnistimen `speechend` viimeistelee kuuntelun. Jos selain palauttaa vain alustavan tekstin, se säilytetään istunnon päättyessä tai käsittelyn aikarajan täyttyessä: haku näyttää ehdotukset ja pyytää tarkistamaan tekstin. Alustava tulos ei avaa vertailua automaattisesti. Jokainen tulostapahtuma korvaa aiemman tuloslistan, joten korjautuvat sanat ja moniosaiset kysymykset eivät katoa.

Transkriptio kulkee saman normalisoinnin, deterministisen kysymysparserin ja haun läpi kuin kirjoitettu teksti. Haku järjestää täydet osumat ennen taivutus-, osa-, avainsana- ja sumeita osumia. Suomen sijamuotojen tuki on tarkoituksella rajattu, ei täydellinen morfologinen analyysi. Kirjoitusvirheen tai matalan ilmoitetun tunnistusvarmuuden kohdalla näytetään **Tarkoititko**. Yksittäistä käsitesivua ei koskaan avata automaattisesti. Epävarmaa vertailua ei tulkita valmiiksi vastaukseksi.

Erillinen **Peruuta puhehaku** kutsuu `abort()`-metodia ja hylkää istunnon tekstin muuttamatta aiempaa hakua. Peruutus toimii myös käynnistyksen ja käsittelyn aikana. Kirjoittaminen, sivulta poistuminen ja välilehden piilottaminen vapauttavat istunnon. Myöhäiset tapahtumat ohitetaan. Käynnistymisellä, kuuntelulla ja käsittelyllä on aikarajat. Luvan epääminen, puuttuva mikrofoni, puuttuva API, verkkovirhe ja tunnistamatta jäänyt puhe eivät estä kirjoitettua hakua. iPhonella hakukenttään voi myös sanella näppäimistön mikrofonilla.

**Kuuntele** käyttää erillistä `speechSynthesis`-adapteria ja lukee käsitteen nimen sekä lyhyen määritelmän käyttäjän pyynnöstä. Se valitsee suomalaisen äänen, jos sellainen on saatavilla. Toiston voi pysäyttää, ja se pysähtyy sivulta poistuttaessa tai välilehden piiloutuessa. Automaattista toistoa ei ole.

Selain voi lähettää äänen oman palveluntarjoajansa palveluun ja vaatia verkkoyhteyden; TAJU ei tallenna ääntä. Saatavilla olevat äänet, tunnistuskielet ja tunnistusvarmuuden raportointi vaihtelevat. Kirjoitettu käsitehaku ja määritelmät toimivat PWA-välimuistin latauduttua offline-tilassa; puhepalvelun offline-toimintaa ei luvata. Katso [MDN: SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) ja [MDN: SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis).

### Tarkistus ja jatkokehitys

Toteutuksen tarkistus 4.10.2026: 117 Vitest-testiä ja 36 Playwright-testiä läpäisty; sisältövalidointi, TypeScript, ESLint ja tuotantobuild läpäisty. Selainkuvat tarkistettu vaaleassa ja tummassa teemassa sekä mobiili- ja työpöytäleveyksillä. Testit kattavat myös sovelluksen aiemmat ydintoiminnot.

Vitest testaa täydet, osittaiset, suomen- ja englanninkieliset sekä sumeat haut, kysymykset ja vertailujen taivutusmuodot. Ääniadaptereissa testataan tapahtumajärjestys, kuuntelun viimeistely, alustavien tulosten säilyminen ja korvautuminen, moniosaiset kysymykset, peruutus, myöhäiset tapahtumat, aikarajat ja virheet. Playwright tarkistaa koko sovelluksen ydintoiminnot sekä käsitehaun, vertailun, navigoinnin, näppäimistökäytön, 320/390/1280 px leveydet, suuren tekstin, Hiili-teeman, vähennetyn liikkeen ja offline-käytön. Puhehaun regressiotestit tarkistavat lopetuspainikkeen, alustavan tekstin näkyvyyden ja haun sekä erillisen peruutuksen.

Verkkohaun automaattiset testit käyttävät hallittuja HTTP-vastauksia: suomi/englanti, täsmälliset nimet, uudelleenohjaukset, osio-ohjaukset, lähiaiheiden erottaminen, puuttuvat sivut, tyhjä tulos, palveluvirhe, uudelleenyritys, aikaraja, vanhan haun peruutus, kirjoitusviive, offline-palautuminen, lähdeviitteet ja HTML:n käsittely tekstinä. Puheesta verkkohakuun siirtyminen testataan selaimessa. Lisäksi **Mikä on emergenssi?**, **Diversiteetti** ja **bounded rationality** tarkistettiin oikeita Wikipedia-vastauksia käyttävällä Chromium-selaimella, ilman verkkopyyntöjen korvaamista.

Puhetestit syöttävät hallittuja tapahtumia **testien selainadapteriin**. Erillinen Chromium-testi käyttää aitoa selaimen lupa- ja puheentunnistusrajapintaa evätyn mikrofoniluvan tarkistamiseen. Testit eivät todista fyysisen mikrofonin, suomalaisen tunnistuspalvelun tai laitteen puheäänen toimivuutta. Oikealla laitteella kannattaa tarkistaa nämä kolme asiaa ennen julkaisua. Kaikki sisältö ei ole lähteistetty; lähdekattavuuden ja toimituksellisen tarkistuksen lisääminen on suositeltava seuraava työ. Sen jälkeen hyödyllisiä parannuksia ovat laajempi taivutusmuotojen testiaineisto sekä useampien käsitteiden toimitetut vertailukentät.

## Nopea haku ja etusivu (0.5)

Asetuksista valitaan aloitusnäkymäksi Sanat tai Käsitteet. Juuri-URL ja uuden PWA-asennuksen käynnistysosoite avaavat valitun etusivun. Vanhan, `/sanat`-osoitteeseen käynnistyvän iPhone-PWA:n valinta huomioidaan ensimmäisessä navigaatiossa. Sovelluksen sisäiset Sanat-linkit ja yksityiskohtasivujen suorat osoitteet toimivat entiseen tapaan. Taustalta palaaminen säilyttää kesken olevan näkymän eikä aloita kuuntelua.

Käsitteiden hakukenttä hakee nyt myös sanakatalogista. Nimien, taivutusmuotojen ja kirjoitusvirheiden käsittely on yhteinen. Yksi selvä nimi- tai taivutusosuma näyttää heti määritelmän, esimerkin ja tallennuspainikkeen. Epävarma puhetunnistus, kirjoitusvirhe tai useampi yhtä vahva osuma jättää valinnan lukijalle. Samannimiset sanat ja käsitteet yhdistetään hakulistalla; yhtä vahvoista osumista suositaan käsitteen laajempaa tietuetta. Osittain täsmäävä sana, kuten biodiversiteetti haussa diversiteetti, ei estä täsmällistä verkkohakua.

Käsitteitä voi tallentaa pikavastauksesta ja käsitesivulta. Käsitteet-sivun Tallennetut näyttää sekä sanat että käsitteet. Käyttäjätilan skeema 3 lisää `savedConcepts`-listan ja säilyttää aiemmat v1/v2-sanatilat, faktat ja syötteiden paikat. Nollaus poistaa myös tallennetut käsitteet, mutta säilyttää etusivu- ja ulkoasuasetukset. Verkkolähteiden tuloksia ei tallenneta tähän listaan.

`/hae?q=<URL-koodattu hakuteksti>` avaa haun etusivuvalinnasta riippumatta. Reitti toimii myös julkaisun `/TAJU./`-polun alla ja ohjaa olemassa olevaan käsitehakuun. `/pikakomento` sisältää iPhone 16 Prolle ja Spotify-käyttöön suunnatun asennusohjeen: median tauotus, iPhonen Sanele teksti, URL-koodaus ja hakuosoitteen avaaminen oletusselaimessa. Pikakomento kootaan ja liitetään Toimintopainikkeeseen käyttäjän puhelimessa; sovellus ei asenna sitä etänä. Sanelun käyttöoikeudet, Face ID, kuulokkeet ja Spotifyn tauotus pitää tarkistaa oikealla laitteella. Selaimen ja kotinäytön sovelluksen tallennustilat voivat olla erillisiä.

Puhehaku alkaa vain Sano sana -painikkeesta tai iPhonen käyttäjän käynnistämästä sanelupikakomennosta. Automaattista vastauksen ääneenlukua ei lisätty; käsitesivun olemassa oleva Kuuntele-toiminto säilyy.

Version 0.5 tarkistus: 122 yksikkötestiä, 44 mobiili-Chromium-testiä ja 8 mobiili-WebKit-testiä läpäisty. TypeScript, ESLint, sisältövalidointi ja tuotantobuild läpäisty. WebKit-testit kattavat uuden etusivuvalinnan, pikahaun, tallennukset, pikakomento-ohjeen ja mobiiliasettelun. Fyysisen iPhonen sanelua ja Spotifyn tauotusta ei ole testattu.
