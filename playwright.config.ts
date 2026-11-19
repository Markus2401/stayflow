import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

// Browsers live in the ignored project work folder, never in a user-profile cache.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('work/pw-browsers');

export default defineConfig({
  testDir: 'tests/e2e',
  // One worker: every test uses the same local synthetic database and creates its own uniquely named rooms.
  workers: 1,
  reporter: 'list',
  outputDir: 'work/playwright-results',
  use: { baseURL: 'http://127.0.0.1:8787', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', grep: /^(?!.*@mobile-only)/, use: { ...devices['Desktop Chrome'] } },
    { name: 'tablet', grep: /@screenshots/, use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'mobile', grep: /@mobile-only|@screenshots/, use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: 'node scripts/project-npm.mjs dev',
    url: 'http://127.0.0.1:8787',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
