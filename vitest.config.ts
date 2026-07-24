import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['resources/js/**/*.test.{ts,tsx}'],
    },
});
