import { test, expect } from '@playwright/test';
import { SELECTORS } from './selectors';

test.describe('React Terminal Emulator - File Operations & Commands', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('run all commands at once', async ({ page }) => {
        // Type help command
        const expectedCommands = [
            'help',
            'clear',
            'pwd',
            'ls',
            'cd',
            'cat',
            'rm',
            'textgame',
            'randomcolor'
        ];

        await page.keyboard.type('help');
        await page.keyboard.press('Enter');
        let lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('Usable Commands:');
        for (const command of expectedCommands) {
            await expect(lastCommandOutput).toContainText(command);
        }

        // Type ls command
        const expectedFiles = [
            'Documents/',
            'Downloads/',
            'game_saves/',
            'gta_sa_cheats.txt',
            'Music/',
            'Pictures/',
            '.bashrc'
        ];

        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        for (const file of expectedFiles) {
            await expect(lastCommandOutput).toContainText(file);
        }

        // Type pwd command
        await page.keyboard.type('pwd');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toHaveText('/home/user/');

        // Type rm command
        await page.keyboard.type('rm gta_sa_cheats.txt');
        await page.keyboard.press('Enter');
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).not.toContainText('gta_sa_cheats.txt');

        // Type cd command
        // Go to the /game_saves/nsfw/not_porn directory
        await page.keyboard.type('cd ga');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');

        // Type rm command, but it wont remove since the file is in a secure file
        await page.keyboard.type('rm d');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('Permission denied');

        // Type sudo rm command
        await page.keyboard.type('sudo rm dont_open.jpg');
        await page.keyboard.press('Enter');
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        // Type cd command
        await page.keyboard.type('cd ..');
        await page.keyboard.press('Enter');
        await page.keyboard.type('cd ../..');
        await page.keyboard.press('Enter');
    });

    test('should display ASCII art when using cat on image files', async ({ page }) => {
        // Test cat command with ASCII art file
        await page.keyboard.type('cat Pictures/awesome_space.png');
        await page.keyboard.press('Enter');

        const lastCommandOutput = page.locator(SELECTORS.commandOutput).last();

        // Method 1: Test for minimum character count (ASCII art is typically long)
        const outputText = await lastCommandOutput.textContent();
        expect(outputText?.length).toBeGreaterThan(100); // ASCII art should be substantial

        // Method 2: Test that it's not an error message
        await expect(lastCommandOutput).not.toContainText('No such file or directory');
        await expect(lastCommandOutput).not.toContainText('permission denied');
        await expect(lastCommandOutput).not.toContainText('Is a directory');

        // Method 3: Test for specific ASCII art pattern
        await expect(lastCommandOutput).toContainText('MMMMMMMMMMMMMMMMMMM');

        // Method 4: Test multiple lines (ASCII art is typically multi-line)
        const lines = outputText?.split('\n') || [];
        expect(lines.length).toBeGreaterThan(5); // Should have multiple lines

        // Method 5: Verify terminal remains functional after ASCII art display
        await expect(page.locator(SELECTORS.promptInput)).toBeFocused();
    });

    test('should handle permission denied on secure files with regular cat', async ({ page }) => {
        // Try to read a text file
        await page.keyboard.type('cat .bashrc');
        await page.keyboard.press('Enter');

        // Should display file contents
        const terminalBody = page.locator(SELECTORS.terminalBody);
        // The exact content will depend on what's in .bashrc
        await expect(terminalBody).toContainText('permission denied');
    });

    test('should display file contents with sudo cat command on secure files', async ({ page }) => {
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
        await expect(page.locator(SELECTORS.terminalBody)).toContainText('cat: missing operand');
    });

    test('should handle cat command with non-existent file', async ({ page }) => {
        // Try to cat a non-existent file
        await page.keyboard.type('cat nonexistent.txt');
        await page.keyboard.press('Enter');

        // Should show error message
        await expect(page.locator(SELECTORS.terminalBody)).toContainText(
            'No such file or directory'
        );
    });

    test('should handle cat command with too many arguments', async ({ page }) => {
        // Try cat with too many arguments
        await page.keyboard.type('cat file1.txt file2.txt extra');
        await page.keyboard.press('Enter');

        // Should show too many arguments error
        await expect(page.locator(SELECTORS.terminalBody)).toContainText('too many arguments');
    });

    test('should handle cat command on directory', async ({ page }) => {
        // Try to cat a directory
        await page.keyboard.type('cat Documents');
        await page.keyboard.press('Enter');

        // Should show "Is a directory" error
        await expect(page.locator(SELECTORS.terminalBody)).toContainText('Is a directory');
    });

    test('should handle sudo command with valid subcommand', async ({ page }) => {
        // Test sudo with a valid command
        await page.keyboard.type('sudo pwd');
        await page.keyboard.press('Enter');

        // Should execute the command
        await expect(page.locator(SELECTORS.terminalBody)).toContainText('/home/user');
    });

    test('should handle sudo command with invalid subcommand', async ({ page }) => {
        // Test sudo with an invalid command
        await page.keyboard.type('sudo invalidcommand');
        await page.keyboard.press('Enter');

        // Should show command not found error
        await expect(page.locator(SELECTORS.terminalBody)).toContainText('command not found');
    });

    test('should handle external link commands', async ({ page }) => {
        // Mock window.open to prevent actual navigation during tests
        await page.evaluate(() => {
            window.open = () => null;
        });

        // Test textgame command
        // Mock window.open and capture calls to verify external links
        await page.evaluate(() => {
            // Store original window.open calls for verification
            (window as any).openCalls = [];
            window.open = (url?: string | URL, target?: string, features?: string) => {
                if (url) (window as any).openCalls.push(url.toString());
                return null;
            };
        });

        await page.keyboard.type('textgame');
        await page.keyboard.press('Enter');

        // Verify that window.open was called with the correct URL
        const openCalls = await page.evaluate(() => (window as any).openCalls);
        expect(openCalls).toContain('https://rpgtextgame.netlify.app');

        // Verify terminal is still functional after the command
        await expect(page.locator(SELECTORS.promptInput)).toBeFocused();

        // Test randomcolor command as well
        await page.keyboard.type('randomcolor');
        await page.keyboard.press('Enter');

        // Verify randomcolor URL was also called
        const updatedOpenCalls = await page.evaluate(() => (window as any).openCalls);
        expect(updatedOpenCalls).toContain('https://randomcolor2.netlify.app');

        // Should execute without error (command will be recorded in history)
        await expect(page.locator(SELECTORS.promptInput)).toBeAttached();

        // Should execute without error
        await expect(page.locator(SELECTORS.promptInput)).toBeAttached();
    });

    test('should validate command parameters correctly', async ({ page }) => {
        // Test ls with too many parameters
        await page.keyboard.type('ls extra parameter');
        await page.keyboard.press('Enter');

        // Should show too many arguments error
        await expect(page.locator(SELECTORS.terminalBody)).toContainText('too many arguments');

        // Test cd with too many parameters
        await page.keyboard.type('cd dir1 dir2 dir3');
        await page.keyboard.press('Enter');

        // Should show too many arguments error
        await expect(page.locator(SELECTORS.terminalBody)).toContainText('too many arguments');
    });

    test('should successfully remove secure files with sudo rm', async ({ page }) => {
        // Navigate to directory with a sudo file we can test
        await page.keyboard.type('cd game_saves/nsfw/not_porn');
        await page.keyboard.press('Enter');

        // Verify file exists first
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        await expect(page.locator(SELECTORS.terminalBody)).toContainText('dont_open.jpg');

        // Remove file with sudo
        await page.keyboard.type('sudo rm dont_open.jpg');
        await page.keyboard.press('Enter');

        // Verify file is removed
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        // The ls command should not show the removed file anymore
        const terminalContent = await page.locator(SELECTORS.terminalBody).textContent();

        const lastLsOutput = terminalContent?.split('ls').pop() || '';
        expect(lastLsOutput).not.toContain('dont_open.jpg');
    });

    test('should successfully remove regular files', async ({ page }) => {
        // Verify file exists first
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        await expect(page.locator(SELECTORS.terminalBody)).toContainText('gta_sa_cheats.txt');

        // Remove the file
        await page.keyboard.type('rm gta_sa_cheats.txt');
        await page.keyboard.press('Enter');

        // Verify file is removed by checking ls output
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        // The ls command should not show the removed file anymore
        const lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).not.toContainText('gta_sa_cheats.txt');
    });

    test('should successfully remove files from parent directory using rm with parent path', async ({
        page
    }) => {
        // First, verify the file exists in the root directory
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        await expect(page.locator(SELECTORS.terminalBody)).toContainText('gta_sa_cheats.txt');

        // Navigate to a subdirectory (Documents)
        await page.keyboard.type('cd Documents');
        await page.keyboard.press('Enter');

        // Verify we're in the Documents directory
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText('~/Documents');

        // Remove a file from the parent directory using "../"
        await page.keyboard.type('rm ../gta_sa_cheats.txt');
        await page.keyboard.press('Enter');

        // Navigate back to the parent directory to verify the file was removed
        await page.keyboard.type('cd ..');
        await page.keyboard.press('Enter');

        // Verify we're back in the root directory
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText('~');

        // List files to confirm the file was removed
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        // The file should no longer be present in the listing
        const lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).not.toContainText('gta_sa_cheats.txt');
    });

    test('should maintain file system state after rm operations across navigation', async ({
        page
    }) => {
        // Remove a file from root
        await page.keyboard.type('rm gta_sa_cheats.txt');
        await page.keyboard.press('Enter');

        // Navigate to another directory
        await page.keyboard.type('cd Documents');
        await page.keyboard.press('Enter');

        // Navigate back to root
        await page.keyboard.type('cd ..');
        await page.keyboard.press('Enter');

        // Verify the file is still removed
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        const lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).not.toContainText('gta_sa_cheats.txt');
    });

    test('should handle complex file paths correctly', async ({ page }) => {
        // Navigate to nested directory
        await page.keyboard.type('cd game_saves/nsfw/not_porn');
        await page.keyboard.press('Enter');

        // Check if we're in the correct location
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText(
            '~/game_saves/nsfw/not_porn'
        );

        // List contents
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        // Navigate back using relative path
        await page.keyboard.type('cd ../../..');
        await page.keyboard.press('Enter');

        // Should be back at home
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText('~');
    });

    test('should maintain terminal responsiveness during file operations', async ({ page }) => {
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
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText('~/Documents');
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
        const scrollHeight = await terminalContainer.evaluate(el => el.scrollHeight);
        const clientHeight = await terminalContainer.evaluate(el => el.clientHeight);

        // Should be scrolled to bottom (or very close to it)
        expect(scrollTop + clientHeight).toBeCloseTo(scrollHeight, -1);

        // Prompt should still be focused
        await expect(page.locator(SELECTORS.promptInput)).toBeFocused();
    });
});
