// @ts-check
import { defineConfig } from "astro/config"
import react from "@astrojs/react"

import netlify from "@astrojs/netlify";

import tailwindcss from "@tailwindcss/vite";

import AstroPWA from "@vite-pwa/astro";

export default defineConfig({
  output: "server",
  integrations: [
    react(),
    AstroPWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "favicon.ico", "icons/apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "Quest Merchant | Tienda de juegos de rol",
        short_name: "Quest Merchant",
        description:
          "Manuales, dados, miniaturas y accesorios para tus aventuras de rol.",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        // Tokens de diseño (src/styles/styles.css): --accent y --bg
        theme_color: "#7389c3",
        background_color: "#e9f0f9",
        categories: ["shopping", "games"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        // Solo precache de estáticos. El modo offline real es la P3-3.
        globPatterns: ["**/*.{js,css,svg,png,ico,woff2}"],
        navigateFallback: null
      },
      devOptions: { enabled: true, navigateFallbackAllowlist: [/^\//] }
    })
  ],
  adapter: netlify({
  devFeatures: {
    environmentVariables: false,
    images: true,
    edgeFunctions: false
  }
}),

  vite: {
    plugins: [tailwindcss()]
  }
})