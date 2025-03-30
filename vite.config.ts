import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Flashcard Helper',
        short_name: 'flashcardHelper',
        description: 'A flashcard study app for students.',
        theme_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'flashcard helper.png',
            sizes: '512x512',
            type: 'image/png',
          }
        ],
      },
    }),
  ],
});
