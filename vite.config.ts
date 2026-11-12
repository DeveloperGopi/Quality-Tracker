import { vlyPlugin } from "@vly-ai/integrations";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vlyPlugin(), tailwindcss()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // lucide's root barrel imports all ~1,500 icon modules. Use the local
      // per-icon barrel so Rollup only sees the icons this app actually uses.
      { find: /^lucide-react$/, replacement: path.resolve(__dirname, "./src/lib/lucideIcons.ts") },
      // Perf brief 3.4: strip jspdf's optional `canvg` peer (only used by
      // addSvgAsImage, which this app never calls). Saves ~53 KB gz on the
      // first PDF click and keeps html2canvas/canvg out of every chunk.
      { find: "canvg", replacement: path.resolve(__dirname, "./src/lib/noopCanvg.ts") },
      // Same discipline for jspdf's optional `html2canvas` peer (only used by
      // doc.html(), never called here) — another ~47 KB gz off the first PDF click.
      { find: "html2canvas", replacement: path.resolve(__dirname, "./src/lib/noopCanvg.ts") },
    ],
    // Force a single copy of React across all packages (including vlyPlugin).
    // Without this, @vly-ai/integrations can resolve its own React copy, which
    // triggers "Invalid hook call" errors at runtime.
    dedupe: ["react", "react/jsx-runtime", "react-dom", "react-dom/client"],
  },
  build: {
    // Production debugging is done from source, not shipped maps.
    sourcemap: false,
    // Gzip accounting doubles render memory and is not used by deploy.
    reportCompressedSize: false,
    // Route imports already split the app. Rollup's own chunk graph is leaner
    // than a hand-written vendor object and avoids one giant radix/chart chunk.
    rollupOptions: {
      maxParallelFileOps: 1,
      output: {
        // One small icon chunk beats ~150 one-icon requests across lazy routes.
        manualChunks(id: string) {
          if (id.includes('node_modules/lucide-react/')) return 'icons';
          // Keep the large, independently lazy export/reader engines out of
          // the app graph. Rollup can render and minify these smaller chunks
          // one at a time instead of holding one very large output chunk.
          if (id.includes('node_modules/exceljs/')) return 'vendor-exceljs';
          if (id.includes('node_modules/xlsx/')) return 'vendor-xlsx';
          if (id.includes('node_modules/jspdf/') || id.includes('node_modules/jspdf-autotable/'))
            return 'vendor-jspdf';
          if (id.includes('node_modules/pptxgenjs/')) return 'vendor-pptx';
          if (id.includes('node_modules/pdfjs-dist/')) return 'vendor-pdfjs';
          if (id.includes('node_modules/tesseract.js')) return 'vendor-ocr';
          if (id.includes('node_modules/recharts/')) return 'vendor-charts';
          if (id.includes('node_modules/framer-motion/')) return 'vendor-motion';
          return undefined;
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    // Use Vite's built-in minifier so the production build works in standard
    // npm-based hosts such as Vercel without requiring Bun.
    minify: "esbuild",
  },
  // Optimize dependencies
  optimizeDeps: {
    // Only scan the app entry HTML; avoids crawling unrelated *.html files
    // if a legacy snapshot accidentally contains leaked package folders.
    entries: ['index.html'],
    include: [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'react-router',
      '@convex-dev/auth/react',
      'framer-motion',
    ],
  },
  // Performance hints
  server: {
    // Bind to all interfaces so WebContainer's server-ready event fires.
    host: true,
    port: 5173,
    // Keep HMR on, but disable full-screen error overlay
    hmr: {
      overlay: false,
    },
  },
});
