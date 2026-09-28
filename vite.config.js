import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Firestore-SDK:t gör paketet ~200 kB gzip; det är förväntat för appen.
  build: { chunkSizeWarningLimit: 800 },
});
