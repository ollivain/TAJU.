import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "../../components/icons";
import { Squiggle } from "../../components/ui/Squiggle";

export function ShortcutGuide() {
  const [copyMessage, setCopyMessage] = useState("");
  const prefix = new URL(`${import.meta.env.BASE_URL}hae?q=`, window.location.origin).href;
  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(prefix);
      setCopyMessage("Osoite kopioitu.");
    } catch {
      setCopyMessage("Valitse ja kopioi osoite alla olevasta kentästä.");
    }
  }

  return <div className="screen"><div className="screen__scroll"><div className="screen__inner shortcut-guide">
    <Link className="back-link" to="/asetukset"><ArrowRightIcon />Takaisin asetuksiin</Link>
    <Squiggle weight={1.2} opacity={0.5} />
    <h1 className="display-heading concept-title">Sana selville napista</h1>
    <p className="concepts-intro">Kuulitko Spotifyssa oudon sanan? Toimintopainike voi käynnistää sanelun ja avata haun TAJUssa.</p>
    <p className="shortcut-flow">Tauko → sanele sana → avaa vastaus</p>
    <p className="settings-help">Kuuntele vastaus napauttamalla TAJUn <strong>Kuuntele selitys</strong> -painiketta. Tämä pikakomento avaa haun; se ei käynnistä ääneenlukua automaattisesti.</p>
    <h2 className="settings-heading">Luo pikakomento kerran iPhonessa</h2>
    <ol className="shortcut-steps">
      <li>Avaa <strong>Pikakomennot</strong>, luo uusi pikakomento ja nimeä se <strong>Selitä sana</strong>.</li>
      <li>Lisää median <strong>Toista/keskeytä (Play/Pause)</strong> -toiminto. Valitse toiminnoksi <strong>Keskeytä (Pause)</strong> ja kohteeksi oma iPhone.</li>
      <li>Lisää <strong>Sanele teksti (Dictate Text)</strong>. Valitse kieleksi suomi ja lopetukseksi puhetauko.</li>
      <li>Lisää <strong>URL-koodaus (URL Encode)</strong> ja anna sille syötteeksi saneltu teksti. Näin myös ääkköset ja välilyönnit toimivat haussa.</li>
      <li>Lisää <strong>Teksti (Text)</strong>. Liitä siihen alla oleva osoite ja lisää heti <strong>=</strong>-merkin jälkeen edellisen vaiheen <strong>URL-koodattu teksti</strong> muuttujana, ilman välilyöntiä.</li>
      <li>Lisää <strong>Avaa URL-osoitteet (Open URLs)</strong> ja anna sille syötteeksi edellisen vaiheen teksti.</li>
    </ol>
    <label className="settings-heading" htmlFor="shortcut-address">Haun osoitteen alku</label>
    <input id="shortcut-address" className="shortcut-address" value={prefix} readOnly onFocus={(event) => event.currentTarget.select()} />
    <button type="button" className="text-button text-button--accent" onClick={() => void copyAddress()}>Kopioi osoite</button>
    <p className="settings-help" role="status">{copyMessage}</p>
    <h2 className="settings-heading">Liitä Toimintopainikkeeseen</h2>
    <p className="settings-help">Avaa iPhonessa <strong>Asetukset → Toimintopainike → Pikakomento</strong> ja valitse <strong>Selitä sana</strong>. iPhone 16 Prossa painiketta pidetään pohjassa pikakomennon käynnistämiseksi.</p>
    <h2 className="settings-heading">Kokeile Spotifyta kuunnellessa</h2>
    <p className="settings-help">Käynnistä podcast, pidä Toimintopainiketta pohjassa ja sano ”mitä tarkoittaa paradoksi”. Salli sanelu ja osoitteen avaaminen, jos iPhone kysyy lupaa. Tarkista, että podcast pysähtyy ja oikea sana näkyy haussa. Paina hakutuloksen <strong>Kuuntele selitys</strong> -painiketta kuullaksesi vastauksen. Jatka kuuntelua lopuksi Spotifysta tai kuulokkeista.</p>
    <p className="settings-help">Pikakomento käyttää iPhonen sanelua ja avaa haun oletusselaimessa. Puhelimen lukitus voi vaatia Face ID:n. Kotinäytön TAJU ja selain voivat säilyttää asetukset ja tallennukset erikseen.</p>
    <Link className="text-button text-button--accent settings-start" to="/hae?q=mit%C3%A4%20tarkoittaa%20paradoksi">Kokeile esimerkkihakua</Link>
    <a className="text-button settings-start" href="https://support.apple.com/guide/shortcuts/apdfea15680b/ios" target="_blank" rel="noreferrer">Applen Toimintopainike-ohje<span className="sr-only"> (avautuu uuteen välilehteen)</span></a>
  </div></div></div>;
}
