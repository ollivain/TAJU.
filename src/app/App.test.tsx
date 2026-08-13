import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createEmptyUserState, type PersistedUserState } from "../domain/user-state/types";
import type { UserWordStateRepository } from "../persistence/UserWordStateRepository";
import { App } from "./App";
import { SettingsProvider } from "./providers/SettingsProvider";
import { UserStateProvider } from "./providers/UserStateProvider";

class MemoryRepository implements UserWordStateRepository {
  state: PersistedUserState = createEmptyUserState();

  async load() {
    return structuredClone(this.state);
  }

  async save(state: PersistedUserState) {
    this.state = structuredClone(state);
  }

  async clear() {
    this.state = createEmptyUserState();
  }
}

const renderApp = (route: string, repository = new MemoryRepository()) => {
  render(
    <MemoryRouter initialEntries={[route]}>
      <SettingsProvider>
        <UserStateProvider repository={repository}>
          <App />
        </UserStateProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
  return repository;
};

describe("TAJU app", () => {
  it("hakee sanan ja avaa sen suoran reitin", async () => {
    const user = userEvent.setup();
    renderApp("/loyda");

    await user.type(screen.getByRole("searchbox", { name: "Hae sanoja" }), "paradoksi");
    await user.click(await screen.findByRole("link", { name: /paradoksi/i }));

    expect(screen.getByRole("heading", { level: 1, name: "Paradoksi" })).toBeInTheDocument();
  });

  it("tallentaa ja merkitsee sanan osatuksi", async () => {
    const user = userEvent.setup();
    const repository = renderApp("/sanat");

    await user.click(await screen.findByRole("button", { name: "Tallenna" }));
    expect(screen.getByRole("button", { name: "Tallennettu" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Osaan tämän" }));

    await waitFor(() => {
      expect(Object.values(repository.state.words).some((state) => state.saved)).toBe(true);
      expect(Object.values(repository.state.words).some((state) => state.known)).toBe(true);
    });
  });

  it("säilyttää näppäimistöfokuksen edistymisen nollausvahvistuksessa", async () => {
    const user = userEvent.setup();
    renderApp("/asetukset");

    await user.click(await screen.findByRole("button", { name: "Nollaa edistyminen" }));
    expect(screen.getByRole("button", { name: "Peruuta" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Peruuta" }));
    expect(screen.getByRole("button", { name: "Nollaa edistyminen" })).toHaveFocus();
  });
});
