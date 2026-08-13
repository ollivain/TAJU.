import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { SettingsProvider } from "./app/providers/SettingsProvider";
import { UserStateProvider } from "./app/providers/UserStateProvider";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <UserStateProvider>
          <App />
        </UserStateProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
);
