import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    https: (() => {
      // Check if SSL certificates exist
      const keyPath = path.resolve(__dirname, '.certs/localhost-key.pem');
      const certPath = path.resolve(__dirname, '.certs/localhost-cert.pem');
      
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        return {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };
      }
      
      // If certificates don't exist, return undefined to use HTTP
      // User can run `./scripts/generate-ssl-certs.sh` to generate them
      return undefined;
    })(),
    port: parseInt(process.env.VITE_DEV_PORT || '5173', 10),
    strictPort: true, // fail if port in use so the dev URL is always consistent
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries - rarely change, good for long-term caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI component libraries - Radix UI and related
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
          ],
          // Charting library - large and only used on dashboard
          'chart-vendor': ['recharts'],
          // Utility libraries - date-fns, zod, etc.
          'utils-vendor': ['date-fns', 'zod', 'uuid', 'clsx', 'tailwind-merge'],
          // Form handling
          'form-vendor': ['react-hook-form', '@hookform/resolvers'],
          // Clerk authentication - large SDK
          'auth-vendor': ['@clerk/clerk-react'],
          // Supabase client
          'supabase-vendor': ['@supabase/supabase-js'],
          // React Query
          'query-vendor': ['@tanstack/react-query', '@tanstack/react-virtual'],
          // Excel parsing - only used in import feature
          'excel-vendor': ['xlsx'],
        },
      },
    },
  },
});

