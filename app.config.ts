import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["lucide-solid"],
    },
    ssr: {
      noExternal: ["lucide-solid"],
    },
  },
});
