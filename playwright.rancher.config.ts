import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './e2e', testMatch: /rancher-local.spec.ts/, workers: 1, timeout: 120000, reporter: 'list', use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3002', screenshot: 'off', trace: 'off', video: 'off' } });
