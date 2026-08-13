import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => {
  const base = command === "build" ? (process.env.TAJU_BASE_PATH ?? "/TAJU./") : "/";

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: "prompt",
        injectRegister: null,
        includeAssets: ["icons/taju-192.png", "icons/taju-512.png"],
        manifest: {
          id: base,
          name: "TAJU – sana kerrallaan",
          short_name: "TAJU",
          description:
            "Opi kiinnostavia ja käyttökelpoisia suomalaisia sanoja muutamassa minuutissa.",
          lang: "fi",
          start_url: `${base}sanat`,
          scope: base,
          display: "standalone",
          background_color: "#cadde9",
          theme_color: "#cadde9",
          icons: [
            {
              src: `${base}icons/taju-192.png`,
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable",
            },
            {
              src: `${base}icons/taju-512.png`,
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          navigateFallback: `${base}index.html`,
          globPatterns: ["**/*.{js,css,html,json,png,woff2}"],
          // The editorial typography comes from Google Fonts, so it has to be
          // cached at runtime to keep the app readable offline.
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "taju-font-styles",
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
              handler: "CacheFirst",
              options: {
                cacheName: "taju-font-files",
                expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  };
});
