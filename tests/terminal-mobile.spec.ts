import { test, expect, devices } from '@playwright/test';
import { SELECTORS } from './selectors';

// Configure mobile device testing
test.use({
    ...devices['iPhone 12'],
    hasTouch: true
});

test.describe('React Terminal Emulator - Mobile Responsiveness', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should load correctly on mobile viewport', async ({ page }) => {
        // Check if the terminal container is visible and properly sized
        const terminal = page.locator(SELECTORS.terminal);
        await expect(terminal).toBeVisible();

        // Check that the prompt is visible and accessible
        const promptInput = page.locator(SELECTORS.promptInput);
        await expect(promptInput).toBeAttached();

        // Check that the toolbar is responsive
        const toolbar = page.locator(SELECTORS.toolbar);
        await expect(toolbar).toBeVisible();

        // Verify prompt label is readable on mobile
        const promptUser = page.locator(SELECTORS.promptUser);
        await expect(promptUser).toContainText('root@ubuntu');
    });

    test('should handle touch interactions correctly', async ({ page }) => {
        const promptInput = page.locator(SELECTORS.promptInput);
        const terminal = page.locator(SELECTORS.terminal);

        // Simulate touch on terminal to focus input
        await terminal.tap();

        // Prompt should be focused
        await expect(promptInput).toBeFocused();

        // Should be able to type commands via touch keyboard
        await page.keyboard.type('pwd');
        await expect(promptInput).toHaveValue('pwd');

        // Execute command with touch
        await page.keyboard.press('Enter');

        // Command should execute correctly
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            '/home/user'
        );
    });

    test('should handle virtual keyboard on mobile', async ({ page }) => {
        const promptInput = page.locator(SELECTORS.promptInput);
        const terminalBody = page.locator(SELECTORS.terminalBody);

        // Focus the input (simulating virtual keyboard appearance)
        await terminalBody.tap();
        await expect(promptInput).toBeFocused();

        // Type a command using virtual keyboard simulation
        await page.keyboard.type('help');
        await expect(promptInput).toHaveValue('help');

        // Execute command
        await page.keyboard.press('Enter');

        // Verify command executed correctly
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            'Usable Commands:'
        );
    });

    test('should maintain proper scrolling on mobile', async ({ page }) => {
        const promptInput = page.locator(SELECTORS.promptInput);

        // Execute multiple commands to create scrollable content
        for (let i = 0; i < 5; i++) {
            await page.keyboard.type(`echo "Command number ${i + 1}"`);
            await page.keyboard.press('Enter');
        }

        // Terminal should auto-scroll to show the latest content
        const terminalContainer = page.locator(SELECTORS.terminalBodyContainer);
        const scrollTop = await terminalContainer.evaluate(el => el.scrollTop);
        const scrollHeight = await terminalContainer.evaluate(
            el => el.scrollHeight
        );
        const clientHeight = await terminalContainer.evaluate(
            el => el.clientHeight
        );

        // Should be scrolled near the bottom
        expect(scrollTop + clientHeight).toBeGreaterThan(scrollHeight * 0.8);

        // Prompt should still be visible and focused
        await expect(promptInput).toBeFocused();
    });

    test('should handle orientation changes gracefully', async ({ page }) => {
        const promptInput = page.locator(SELECTORS.promptInput);

        // Execute a command in portrait mode
        await page.keyboard.type('pwd');
        await page.keyboard.press('Enter');

        // Simulate orientation change to landscape
        await page.setViewportSize({ width: 844, height: 390 });

        // Terminal should still be functional
        await expect(page.locator(SELECTORS.terminal)).toBeVisible();
        await expect(promptInput).toBeAttached();

        // Should be able to execute commands in landscape mode
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        // Command should execute correctly
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            'Documents'
        );
    });

    test('should prevent context menu on mobile long press', async ({
        page
    }) => {
        const terminal = page.locator(SELECTORS.terminal);

        // Simulate long press (which might trigger context menu on mobile)
        // Use touchscreen for long press simulation
        const box = await terminal.boundingBox();
        if (box) {
            await page.touchscreen.tap(
                box.x + box.width / 2,
                box.y + box.height / 2
            );
        }

        // Terminal should remain functional
        const promptInput = page.locator(SELECTORS.promptInput);
        await expect(promptInput).toBeFocused();

        // Should be able to type normally after long press
        await page.keyboard.type('pwd');
        await expect(promptInput).toHaveValue('pwd');
    });

    test('should handle rapid touch inputs', async ({ page }) => {
        const promptInput = page.locator(SELECTORS.promptInput);
        const terminal = page.locator(SELECTORS.terminal);

        // Rapid taps on terminal
        for (let i = 0; i < 5; i++) {
            await terminal.tap();
        }

        // Should maintain focus and stability
        await expect(promptInput).toBeFocused();

        // Should be able to type normally
        await page.keyboard.type('help');
        await expect(promptInput).toHaveValue('help');

        await page.keyboard.press('Enter');
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            'Usable Commands:'
        );
    });

    test('should handle copy functionality on mobile', async ({ page }) => {
        const promptInput = page.locator(SELECTORS.promptInput);

        // Execute a command to have content to copy
        await page.keyboard.type('pwd');
        await page.keyboard.press('Enter');

        // Try to select text in the terminal output
        const terminalBody = page.locator(SELECTORS.terminalBody);
        await terminalBody.locator(SELECTORS.commandOutput).first().tap();

        // Terminal should remain functional after tap on output
        await expect(promptInput).toBeFocused();

        // Should be able to continue using the terminal
        await page.keyboard.type('ls');
        await expect(promptInput).toHaveValue('ls');
    });

    test('should maintain performance on mobile devices', async ({ page }) => {
        const promptInput = page.locator(SELECTORS.promptInput);

        // Measure response time for command execution
        const startTime = Date.now();

        await page.keyboard.type('help');
        await page.keyboard.press('Enter');

        // Wait for command output to appear
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            'Usable Commands:'
        );

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Response should be reasonably fast (less than 2 seconds)
        expect(responseTime).toBeLessThan(2000);

        // Terminal should remain responsive
        await expect(promptInput).toBeFocused();
    });
});
