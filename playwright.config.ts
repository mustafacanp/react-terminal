import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './tests',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: 'http://localhost:3000',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',

        /* Take screenshot on failure */
        screenshot: 'only-on-failure',

        /* Record video on failure */
        video: 'retain-on-failure'
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            testIgnore: ['**/terminal-mobile.spec.ts', '**/terminal-tablet.spec.ts']
        },

        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
            testIgnore: ['**/terminal-mobile.spec.ts', '**/terminal-tablet.spec.ts']
        },

        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
            testIgnore: ['**/terminal-mobile.spec.ts', '**/terminal-tablet.spec.ts']
        },

        /* Test against mobile viewports. */
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 7'] },
            testIgnore: '**/terminal-tablet.spec.ts'
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 15'] },
            testIgnore: '**/terminal-tablet.spec.ts'
        },

        /* Test against tablet viewports. */
        {
            name: 'iPad',
            use: {
                ...devices['iPad (gen 11)'],
                hasTouch: true
            },
            testIgnore: '**/terminal-mobile.spec.ts'
        },
        {
            name: 'iPad Pro',
            use: {
                ...devices['iPad Pro 11'],
                hasTouch: true
            },
            testIgnore: '**/terminal-mobile.spec.ts'
        }
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000
    }
});
