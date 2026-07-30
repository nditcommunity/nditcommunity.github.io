const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8081',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'], channel: process.env.CI ? undefined : 'chrome' },
    },
  ],
  webServer: {
    command: 'npm run build && node tools/serve-site.js',
    url: 'http://127.0.0.1:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
