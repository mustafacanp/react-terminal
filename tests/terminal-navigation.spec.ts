import { test, expect } from '@playwright/test';
import { SELECTORS } from './selectors';

test.describe('React Terminal Emulator - Navigation Features', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should navigate directories with cd command', async ({ page }) => {
        // First, see what directories are available
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        // Try to navigate to a directory (assuming there's a directory from fs.json)
        await page.keyboard.type('cd Documents');
        await page.keyboard.press('Enter');

        // Check if the path changed in the prompt
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText('~/Documents');

        // List contents of the new directory
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        // Navigate back to parent directory
        await page.keyboard.type('cd ..');
        await page.keyboard.press('Enter');

        // Check if we're back to home
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText('~');
    });

    test('should handle cd command with various parameters', async ({ page }) => {
        // Test cd without parameters (should stay in current directory)
        await page.keyboard.type('cd');
        await page.keyboard.press('Enter');
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText('~');

        // Test cd with . (current directory)
        await page.keyboard.type('cd .');
        await page.keyboard.press('Enter');
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText('~');

        // Test cd with ~ (home directory)
        await page.keyboard.type('cd ~');
        await page.keyboard.press('Enter');
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText('~');

        // Test cd with / (root)
        await page.keyboard.type('cd /');
        await page.keyboard.press('Enter');
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText('~');
    });

    test('should show error for non-existent directories', async ({ page }) => {
        // Try to navigate to a non-existent directory
        await page.keyboard.type('cd nonexistent');
        await page.keyboard.press('Enter');

        // Check for error message
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            'No such file or directory'
        );
    });

    test('should show error when trying to cd into a file', async ({ page }) => {
        // Navigate to files directory and try to cd into a file
        await page.keyboard.type('cd Documents');
        await page.keyboard.press('Enter');

        await page.keyboard.type('cd .bashrc');
        await page.keyboard.press('Enter');

        // Check for error message
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            'No such file or directory'
        );
    });

    test('should support tab completion for directories', async ({ page }) => {
        const promptInput = page.locator(SELECTORS.promptInput);

        // Start typing a directory name and press tab
        await page.keyboard.type('cd Doc');
        await page.keyboard.press('Tab');

        // Check if the input was completed (assuming 'files' directory exists)
        await expect(promptInput).toHaveValue('cd Documents/');
    });

    test('should navigate command history with arrow keys', async ({ page }) => {
        const promptInput = page.locator(SELECTORS.promptInput);

        // Execute several commands to build history
        await page.keyboard.type('pwd');
        await page.keyboard.press('Enter');

        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        await page.keyboard.type('help');
        await page.keyboard.press('Enter');

        // Use up arrow to navigate through history
        await page.keyboard.press('ArrowUp');
        await expect(promptInput).toHaveValue('help');

        await page.keyboard.press('ArrowUp');
        await expect(promptInput).toHaveValue('ls');

        await page.keyboard.press('ArrowUp');
        await expect(promptInput).toHaveValue('pwd');

        // Use down arrow to go forward in history
        await page.keyboard.press('ArrowDown');
        await expect(promptInput).toHaveValue('ls');

        await page.keyboard.press('ArrowDown');
        await expect(promptInput).toHaveValue('help');
    });

    test('should handle tab completion for files', async ({ page }) => {
        const promptInput = page.locator(SELECTORS.promptInput);
        // Try tab completion for cat command
        await page.keyboard.type('cat .ba');
        await page.keyboard.press('Tab');

        // Should complete to .bashrc
        await expect(promptInput).toHaveValue('cat .bashrc');
    });

    test('should handle tab completion for inner directories', async ({ page }) => {
        const promptInput = page.locator(SELECTORS.promptInput);
        // Try tab completion for cat command
        await page.keyboard.type('cd gam');
        await page.keyboard.press('Tab');

        await page.keyboard.type('n');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Should complete to .bashrc
        await expect(promptInput).toHaveValue('cd game_saves/nsfw/not_porn/dont_open.jpg');
    });

    test('should handle tab completion and back navigation', async ({ page }) => {
        const promptLocation = page.locator(SELECTORS.promptLocation);

        // Try tab completion for cat command
        await page.keyboard.type('cd gam');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        await page.keyboard.type('../');
        await page.keyboard.type('../');
        await page.keyboard.press('Enter');

        // Should complete to .bashrc
        await expect(promptLocation.last()).toContainText('~/game_saves');
    });

    test('should show multiple matches for ambiguous tab completion', async ({ page }) => {
        // Navigate to a directory with multiple files starting with same prefix
        await page.keyboard.type('cd Documents/');
        await page.keyboard.press('Enter');

        // Try tab completion with ambiguous prefix
        await page.keyboard.type('cat g');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Should show available options if there are multiple matches
        // (This will depend on what files exist in the fs.json)
        await expect(page.locator(SELECTORS.commandInput)).toHaveText(['cd Documents/', 'cat g']);
    });

    test('should maintain command history across multiple interactions', async ({ page }) => {
        const promptInput = page.locator(SELECTORS.promptInput);

        // Build a longer command history
        const commands = ['pwd', 'ls', 'help', 'clear', 'pwd'];

        for (const command of commands) {
            await page.keyboard.type(command);
            await page.keyboard.press('Enter');
        }

        // Navigate through history multiple times
        await page.keyboard.press('ArrowUp'); // pwd
        await expect(promptInput).toHaveValue('pwd');

        await page.keyboard.press('ArrowUp'); // clear
        await expect(promptInput).toHaveValue('clear');

        await page.keyboard.press('ArrowUp'); // help
        await expect(promptInput).toHaveValue('help');

        // Navigate forward
        await page.keyboard.press('ArrowDown'); // clear
        await expect(promptInput).toHaveValue('clear');
    });

    test('should handle empty spaces in commands', async ({ page }) => {
        // Test command with extra spaces
        await page.keyboard.type('  pwd  ');
        await page.keyboard.press('Enter');

        // Should still execute correctly
        await expect(page.locator(SELECTORS.terminalBody)).toContainText('/home/user');

        // Test multiple spaces between command and argument
        await page.keyboard.type('cd    Documents');
        await page.keyboard.press('Enter');

        // Should navigate correctly
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText('~/Documents');
    });
});
