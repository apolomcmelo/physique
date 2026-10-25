import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    outputDir: 'test-results/playwright',
    use: {
        baseURL: 'http://127.0.0.1:8081',
        viewport: { width: 1440, height: 1000 },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'npm run web -- --port 8081',
        url: 'http://127.0.0.1:8081',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
            CI: '1',
            EXPO_PUBLIC_SUPABASE_URL: 'https://playwright.supabase.co',
            EXPO_PUBLIC_SUPABASE_KEY: 'playwright-e2e-public-key',
            EXPO_PUBLIC_USE_LOCAL_DB: 'true',
        },
    },
});
