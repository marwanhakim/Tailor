import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        manifest: {
          short_name: "نظام بكسل",
          name: "نظام بكسل - لإدارة الخياطة والطلبات",
          description: "تطبيق إدارة مشغل الخياطة، الحسابات والطلبات والزبائن بمرونة وكفاءة عالية أوفلاين.",
          icons: [
            {
              src: "/icon-192.png",
              type: "image/png",
              sizes: "192x192",
              purpose: "any maskable"
            },
            {
              src: "/icon-512.png",
              type: "image/png",
              sizes: "512x512",
              purpose: "any maskable"
            }
          ],
          start_url: "/",
          background_color: "#0f172a",
          theme_color: "#0f172a",
          display: "standalone",
          orientation: "portrait",
          dir: "rtl",
          lang: "ar"
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
