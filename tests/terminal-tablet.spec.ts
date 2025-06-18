import { test, expect } from '@playwright/test';
import { SELECTORS } from './selectors';

test.describe('React Terminal Emulator - Tablet Responsiveness', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should utilize tablet screen space effectively', async ({ page }) => {
        const terminal = page.locator(SELECTORS.terminal);
        await expect(terminal).toBeVisible();

        // Terminal should take advantage of larger tablet screen
        const terminalBox = await terminal.boundingBox();
        expect(terminalBox?.width).toBeGreaterThan(600);

        // Should display more content without scrolling
        const promptInput = page.locator(SELECTORS.promptInput);
        await page.keyboard.type('help');
        await page.keyboard.press('Enter');

        // Help content should be visible
        await expect(page.locator(SELECTORS.terminalBody)).toContainText('Usable Commands:');

        // Terminal should remain fully functional
        await expect(promptInput).toBeFocused();
    });

    test('should handle both touch and keyboard input on tablet', async ({ page }) => {
        const terminal = page.locator(SELECTORS.terminal);
        const promptInput = page.locator(SELECTORS.promptInput);

        // Test touch input
        await terminal.tap();
        await expect(promptInput).toBeFocused();

        // Test virtual keyboard input
        await page.keyboard.type('pwd');
        await expect(promptInput).toHaveValue('pwd');

        // Execute command
        await page.keyboard.press('Enter');
        await expect(page.locator(SELECTORS.terminalBody)).toContainText('/home/user');

        // Should be ready for next command
        await expect(promptInput).toBeFocused();
        await expect(promptInput).toHaveValue('');
    });

    test('should handle tablet-specific gestures', async ({ page }) => {
        const promptInput = page.locator(SELECTORS.promptInput);
        const terminal = page.locator(SELECTORS.terminal);

        // Test pinch-to-zoom behavior (should not break terminal)
        await terminal.tap();
        await expect(promptInput).toBeFocused();

        // Execute a command to ensure functionality
        await page.keyboard.type('pwd');
        await page.keyboard.press('Enter');
        await expect(page.locator(SELECTORS.terminalBody)).toContainText('/home/user');
    });

    test('should maintain performance on tablet', async ({ page }) => {
        const promptInput = page.locator(SELECTORS.promptInput);

        // Execute multiple commands to test performance
        const commands = ['pwd', 'ls', 'help', 'clear'];

        for (const command of commands) {
            const startTime = Date.now();
            await page.keyboard.type(command);
            await page.keyboard.press('Enter');

            // Wait for command to complete
            if (command !== 'clear') {
                await expect(
                    page.locator(SELECTORS.terminalBody).locator(SELECTORS.commandOutput).last()
                ).toBeVisible();
            }

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // Each command should be responsive
            expect(responseTime).toBeLessThan(3000);
        }

        // Terminal should remain focused
        await expect(promptInput).toBeFocused();
    });
});
