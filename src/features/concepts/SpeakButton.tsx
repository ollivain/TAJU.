import { useEffect, useState, useSyncExternalStore } from "react";
import { Square, Volume2 } from "lucide-react";
import { BrowserSpeechOutput } from "../../services/speech/SpeechOutput";

export function SpeakButton({ text, lang = "fi-FI" }: { text: string; lang?: string }) {
  const [speech] = useState(() => new BrowserSpeechOutput());
  const status = useSyncExternalStore(speech.subscribe, speech.getSnapshot);
  useEffect(() => {
    const hidden = () => { if (document.hidden) speech.stop(); };
    document.addEventListener("visibilitychange", hidden);
    return () => { document.removeEventListener("visibilitychange", hidden); speech.stop(); };
  }, [speech, text, lang]);
  const active = status === "starting" || status === "speaking";
  return (
    <div className="concept-speech">
      <button type="button" className="text-button concept-speak" disabled={status === "unavailable"} aria-label={active ? "Lopeta lukeminen" : "Kuuntele selitys"} onClick={() => active ? speech.stop() : speech.speak(text, lang)}>
        {active ? <Square size={16} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
        {active ? "Lopeta" : "Kuuntele selitys"}
      </button>
      <span role="status" className="concept-meta">{status === "unavailable" ? "Ääneenluku ei ole käytettävissä tässä selaimessa." : status === "error" ? "Ääneenluku ei onnistunut. Kokeile uudelleen." : status === "starting" ? "Valmistellaan ääntä…" : status === "speaking" ? "Luetaan määritelmää." : ""}</span>
    </div>
  );
}
