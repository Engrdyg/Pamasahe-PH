import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// Use a pre-installed Chromium when one is provided (e.g. PLAYWRIGHT_CHROMIUM_PATH
// or the /opt/pw-browsers/chromium symlink in the hosted sandbox); otherwise
// fall back to the browser `npx playwright install chromium` downloads.
const preinstalled = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium'
const launchOptions = existsSync(preinstalled) ? { executablePath: preinstalled } : {}

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    ...devices['Pixel 5'],
    launchOptions,
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
