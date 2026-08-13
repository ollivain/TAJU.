import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { useSettings } from "../../app/providers/SettingsContext";
import { useUserState } from "../../app/providers/UserStateContext";
import { APP_VERSION } from "../../app/version";
import { Squiggle } from "../../components/ui/Squiggle";
import { TEXT_SIZES, THEMES, themeLabel } from "../../domain/settings/types";
import { contentCatalog } from "../../content/loadContent";

export function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const userState = useUserState();
  const [askReset, setAskReset] = useState(false);
  const resetTriggerRef = useRef<HTMLButtonElement>(null);
  const resetCancelRef = useRef<HTMLButtonElement>(null);
  const resetWasOpenRef = useRef(false);

  useEffect(() => {
    if (askReset) {
      resetWasOpenRef.current = true;
      resetCancelRef.current?.focus();
    } else if (resetWasOpenRef.current) {
      resetWasOpenRef.current = false;
      resetTriggerRef.current?.focus();
    }
  }, [askReset]);

  const wordStates = contentCatalog.words.map((word) => userState.data.words[word.id]);
  const knownCount = wordStates.filter((state) => state?.known).length;
  const savedCount = wordStates.filter((state) => state?.saved).length;

  return (
    <div className="screen">
      <div className="screen__scroll">
        <div className="screen__inner screen__inner--settings">
          <Squiggle weight={1.2} opacity={0.5} />
          <h1 className="display-heading settings-title">Asetukset</h1>

          <section className="settings-section">
            <h2 className="settings-heading">Tausta</h2>
            <div className="theme-options">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className="theme-option"
                  aria-pressed={settings.theme === theme.id}
                  aria-label={theme.label}
                  onClick={() => updateSettings({ theme: theme.id })}
                >
                  <span style={{ "--swatch": `var(--swatch-${theme.id})` } as CSSProperties} />
                </button>
              ))}
            </div>
            <p className="theme-name">{themeLabel(settings.theme)}</p>
          </section>

          <section className="settings-section">
            <h2 className="settings-heading">Tekstin koko</h2>
            <div className="size-options">
              {TEXT_SIZES.map((size, index) => (
                <Fragment key={size.id}>
                  {index > 0 ? (
                    <span className="size-options__separator" aria-hidden="true">
                      ·
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="size-option"
                    aria-pressed={settings.textSize === size.id}
                    onClick={() => updateSettings({ textSize: size.id })}
                  >
                    {size.label}
                  </button>
                </Fragment>
              ))}
            </div>
          </section>

          <Squiggle className="settings-rule" weight={1} opacity={0.34} />

          <div className="settings-toggles">
            <button
              type="button"
              role="switch"
              className="settings-toggle"
              aria-checked={settings.motion}
              onClick={() => updateSettings({ motion: !settings.motion })}
            >
              <span>Liike</span>
              <span className="settings-toggle__track" aria-hidden="true">
                <span className="settings-toggle__knob" />
              </span>
            </button>
            <button
              type="button"
              role="switch"
              className="settings-toggle"
              aria-checked={settings.showEtymology}
              onClick={() => updateSettings({ showEtymology: !settings.showEtymology })}
            >
              <span>Näytä sanan alkuperä</span>
              <span className="settings-toggle__track" aria-hidden="true">
                <span className="settings-toggle__knob" />
              </span>
            </button>
          </div>

          <Squiggle className="settings-rule" weight={1} opacity={0.34} />

          <section className="settings-section">
            <h2 className="settings-heading">Oppiminen</h2>
            <dl className="settings-stats">
              <div className="settings-stat">
                <dt>Osatut sanat</dt>
                <dd>{knownCount}</dd>
              </div>
              <div className="settings-stat">
                <dt>Tallennetut sanat</dt>
                <dd>{savedCount}</dd>
              </div>
            </dl>
          </section>

          <Squiggle className="settings-rule" weight={1} opacity={0.34} />

          <div className="settings-reset">
            {askReset ? (
              <div
                className="settings-reset__confirm"
                role="group"
                aria-labelledby="reset-confirmation-label"
              >
                <span id="reset-confirmation-label" className="settings-reset__question">
                  Nollataanko edistyminen?
                </span>
                <div className="settings-reset__actions">
                  <button
                    ref={resetCancelRef}
                    type="button"
                    className="text-button"
                    onClick={() => setAskReset(false)}
                  >
                    Peruuta
                  </button>
                  <button
                    type="button"
                    className="text-button text-button--accent"
                    onClick={() => {
                      userState.resetProgress();
                      setAskReset(false);
                    }}
                  >
                    Nollaa
                  </button>
                </div>
              </div>
            ) : (
              <button
                ref={resetTriggerRef}
                type="button"
                className="text-button"
                onClick={() => setAskReset(true)}
              >
                Nollaa edistyminen
              </button>
            )}
          </div>

          <Squiggle className="settings-rule" weight={1} opacity={0.34} />

          <div className="settings-colophon">
            <span className="settings-colophon__mark">TAJU</span>
            <span className="settings-colophon__version">Versio {APP_VERSION}</span>
          </div>
          <p className="settings-tagline">Suomenkielisiä sanoja, yksi kerrallaan.</p>
        </div>
      </div>
    </div>
  );
}
