import { test, expect } from '@playwright/test';
import { SELECTORS } from './selectors';

test.describe('React Terminal Emulator - File Operations & Commands', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should handle permission denied on secure files with regular cat', async ({
        page
    }) => {
        // Try to read a text file
        await page.keyboard.type('cat .bashrc');
        await page.keyboard.press('Enter');

        // Should display file contents
        const terminalBody = page.locator(SELECTORS.terminalBody);
        // The exact content will depend on what's in .bashrc
        await expect(terminalBody).toContainText('permission denied');
    });

    test('should display file contents with sudo cat command on secure files', async ({
        page
    }) => {
        // Try to read a text file
        await page.keyboard.type('sudo cat .bashrc');
        await page.keyboard.press('Enter');

        // Should display file contents
        const terminalBody = page.locator(SELECTORS.terminalBody);
        // The exact content will depend on what's in .bashrc
        await expect(terminalBody).toContainText('alias');
    });

    test('should handle cat command without parameters', async ({ page }) => {
        // Execute cat without any file parameter
        await page.keyboard.type('cat');
        await page.keyboard.press('Enter');

        // Should show missing operand error
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            'cat: missing operand'
        );
    });

    test('should handle cat command with non-existent file', async ({
        page
    }) => {
        // Try to cat a non-existent file
        await page.keyboard.type('cat nonexistent.txt');
        await page.keyboard.press('Enter');

        // Should show error message
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            'No such file or directory'
        );
    });

    test('should handle cat command with too many arguments', async ({
        page
    }) => {
        // Try cat with too many arguments
        await page.keyboard.type('cat file1.txt file2.txt extra');
        await page.keyboard.press('Enter');

        // Should show too many arguments error
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            'too many arguments'
        );
    });

    test('should handle cat command on directory', async ({ page }) => {
        // Try to cat a directory
        await page.keyboard.type('cat Documents');
        await page.keyboard.press('Enter');

        // Should show "Is a directory" error
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            'Is a directory'
        );
    });

    test('should handle sudo command with valid subcommand', async ({
        page
    }) => {
        // Test sudo with a valid command
        await page.keyboard.type('sudo pwd');
        await page.keyboard.press('Enter');

        // Should execute the command
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            '/home/user'
        );
    });

    test('should handle sudo command with invalid subcommand', async ({
        page
    }) => {
        // Test sudo with an invalid command
        await page.keyboard.type('sudo invalidcommand');
        await page.keyboard.press('Enter');

        // Should show command not found error
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            'command not found'
        );
    });

    test('should handle external link commands', async ({ page }) => {
        // Mock window.open to prevent actual navigation during tests
        await page.evaluate(() => {
            window.open = () => null;
        });

        // Test textgame command
        await page.keyboard.type('textgame');
        await page.keyboard.press('Enter');

        // Should execute without error (command will be recorded in history)
        await expect(page.locator(SELECTORS.promptInput)).toBeAttached();

        // Test randomcolor command
        await page.keyboard.type('randomcolor');
        await page.keyboard.press('Enter');

        // Should execute without error
        await expect(page.locator(SELECTORS.promptInput)).toBeAttached();
    });

    test('should validate command parameters correctly', async ({ page }) => {
        // Test ls with too many parameters
        await page.keyboard.type('ls extra parameter');
        await page.keyboard.press('Enter');

        // Should show too many arguments error
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            'too many arguments'
        );

        // Test cd with too many parameters
        await page.keyboard.type('cd dir1 dir2 dir3');
        await page.keyboard.press('Enter');

        // Should show too many arguments error
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            'too many arguments'
        );
    });

    test('should handle complex file paths correctly', async ({ page }) => {
        // Navigate to nested directory
        await page.keyboard.type('cd game_saves/nsfw/not_porn');
        await page.keyboard.press('Enter');

        // Check if we're in the correct location
        await expect(
            page.locator(SELECTORS.promptLocation).last()
        ).toContainText('~/game_saves/nsfw/not_porn');

        // List contents
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        // Navigate back using relative path
        await page.keyboard.type('cd ../../..');
        await page.keyboard.press('Enter');

        // Should be back at home
        await expect(
            page.locator(SELECTORS.promptLocation).last()
        ).toContainText('~');
    });

    test('should maintain terminal responsiveness during file operations', async ({
        page
    }) => {
        const promptInput = page.locator(SELECTORS.promptInput);

        // Execute multiple commands in succession
        await page.keyboard.type('pwd');
        await page.keyboard.press('Enter');

        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        await page.keyboard.type('cd Documents');
        await page.keyboard.press('Enter');

        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        // Prompt should remain focused and functional
        await expect(promptInput).toBeFocused();

        // Should be able to execute another command immediately
        await page.keyboard.type('pwd');
        await expect(promptInput).toHaveValue('pwd');
    });

    test('should handle mixed case in file operations', async ({ page }) => {
        // Test case sensitivity in directory navigation
        await page.keyboard.type('cd documents');
        await page.keyboard.press('Enter');

        // Should show error if file system is case-sensitive
        const terminalBody = page.locator(SELECTORS.terminalBody);
        // The exact behavior depends on how the file system simulation handles case
        await expect(terminalBody).toContainText('No such file or directory');

        // Test with correct case
        await page.keyboard.type('cd Documents');
        await page.keyboard.press('Enter');

        // Should work
        await expect(
            page.locator(SELECTORS.promptLocation).last()
        ).toContainText('~/Documents');
    });

    test('should handle auto-scroll behavior', async ({ page }) => {
        // Execute many commands to test scrolling
        for (let i = 0; i < 20; i++) {
            await page.keyboard.type('pwd');
            await page.keyboard.press('Enter');
        }

        // Terminal should auto-scroll to bottom
        const terminalContainer = page.locator(SELECTORS.terminalBodyContainer);
        const scrollTop = await terminalContainer.evaluate(el => el.scrollTop);
        const scrollHeight = await terminalContainer.evaluate(
            el => el.scrollHeight
        );
        const clientHeight = await terminalContainer.evaluate(
            el => el.clientHeight
        );

        // Should be scrolled to bottom (or very close to it)
        expect(scrollTop + clientHeight).toBeCloseTo(scrollHeight, -1);

        // Prompt should still be focused
        await expect(page.locator(SELECTORS.promptInput)).toBeFocused();
    });
});
