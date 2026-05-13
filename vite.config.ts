import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8"),
) as { version: string };

// https://vitejs.dev/config/
export default defineConfig(() => {
  const disablePwa = process.env.REPTILITA_DISABLE_PWA === "1";

  return ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts")) return "recharts";
          if (id.includes("react-dom") || id.includes("react-router")) return "react-vendor";
          if (id.includes("/react/") || id.endsWith("/react/index.js")) return "react-core";
          if (id.includes("@radix-ui")) return "radix-ui";
          if (id.includes("framer-motion")) return "framer-motion";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack/react-query")) return "react-query";
          if (id.includes("lucide-react")) return "lucide";
        },
      },
    },
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    !disablePwa &&
      VitePWA({
        injectRegister: "auto",
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "apple-touch-icon.png"],
        manifest: {
          name: "Reptilita",
          short_name: "Reptilita",
          description: "Premium reptile and amphibian care companion",
          start_url: "/today",
          scope: "/",
          display: "standalone",
          background_color: "#f7faf9",
          theme_color: "#2a9d8f",
          orientation: "portrait-primary",
          categories: ["lifestyle", "utilities"],
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            },
            {
              src: "/apple-touch-icon.png",
              sizes: "180x180",
              type: "image/png"
            }
          ]
        },
        workbox: {
          mode: "development",
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      ...(disablePwa
        ? {
            "virtual:pwa-register": path.resolve(__dirname, "./src/pwa-register-stub.ts"),
          }
        : {}),
    },
  },
  });
});
