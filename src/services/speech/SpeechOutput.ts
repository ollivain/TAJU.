export type SpeechOutputStatus = "idle" | "starting" | "speaking" | "unavailable" | "error";
export interface SpeechOutput {
  subscribe(listener: () => void): () => void;
  getSnapshot(): SpeechOutputStatus;
  speak(text: string, lang?: string): void;
  stop(): void;
}

export class BrowserSpeechOutput implements SpeechOutput {
  // All result buttons share the browser's single speech queue.
  private static active?: BrowserSpeechOutput;
  private synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  private status: SpeechOutputStatus = this.synth && typeof SpeechSynthesisUtterance !== "undefined" ? "idle" : "unavailable";
  private listeners = new Set<() => void>();
  private utterance?: SpeechSynthesisUtterance;
  private timer?: ReturnType<typeof setTimeout>;
  getSnapshot = () => this.status;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(status: SpeechOutputStatus) { this.status = status; this.listeners.forEach((listener) => listener()); }
  private release() {
    clearTimeout(this.timer);
    if (BrowserSpeechOutput.active === this) BrowserSpeechOutput.active = undefined;
    if (this.utterance) {
      this.utterance.onstart = this.utterance.onend = this.utterance.onerror = null;
      this.utterance = undefined;
      this.synth?.cancel();
    }
  }
  speak = (text: string, lang = "fi-FI") => {
    if (!this.synth || this.status === "unavailable") return;
    BrowserSpeechOutput.active?.stop();
    this.release();
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      this.utterance = utterance;
      BrowserSpeechOutput.active = this;
      utterance.lang = lang;
      const voices = this.synth.getVoices();
      const language = lang.toLowerCase().split("-")[0];
      const voice = voices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase())
        ?? voices.find((voice) => voice.lang.toLowerCase().split("-")[0] === language);
      if (voice) utterance.voice = voice;
      utterance.onstart = () => {
        if (this.utterance !== utterance) return;
        clearTimeout(this.timer);
        this.publish("speaking");
      };
      utterance.onend = () => { if (this.utterance === utterance) { this.release(); this.publish("idle"); } };
      utterance.onerror = () => { if (this.utterance === utterance) { this.release(); this.publish("error"); } };
      this.publish("starting");
      this.timer = setTimeout(() => { this.release(); this.publish("error"); }, 8_000);
      this.synth.speak(utterance);
    } catch { this.release(); this.publish("error"); }
  };
  stop = () => { this.release(); if (this.status !== "unavailable") this.publish("idle"); };
}
