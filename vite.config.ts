import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base: na GitHub Pages aplikacja działa pod /bloombeauty-terminarz/
export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  plugins: [react(), tailwindcss()],
  test: { environment: "node", include: ["src/**/*.test.ts"] },
}));
