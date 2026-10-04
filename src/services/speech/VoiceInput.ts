export type VoiceStatus = "idle" | "starting" | "listening" | "processing" | "result" | "no-match" | "permission-denied" | "unavailable" | "error";
export interface VoiceSnapshot { status: VoiceStatus; transcript: string; confidence?: number; isFinal?: boolean; message?: string }
export interface VoiceResult { transcript: string; confidence?: number; isFinal: boolean }
export interface VoiceInput {
  subscribe(listener: () => void): () => void;
  getSnapshot(): VoiceSnapshot;
  start(onResult: (result: VoiceResult) => void): void;
  stop(): void;
  cancel(): void;
  dispose(): void;
}

// Local structural types keep this adapter independent of experimental DOM typings.
export interface RecognitionEngine {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onspeechend: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onnomatch: (() => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string; confidence: number } }> }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export function nativeRecognitionFactory(): (() => RecognitionEngine) | undefined {
  if (typeof window === "undefined" || !window.isSecureContext) return undefined;
  const host = window as unknown as { SpeechRecognition?: new () => RecognitionEngine; webkitSpeechRecognition?: new () => RecognitionEngine };
  const Engine = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  return Engine ? () => new Engine() : undefined;
}

async function readMicrophonePermission(): Promise<PermissionState | undefined> {
  try {
    return (await navigator.permissions?.query({ name: "microphone" as PermissionName }))?.state;
  } catch {
    // Some browsers implement recognition but not this permission descriptor.
    return undefined;
  }
}

export class BrowserVoiceInput implements VoiceInput {
  private snapshot: VoiceSnapshot;
  private listeners = new Set<() => void>();
  private engine?: RecognitionEngine;
  private timer?: ReturnType<typeof setTimeout>;
  private latestResult?: VoiceResult;
  private onResult?: (result: VoiceResult) => void;
  private stopping = false;
  private session = 0;

  constructor(
    private factory = nativeRecognitionFactory(),
    private readPermission: () => Promise<PermissionState | undefined> = readMicrophonePermission,
  ) {
    this.snapshot = { status: factory ? "idle" : "unavailable", transcript: "" };
  }

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(snapshot: VoiceSnapshot) { this.snapshot = snapshot; this.listeners.forEach((listener) => listener()); }
  private release() {
    clearTimeout(this.timer);
    const engine = this.engine;
    this.engine = undefined;
    this.latestResult = undefined;
    this.onResult = undefined;
    this.stopping = false;
    this.session++;
    if (engine) {
      engine.onaudiostart = engine.onaudioend = engine.onspeechend = engine.onend = engine.onnomatch = engine.onerror = engine.onresult = null;
      try { engine.abort(); } catch { /* Already ended. */ }
    }
  }
  private finish(snapshot: VoiceSnapshot) { this.release(); this.publish(snapshot); }
  private deliverLatest() {
    const result = this.latestResult;
    const callback = this.onResult;
    if (!result?.transcript) {
      this.finish({ status: "no-match", transcript: "" });
      return;
    }
    this.finish({
      status: "result",
      ...result,
      message: result.isFinal ? undefined : "Tunnistus jäi alustavaksi. Tarkista kuultu teksti ja valitse oikea käsite.",
    });
    callback?.(result);
  }
  private deadline(milliseconds: number, message: string) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.latestResult?.transcript) this.deliverLatest();
      else this.finish({ status: "error", transcript: "", message });
    }, milliseconds);
  }

  // stop() asks for a result. abort() is reserved for explicit cancellation and
  // cleanup: using it for the microphone's stop button loses Safari's result.
  stop = () => {
    const engine = this.engine;
    if (!engine || this.stopping) return;
    this.stopping = true;
    this.publish({ ...this.snapshot, status: "processing" });
    this.deadline(10_000, "Puheentunnistus ei palauttanut tekstiä. Kokeile uudelleen tai sanele haku näppäimistön mikrofonilla.");
    try { engine.stop(); } catch {
      if (this.latestResult?.transcript) this.deliverLatest();
      else this.finish({ status: "error", transcript: "", message: "Kuuntelua ei voitu viimeistellä. Kokeile uudelleen tai kirjoita haku." });
    }
  };

  start = (onResult: (result: VoiceResult) => void) => {
    this.release();
    if (!this.factory) { this.publish({ status: "unavailable", transcript: "" }); return; }
    this.publish({ status: "starting", transcript: "" });
    try {
      const engine = this.factory();
      this.engine = engine;
      this.onResult = onResult;
      const session = this.session;
      engine.lang = "fi-FI";
      engine.continuous = false;
      engine.interimResults = true;
      engine.maxAlternatives = 1;
      const active = () => this.engine === engine && this.session === session;
      engine.onaudiostart = () => {
        if (!active() || this.stopping) return;
        this.publish({ ...this.snapshot, status: "listening" });
        clearTimeout(this.timer);
        this.timer = setTimeout(this.stop, 30_000);
      };
      engine.onaudioend = () => {
        if (!active()) return;
        this.publish({ ...this.snapshot, status: "processing" });
        if (!this.stopping) this.deadline(10_000, "Puheentunnistus ei palauttanut tekstiä. Kokeile uudelleen tai sanele haku näppäimistön mikrofonilla.");
      };
      engine.onspeechend = () => { if (active()) this.stop(); };
      engine.onresult = (event) => {
        if (!active()) return;
        // The result list is a snapshot, not a stream of new words. Rebuild it
        // so interim corrections and multi-part questions do not lose segments.
        const results = Array.from(event.results);
        const transcript = results.map((result) => result[0]?.transcript.trim() ?? "").filter(Boolean).join(" ");
        const confidences = results.map((result) => result[0]?.confidence).filter((value) => Number.isFinite(value));
        const confidence = confidences.length ? Math.min(...confidences) : undefined;
        const isFinal = results.length > 0 && results.every((result) => result.isFinal);
        this.latestResult = transcript ? { transcript, confidence, isFinal } : undefined;
        this.publish({ ...this.snapshot, transcript, confidence, isFinal });
        if (isFinal) this.deliverLatest();
      };
      engine.onend = () => { if (active()) this.deliverLatest(); };
      engine.onnomatch = () => { if (active()) this.finish({ status: "no-match", transcript: "" }); };
      engine.onerror = ({ error }) => {
        if (!active()) return;
        const status = error === "not-allowed" || error === "service-not-allowed" ? "permission-denied"
          : error === "audio-capture" ? "unavailable" : error === "no-speech" ? "no-match" : error === "aborted" ? "idle" : "error";
        this.finish({ status, transcript: "", message: error === "network" ? "Puhepalveluun ei saada yhteyttä. Tarkista verkkoyhteys tai kirjoita haku." : undefined });
      };
      this.deadline(15_000, "Mikrofoni ei käynnistynyt. Tarkista selaimen lupa tai kirjoita haku.");
      engine.start();
      // Start within the user gesture. Check an already denied permission in
      // parallel: some native engines never emit an error for that condition.
      void this.readPermission().then((permission) => {
        if (active() && this.snapshot.status === "starting" && !this.latestResult && permission === "denied") {
          this.finish({ status: "permission-denied", transcript: "" });
        }
      }, () => { /* Recognition events and the timeout remain the fallback. */ });
    } catch (error) {
      const denied = error instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(error.name);
      this.finish({ status: denied ? "permission-denied" : "unavailable", transcript: "" });
    }
  };

  cancel = () => { this.release(); this.publish({ status: this.factory ? "idle" : "unavailable", transcript: "" }); };
  dispose = () => { this.release(); };
}
