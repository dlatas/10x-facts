// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import { fileURLToPath, URL } from "node:url";

// https://astro.build/config
export default defineConfig({
    output: "server",
    integrations: [react(), sitemap()],
    server: { port: 3000 },
    vite: {
        plugins: [tailwindcss()],
        resolve: {
            alias: {
                "@": fileURLToPath(new URL("./src", import.meta.url)),
            },
        },
    },
    adapter: node({
        mode: "standalone",
    }),
});
