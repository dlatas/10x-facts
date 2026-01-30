// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import { fileURLToPath, URL } from "node:url";

// https://astro.build/config
export default defineConfig({
    output: "server",
    integrations: [react(), sitemap()],
    server: { port: 3000 },
    env: {
        schema: {
            // Supabase (server-side only in this app; do NOT expose secrets to the client)
            SUPABASE_URL: envField.string({ context: "server", access: "public" }),
            SUPABASE_KEY: envField.string({ context: "server", access: "public" }),
            // Optional: only needed for server-side endpoints that must bypass RLS.
            SUPABASE_SERVICE_ROLE_KEY: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),

            // AI (server-only)
            OPENROUTER_API_KEY: envField.string({
                context: "server",
                access: "secret",
            }),
            OPENROUTER_MODEL: envField.string({
                context: "server",
                access: "public",
                optional: true,
                default: "openai/gpt-4o-mini",
            }),
            AI_DAILY_EVENT_LIMIT: envField.number({
                context: "server",
                access: "public",
                optional: true,
                default: 5,
            }),
        },
    },
    vite: {
        plugins: [tailwindcss()],
        resolve: {
            alias: {
                "@": fileURLToPath(new URL("./src", import.meta.url)),
            },
        },
    },
    adapter: cloudflare(),
});
