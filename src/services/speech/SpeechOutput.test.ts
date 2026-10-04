import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserSpeechOutput } from "./SpeechOutput";

function setup() {
  vi.useFakeTimers();
  class Utterance {
    text: string;
    lang = "";
    voice = null;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) { this.text = text; }
  }
  const synth = { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [{ lang: "fi-FI" }, { lang: "en-GB" }] };
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  vi.stubGlobal("speechSynthesis", synth);
  const output = new BrowserSpeechOutput();
  return { output, synth, utterance: () => synth.speak.mock.calls[0][0] as Utterance };
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("speech output", () => {
  it("does not autoplay and waits for the native start event", () => {
    const { output, synth, utterance } = setup();
    expect(synth.speak).not.toHaveBeenCalled();
    output.speak("Määritelmä.");
    expect(output.getSnapshot()).toBe("starting");
    expect(utterance().text).toBe("Määritelmä.");
    expect(utterance().lang).toBe("fi-FI");
    utterance().onstart?.();
    expect(output.getSnapshot()).toBe("speaking");
    utterance().onend?.();
    expect(output.getSnapshot()).toBe("idle");
  });
  it("cancels and ignores stale events", () => {
    const { output, synth, utterance } = setup(); output.speak("Testi");
    const stale = utterance().onstart; output.stop(); stale?.();
    expect(synth.cancel).toHaveBeenCalled();
    expect(output.getSnapshot()).toBe("idle");
  });
  it("reports a failed or stalled native service", () => {
    const first = setup(); first.output.speak("Testi"); first.utterance().onerror?.();
    expect(first.output.getSnapshot()).toBe("error");
    const second = setup(); second.output.speak("Testi"); vi.advanceTimersByTime(8_000);
    expect(second.output.getSnapshot()).toBe("error");
  });
  it("degrades without speech synthesis", () => {
    vi.stubGlobal("speechSynthesis", undefined);
    const output = new BrowserSpeechOutput(); output.speak("Testi");
    expect(output.getSnapshot()).toBe("unavailable");
  });
  it("uses the result language and falls back to a matching language voice", () => {
    const { output, utterance } = setup();
    output.speak("An English definition.", "en-US");
    expect(utterance().lang).toBe("en-US");
    expect(utterance().voice).toEqual({ lang: "en-GB" });
    output.stop();
  });
  it("replaces another result's speech without letting its cleanup cancel the new result", () => {
    const { output, synth, utterance } = setup();
    const second = new BrowserSpeechOutput();
    output.speak("Ensimmäinen.");
    const stale = utterance().onend;
    second.speak("Toinen.");
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(output.getSnapshot()).toBe("idle");
    expect(second.getSnapshot()).toBe("starting");
    output.stop();
    stale?.();
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(second.getSnapshot()).toBe("starting");
    second.stop();
  });
});
