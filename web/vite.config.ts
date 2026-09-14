import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: process.env.VITE_BACKEND_URL ?? "http://127.0.0.1:3000",
          changeOrigin: true,
        },
        "/pg": {
          target: process.env.VITE_BACKEND_URL ?? "http://127.0.0.1:3000",
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      cssCodeSplit: true,
      modulePreload: { polyfill: false },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("recharts") || id.includes("d3-")) return "charts";
            if (id.includes("react-markdown") || id.includes("remark-gfm") || id.includes("unified")) return "markdown";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("motion")) return "motion";
            if (id.includes("@douyinfe/semi-ui")) return "semi-ui";
            return "vendor";
          },
        },
      },
    },
  };
});
