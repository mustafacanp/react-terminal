import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: true,
        // Don't open browser automatically when running tests
        open: !process.env.CI && !process.env.PLAYWRIGHT
    },
    build: {
        outDir: 'build'
    }
});
