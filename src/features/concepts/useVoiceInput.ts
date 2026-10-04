import { useEffect, useState, useSyncExternalStore } from "react";
import { BrowserVoiceInput } from "../../services/speech/VoiceInput";

export function useVoiceInput() {
  const [voice] = useState(() => new BrowserVoiceInput());
  const snapshot = useSyncExternalStore(voice.subscribe, voice.getSnapshot);
  useEffect(() => {
    const hidden = () => { if (document.hidden) voice.cancel(); };
    document.addEventListener("visibilitychange", hidden);
    return () => { document.removeEventListener("visibilitychange", hidden); voice.dispose(); };
  }, [voice]);
  return { ...snapshot, start: voice.start, stop: voice.stop, cancel: voice.cancel };
}
