export type VoiceStatus = "idle" | "starting" | "listening" | "processing" | "result" | "no-match" | "permission-denied" | "unavailable" | "error";
export interface VoiceSnapshot { status: VoiceStatus; transcript: string; confidence?: number; message?: string }
export interface VoiceResult { transcript: string; confidence?: number }
export interface VoiceInput {
  subscribe(listener: () => void): () => void;
  getSnapshot(): VoiceSnapshot;
  start(onResult: (result: VoiceResult) => void): void;
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
    if (engine) {
      engine.onaudiostart = engine.onaudioend = engine.onend = engine.onnomatch = engine.onerror = engine.onresult = null;
      try { engine.abort(); } catch { /* Already ended. */ }
    }
  }
  private finish(snapshot: VoiceSnapshot) { this.release(); this.publish(snapshot); }
  private deadline(milliseconds: number, message: string) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.finish({ status: "error", transcript: "", message }), milliseconds);
  }

  start = (onResult: (result: VoiceResult) => void) => {
    this.release();
    if (!this.factory) { this.publish({ status: "unavailable", transcript: "" }); return; }
    this.publish({ status: "starting", transcript: "" });
    try {
      const engine = this.factory();
      this.engine = engine;
      engine.lang = "fi-FI";
      engine.continuous = false;
      engine.interimResults = false;
      engine.maxAlternatives = 1;
      const active = () => this.engine === engine;
      engine.onaudiostart = () => {
        if (!active()) return;
        this.publish({ status: "listening", transcript: "" });
        this.deadline(30_000, "Kuuntelu päättyi aikarajaan. Kokeile lyhyempää kysymystä tai kirjoita haku.");
      };
      engine.onaudioend = () => {
        if (!active()) return;
        this.publish({ status: "processing", transcript: "" });
        this.deadline(10_000, "Puheentunnistus ei vastannut. Kokeile uudelleen tai kirjoita haku.");
      };
      engine.onresult = (event) => {
        if (!active()) return;
        const result = event.results[event.resultIndex];
        if (!result?.isFinal) return;
        const transcript = result[0].transcript.trim();
        if (!transcript) { this.finish({ status: "no-match", transcript: "" }); return; }
        const confidence = result[0].confidence;
        this.finish({ status: "result", transcript, confidence });
        onResult({ transcript, confidence });
      };
      engine.onnomatch = engine.onend = () => { if (active()) this.finish({ status: "no-match", transcript: "" }); };
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
        if (active() && permission === "denied") {
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
