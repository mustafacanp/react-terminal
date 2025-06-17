import { test, expect } from '@playwright/test';
import { SELECTORS, COMPOUND_SELECTORS } from './selectors';

// Page Object Model approach with selectors
class TerminalPage {
    constructor(private page: any) {}

    // Navigation
    async goto() {
        await this.page.goto('/');
        await this.page.waitForLoadState('networkidle');
    }

    // Element getters using defined selectors
    get terminal() {
        return this.page.locator(SELECTORS.terminal);
    }
    get toolbar() {
        return this.page.locator(SELECTORS.toolbar);
    }
    get promptInput() {
        return this.page.locator(SELECTORS.promptInput);
    }
    get terminalBody() {
        return this.page.locator(SELECTORS.terminalBody);
    }
    get promptUser() {
        return this.page.locator(SELECTORS.promptUser);
    }
    get promptLocation() {
        return this.page.locator(SELECTORS.promptLocation);
    }

    // Actions
    async typeCommand(command: string) {
        await this.page.keyboard.type(command);
        await this.page.keyboard.press('Enter');
    }

    async expectCommandOutput(text: string, timeout = 10000) {
        await expect(this.terminalBody).toContainText(text, { timeout });
    }

    async expectDirectoriesListed() {
        await expect(
            this.terminalBody.locator(SELECTORS.typeDirectory).first()
        ).toBeVisible();
    }

    async expectCommandInHistory(command: string) {
        await expect(
            this.page.locator(COMPOUND_SELECTORS.commandHistory).first()
        ).toContainText(command);
    }
}

test.describe('React Terminal Emulator - Basic Functionality', () => {
    let terminal: TerminalPage;

    test.beforeEach(async ({ page }) => {
        terminal = new TerminalPage(page);
        await terminal.goto();
    });

    test('should load the terminal successfully', async ({ page }) => {
        // Check if the main terminal container is present
        await expect(terminal.terminal).toBeVisible();

        // Check if the toolbar is present
        await expect(terminal.toolbar).toBeVisible();

        // Check if the prompt is present and focused
        await expect(terminal.promptInput).toBeAttached();
        await expect(terminal.promptInput).toBeFocused();

        // Check if the prompt shows correct user and path
        await expect(terminal.promptUser).toContainText('root@ubuntu');
        await expect(terminal.promptLocation).toContainText('~');
    });

    test('should display help command output', async ({ page }) => {
        // Type help command using helper method
        await terminal.typeCommand('help');

        // Check output using helper method
        await terminal.expectCommandOutput('Usable Commands:');
        await terminal.expectCommandOutput('help');
        await terminal.expectCommandOutput('clear');
        await terminal.expectCommandOutput('pwd');
        await terminal.expectCommandOutput('ls');
        await terminal.expectCommandOutput('cd');
        await terminal.expectCommandOutput('cat');
    });

    test('should execute pwd command correctly', async ({ page }) => {
        await terminal.typeCommand('pwd');
        await terminal.expectCommandOutput('/home/user');
    });

    test('should execute ls command and show directory contents', async ({
        page
    }) => {
        await terminal.typeCommand('ls');
        await terminal.expectDirectoriesListed();
    });

    test('should clear terminal with clear command', async ({ page }) => {
        // First, execute a command to have some output
        await terminal.typeCommand('help');
        await terminal.expectCommandOutput('Usable Commands:');

        // Execute clear command
        await terminal.typeCommand('clear');

        // Check that the terminal is cleared
        await expect(terminal.terminalBody).not.toContainText(
            'Usable Commands:'
        );
        await expect(terminal.promptInput).toBeAttached();
    });

    test('should handle unknown commands gracefully', async ({ page }) => {
        await terminal.typeCommand('unknowncommand');
        await terminal.expectCommandOutput('unknowncommand: command not found');
    });

    test('should handle empty command input', async ({ page }) => {
        await page.keyboard.press('Enter');
        await expect(terminal.promptInput).toBeAttached();
        await expect(terminal.promptInput).toBeFocused();
    });

    test('should maintain focus on prompt input', async ({ page }) => {
        // Click somewhere else in the terminal
        await terminal.terminalBody.click();
        await page.waitForTimeout(100);

        // Type a command
        await page.keyboard.type('pwd');
        await expect(terminal.promptInput).toHaveValue('pwd');
    });

    test('should handle right-click context menu prevention', async ({
        page
    }) => {
        await terminal.terminal.click({ button: 'right' });
        await page.waitForTimeout(100);
        await page.keyboard.type('pwd');
        await expect(terminal.promptInput).toHaveValue('pwd');
    });

    test('should display command input in terminal history', async ({
        page
    }) => {
        await terminal.typeCommand('pwd');
        await terminal.expectCommandInHistory('pwd');
    });
});
