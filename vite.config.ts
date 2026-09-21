/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
