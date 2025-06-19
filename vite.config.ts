
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Use esbuild for minification (faster and default in Vite)
    minify: 'esbuild',
    // Configure esbuild to drop console and debugger statements in production
    ...(mode === 'production' && {
      esbuild: {
        drop: ['console', 'debugger'],
      },
    }),
    // Chunk splitting for better caching and smaller bundles
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-tabs'],
          charts: ['recharts'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
          utils: ['date-fns', 'clsx', 'class-variance-authority'],
        },
      },
    },
    // Set chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable tree shaking
    target: 'esnext',
    sourcemap: false, // Disable sourcemaps in production for smaller builds
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'react-router-dom',
      'date-fns',
      'recharts',
    ],
  },
}));
