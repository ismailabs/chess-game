import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-chessboard") || id.includes("chess.js")) {
              return "vendor-chess";
            }
            if (id.includes("@supabase")) {
              return "vendor-supabase";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (id.includes("react/") || id.includes("react-dom/")) {
              return "vendor-react";
            }
          }
        },
      },
    },
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
