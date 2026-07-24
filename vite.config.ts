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
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'favicon.svg', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
        devOptions: {
          enabled: true,
          type: 'module'
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          navigateFallback: '/',
        },
        manifest: {
          id: "/",
          scope: "/",
          start_url: "/",
          short_name: "نظام بكسل",
          name: "نظام بكسل - لإدارة الخياطة والطلبات",
          description: "تطبيق إدارة مشغل الخياطة، الحسابات والطلبات والزبائن بمرونة وكفاءة عالية أوفلاين.",
          icons: [
            {
              src: "/icon-192.png",
              type: "image/png",
              sizes: "192x192",
              purpose: "any"
            },
            {
              src: "/icon-192.png",
              type: "image/png",
              sizes: "192x192",
              purpose: "maskable"
            },
            {
              src: "/icon-512.png",
              type: "image/png",
              sizes: "512x512",
              purpose: "any"
            },
            {
              src: "/icon-512.png",
              type: "image/png",
              sizes: "512x512",
              purpose: "maskable"
            }
          ],
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
