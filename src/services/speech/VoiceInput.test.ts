import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserVoiceInput, type RecognitionEngine } from "./VoiceInput";

function setup() {
  const engine: RecognitionEngine = {
    lang: "", continuous: true, interimResults: true, maxAlternatives: 0,
    onaudiostart: null, onaudioend: null, onspeechend: null, onend: null, onerror: null, onnomatch: null, onresult: null,
    start: vi.fn(), stop: vi.fn(), abort: vi.fn(),
  };
  const voice = new BrowserVoiceInput(() => engine);
  const result = vi.fn();
  voice.start(result);
  return { engine, voice, result };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("voice input lifecycle", () => {
  it("shows Safari interim text before a final result arrives", () => {
    const { engine, voice, result } = setup();
    engine.onaudiostart?.();
    engine.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: "Mikä on Ponzi", confidence: 0 } }] });
    expect(engine.interimResults).toBe(true);
    expect(voice.getSnapshot()).toMatchObject({ status: "listening", transcript: "Mikä on Ponzi", isFinal: false });
    expect(result).not.toHaveBeenCalled();
    voice.cancel();
  });

  it("stops capture without discarding the pending final transcript", () => {
    const { engine, voice, result } = setup();
    engine.onaudiostart?.();
    engine.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: "Mikä on Ponzi", confidence: 0 } }] });
    voice.stop();
    expect(engine.stop).toHaveBeenCalledOnce();
    expect(engine.abort).not.toHaveBeenCalled();
    expect(voice.getSnapshot()).toMatchObject({ status: "processing", transcript: "Mikä on Ponzi" });
    engine.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "Mikä on Ponzi-huijaus?", confidence: 0.9 } }] });
    expect(result).toHaveBeenCalledWith({ transcript: "Mikä on Ponzi-huijaus?", confidence: 0.9, isFinal: true });
  });

  it("keeps the whole question when multiple result segments arrive", () => {
    const { engine, voice, result } = setup();
    engine.onaudiostart?.();
    engine.onresult?.({ resultIndex: 0, results: [
      { isFinal: true, 0: { transcript: "Mikä ero on Ponzi-huijauksella", confidence: 0.9 } },
      { isFinal: false, 0: { transcript: "ja pyramidi", confidence: 0 } },
    ] });
    expect(voice.getSnapshot().transcript).toBe("Mikä ero on Ponzi-huijauksella ja pyramidi");
    expect(result).not.toHaveBeenCalled();
    engine.onresult?.({ resultIndex: 1, results: [
      { isFinal: true, 0: { transcript: "Mikä ero on Ponzi-huijauksella", confidence: 0.9 } },
      { isFinal: true, 0: { transcript: "ja pyramidihuijauksella?", confidence: 0.8 } },
    ] });
    expect(result).toHaveBeenCalledWith({ transcript: "Mikä ero on Ponzi-huijauksella ja pyramidihuijauksella?", confidence: 0.8, isFinal: true });
  });

  it("retains tentative text if Safari ends without marking it final", () => {
    const { engine, voice, result } = setup();
    engine.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: "oikofobia", confidence: 0 } }] });
    engine.onend?.();
    expect(voice.getSnapshot()).toMatchObject({ status: "result", transcript: "oikofobia", isFinal: false });
    expect(result).toHaveBeenCalledWith({ transcript: "oikofobia", confidence: 0, isFinal: false });
  });

  it("asks the engine to finalize when speech ends, and stop is idempotent", () => {
    const { engine, voice } = setup();
    engine.onaudiostart?.();
    engine.onspeechend?.();
    voice.stop();
    expect(engine.stop).toHaveBeenCalledOnce();
    expect(voice.getSnapshot().status).toBe("processing");
    voice.cancel();
  });

  it("preserves tentative text when finalization times out", () => {
    vi.useFakeTimers();
    const { engine, voice, result } = setup();
    engine.onaudiostart?.();
    engine.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: "Overtonin ikkuna", confidence: 0 } }] });
    voice.stop();
    vi.advanceTimersByTime(10_000);
    expect(result).toHaveBeenCalledWith({ transcript: "Overtonin ikkuna", confidence: 0, isFinal: false });
    expect(voice.getSnapshot().status).toBe("result");
  });

  it("still discards tentative text on explicit cancellation", () => {
    const { engine, voice, result } = setup();
    engine.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: "Ponzi", confidence: 0 } }] });
    const late = engine.onend;
    voice.cancel(); late?.();
    expect(voice.getSnapshot()).toMatchObject({ status: "idle", transcript: "" });
    expect(result).not.toHaveBeenCalled();
  });

  it("does not restore an interim hypothesis retracted by the engine", () => {
    const { engine, voice, result } = setup();
    engine.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: "Ponzi", confidence: 0 } }] });
    engine.onresult?.({ resultIndex: 0, results: [] });
    engine.onend?.();
    expect(voice.getSnapshot()).toMatchObject({ status: "no-match", transcript: "" });
    expect(result).not.toHaveBeenCalled();
  });
  it("only announces listening after capture starts, then processing and result", () => {
    const { engine, voice, result } = setup();
    expect(voice.getSnapshot().status).toBe("starting");
    expect(engine.lang).toBe("fi-FI");
    engine.onaudiostart?.();
    expect(voice.getSnapshot().status).toBe("listening");
    engine.onaudioend?.();
    expect(voice.getSnapshot().status).toBe("processing");
    engine.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "Mikä on Ponzi-huijaus?", confidence: 0.9 } }] });
    expect(voice.getSnapshot()).toMatchObject({ status: "result", transcript: "Mikä on Ponzi-huijaus?" });
    expect(result).toHaveBeenCalledOnce();
    expect(engine.abort).toHaveBeenCalled();
    expect(engine.onend).toBeNull();
  });
  it.each([
    ["not-allowed", "permission-denied"], ["service-not-allowed", "permission-denied"],
    ["audio-capture", "unavailable"], ["no-speech", "no-match"], ["network", "error"], ["aborted", "idle"],
  ])("handles %s without retaining capture", (error, status) => {
    const { engine, voice, result } = setup();
    engine.onerror?.({ error });
    expect(voice.getSnapshot().status).toBe(status);
    expect(result).not.toHaveBeenCalled();
    expect(engine.abort).toHaveBeenCalled();
  });
  it("ignores stale results after cancellation and during the next session", () => {
    const { engine, voice, result } = setup();
    const staleResult = engine.onresult;
    voice.cancel();
    staleResult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "ponzi", confidence: 1 } }] });
    expect(voice.getSnapshot().status).toBe("idle");
    expect(result).not.toHaveBeenCalled();
  });
  it("times out a silent service and releases the microphone", () => {
    vi.useFakeTimers();
    const { voice, engine } = setup();
    vi.advanceTimersByTime(15_000);
    expect(voice.getSnapshot().status).toBe("error");
    expect(engine.abort).toHaveBeenCalled();
  });
  it("times out capturing and processing states", () => {
    vi.useFakeTimers();
    const first = setup(); first.engine.onaudiostart?.(); vi.advanceTimersByTime(30_000);
    expect(first.voice.getSnapshot().status).toBe("processing");
    expect(first.engine.stop).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(10_000);
    expect(first.voice.getSnapshot().status).toBe("error");
    const second = setup(); second.engine.onaudioend?.(); vi.advanceTimersByTime(10_000);
    expect(second.voice.getSnapshot().status).toBe("error");
  });
  it("handles an ended session with no result", () => {
    const { voice, engine } = setup(); engine.onend?.();
    expect(voice.getSnapshot().status).toBe("no-match");
  });
  it("disposes without accepting late events", () => {
    const { voice, engine, result } = setup(); const callback = engine.onresult;
    voice.dispose();
    callback?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "ponzi", confidence: 1 } }] });
    expect(result).not.toHaveBeenCalled();
    expect(engine.abort).toHaveBeenCalled();
  });
  it("degrades when no native API is available", () => {
    vi.stubGlobal("SpeechRecognition", undefined); vi.stubGlobal("webkitSpeechRecognition", undefined);
    const voice = new BrowserVoiceInput(); voice.start(vi.fn());
    expect(voice.getSnapshot().status).toBe("unavailable");
  });
  it("handles a synchronous permission failure", () => {
    const voice = new BrowserVoiceInput(() => { throw new DOMException("Denied", "NotAllowedError"); });
    voice.start(vi.fn());
    expect(voice.getSnapshot().status).toBe("permission-denied");
  });
  it("detects denied permission even if the native engine stays silent", async () => {
    const { engine, voice: previous } = setup(); previous.dispose();
    const voice = new BrowserVoiceInput(() => engine, async () => "denied");
    voice.start(vi.fn());
    await Promise.resolve();
    expect(voice.getSnapshot().status).toBe("permission-denied");
    expect(engine.abort).toHaveBeenCalled();
  });
  it("ignores a permission result arriving after cancellation", async () => {
    const { engine, voice: previous } = setup(); previous.dispose();
    let resolvePermission: (state: PermissionState) => void = () => {};
    const pending = new Promise<PermissionState>((resolve) => { resolvePermission = resolve; });
    const voice = new BrowserVoiceInput(() => engine, () => pending);
    voice.start(vi.fn()); voice.cancel(); resolvePermission("denied");
    await Promise.resolve();
    expect(voice.getSnapshot().status).toBe("idle");
  });
});
