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
            'echo',
            'cat',
            'touch',
            'mkdir',
            'rm',
            'rmdir',
            'whoami',
            'reset',
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

    test('should handle echo command with text and variables', async ({ page }) => {
        // Test 1: Basic echo with text
        await page.keyboard.type('echo Hello World');
        await page.keyboard.press('Enter');

        let lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('Hello World');

        // Test 2: Echo with variable substitution
        await page.keyboard.type('echo Current user: $USER');
        await page.keyboard.press('Enter');

        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('Current user: root');

        // Test 3: Echo with hostname variable
        await page.keyboard.type('echo Host: $HOSTNAME');
        await page.keyboard.press('Enter');

        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('Host: ubuntu');

        // Test 4: Echo with path variable
        await page.keyboard.type('echo Current path: $PWD');
        await page.keyboard.press('Enter');

        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('Current path: ~');

        // Test 5: Echo without text (should do nothing)
        await page.keyboard.type('echo');
        await page.keyboard.press('Enter');

        // Verify terminal remains functional
        await expect(page.locator(SELECTORS.promptInput)).toBeFocused();
    });

    test('should handle cat command with all scenarios', async ({ page }) => {
        // Test 1: cat command without parameters (missing operand)
        await page.keyboard.type('cat');
        await page.keyboard.press('Enter');
        let lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('cat: missing operand');

        // Test 2: cat command with non-existent file
        await page.keyboard.type('cat nonexistent.txt');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('No such file or directory');

        // Test 3: cat command with too many arguments
        await page.keyboard.type('cat file1.txt file2.txt extra');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('too many arguments');

        // Test 4: cat command on directory
        await page.keyboard.type('cat Documents');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('Is a directory');

        // Test 5: permission denied on secure files with regular cat
        await page.keyboard.type('cat .bashrc');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('permission denied');

        // Test 6: display file contents with sudo cat command on secure files
        await page.keyboard.type('sudo cat .bashrc');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('alias');

        // Test 7: display ASCII art when using cat on image files
        await page.keyboard.type('cat Pictures/awesome_space.png');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300); // wait for the image to load
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();

        // Test for minimum character count (ASCII art is typically long)
        const outputText = await lastCommandOutput.textContent();
        expect(outputText?.length).toBeGreaterThan(100); // ASCII art should be substantial

        // Test that it's not an error message
        await expect(lastCommandOutput).not.toContainText('No such file or directory');
        await expect(lastCommandOutput).not.toContainText('permission denied');
        await expect(lastCommandOutput).not.toContainText('Is a directory');

        // Test for specific ASCII art pattern
        await expect(lastCommandOutput).toContainText('MMMMMMMMMMMMMMMMMMM');

        // Test multiple lines (ASCII art is typically multi-line)
        const lines = outputText?.split('\n') || [];
        expect(lines.length).toBeGreaterThan(10); // Should have multiple lines

        // Verify terminal remains functional after ASCII art display
        await expect(page.locator(SELECTORS.promptInput)).toBeFocused();
    });

    test('should handle touch command for file creation', async ({ page }) => {
        // Test 1: Create a new file
        await page.keyboard.type('touch newfile.txt');
        await page.keyboard.press('Enter');

        // Verify file was created by listing directory
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        let lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('newfile.txt');

        // Test 2: Touch existing file (should succeed silently)
        await page.keyboard.type('touch newfile.txt');
        await page.keyboard.press('Enter');

        // Test 3: Touch without filename (should show error)
        await page.keyboard.type('touch');
        await page.keyboard.press('Enter');

        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('touch: missing operand');

        // Test 4: Touch with too many parameters
        await page.keyboard.type('touch file1 file2');
        await page.keyboard.press('Enter');

        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('too many arguments');

        // Verify terminal remains functional
        await expect(page.locator(SELECTORS.promptInput)).toBeFocused();
    });

    test('should handle sudo command with valid subcommand', async ({ page }) => {
        // Test sudo with a valid command
        await page.keyboard.type('sudo pwd');
        await page.keyboard.press('Enter');

        // Should execute the command
        const lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('/home/user');
    });

    test('should handle sudo command with invalid subcommand', async ({ page }) => {
        // Test sudo with an invalid command
        await page.keyboard.type('sudo invalidcommand');
        await page.keyboard.press('Enter');

        // Should show command not found error
        const lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('command not found');
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
        let lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('too many arguments');

        // Test cd with too many parameters
        await page.keyboard.type('cd dir1 dir2 dir3');
        await page.keyboard.press('Enter');

        // Should show too many arguments error
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('too many arguments');
    });

    test('should successfully remove files with various rm scenarios', async ({ page }) => {
        // Test 1: Remove regular files
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        let lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('gta_sa_cheats.txt');

        // Remove the file
        await page.keyboard.type('rm gta_sa_cheats.txt');
        await page.keyboard.press('Enter');

        // Verify file is removed by checking ls output
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).not.toContainText('gta_sa_cheats.txt');

        // Test 2: Remove files from parent directory using rm with parent path
        // Navigate to a subdirectory (Documents)
        await page.keyboard.type('cd Documents');
        await page.keyboard.press('Enter');

        // Verify we're in the Documents directory
        let lastPromptLocation = page.locator(SELECTORS.promptLocation).last();
        await expect(lastPromptLocation).toContainText('~/Documents');

        // First create a test file in root to remove
        await page.keyboard.type('cd ..');
        await page.keyboard.press('Enter');
        await page.keyboard.type('mkdir testdir');
        await page.keyboard.press('Enter');
        await page.keyboard.type('cd testdir');
        await page.keyboard.press('Enter');

        // Navigate back to Documents
        await page.keyboard.type('cd ../Documents');
        await page.keyboard.press('Enter');

        // Remove a directory from the parent directory using "../"
        await page.keyboard.type('rm ../testdir');
        await page.keyboard.press('Enter');
        // This should fail since rm can't remove directories
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('Is a directory');

        // Navigate back to the parent directory
        await page.keyboard.type('cd ..');
        await page.keyboard.press('Enter');

        // Verify we're back in the root directory
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText('~');

        // Test 3: Remove secure files with sudo rm
        // Navigate to directory with a sudo file we can test
        await page.keyboard.type('cd game_saves/nsfw/not_porn');
        await page.keyboard.press('Enter');

        // Verify file exists first
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('dont_open.jpg');

        // Remove file with sudo
        await page.keyboard.type('sudo rm dont_open.jpg');
        await page.keyboard.press('Enter');

        // Verify file is removed
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        // The ls command should not show the removed file anymore
        const terminalContent = await page.locator(SELECTORS.commandOutput).last();
        await expect(terminalContent).not.toContainText('dont_open.jpg');

        // Navigate back to root for cleanup
        await page.keyboard.type('cd ../../..');
        await page.keyboard.press('Enter');
    });

    test('should handle rmdir command for directory removal', async ({ page }) => {
        // Test 1: Create a directory to test with
        await page.keyboard.type('mkdir testdir');
        await page.keyboard.press('Enter');

        // Verify directory was created
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        let lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('testdir/');

        // Test 2: Remove empty directory
        await page.keyboard.type('rmdir testdir');
        await page.keyboard.press('Enter');

        // Verify directory was removed
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).not.toContainText('testdir/');

        // Test 3: rmdir without parameters (missing operand)
        await page.keyboard.type('rmdir');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('rmdir: missing operand');

        // Test 4: rmdir with too many parameters
        await page.keyboard.type('rmdir dir1 dir2');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('too many arguments');

        // Test 5: rmdir on non-existent directory
        await page.keyboard.type('rmdir nonexistent');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('No such file or directory');

        // Test 6: rmdir on file (not directory)
        await page.keyboard.type('touch testfile.txt');
        await page.keyboard.press('Enter');
        await page.keyboard.type('rmdir testfile.txt');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('Not a directory');

        // Test 7: rmdir on non-empty directory
        await page.keyboard.type('mkdir parentdir');
        await page.keyboard.press('Enter');
        await page.keyboard.type('cd parentdir');
        await page.keyboard.press('Enter');
        await page.keyboard.type('touch childfile.txt');
        await page.keyboard.press('Enter');
        await page.keyboard.type('cd ..');
        await page.keyboard.press('Enter');
        await page.keyboard.type('rmdir parentdir');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('Directory not empty');

        // Verify terminal remains functional
        await expect(page.locator(SELECTORS.promptInput)).toBeFocused();
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

    test('should handle whoami command correctly', async ({ page }) => {
        // Execute whoami command
        await page.keyboard.type('whoami');
        await page.keyboard.press('Enter');

        // Should display the current username
        const lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('root');

        // Verify terminal remains functional after whoami
        await expect(page.locator(SELECTORS.promptInput)).toBeFocused();
    });

    test('should handle reset command to restore file system', async ({ page }) => {
        // Test 1: Make some changes to file system first
        await page.keyboard.type('mkdir testdir');
        await page.keyboard.press('Enter');
        await page.keyboard.type('touch testfile.txt');
        await page.keyboard.press('Enter');
        await page.keyboard.type('rm gta_sa_cheats.txt');
        await page.keyboard.press('Enter');

        // Verify changes were made
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        let lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('testdir/');
        await expect(lastCommandOutput).toContainText('testfile.txt');
        await expect(lastCommandOutput).not.toContainText('gta_sa_cheats.txt');

        // Test 2: Execute reset command
        await page.keyboard.type('reset');
        await page.keyboard.press('Enter');

        // Should show reset message
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('Resetting file system to default state...');

        // Wait for page reload (reset command reloads the page after 1000ms)
        await page.waitForTimeout(2000);

        // Test 3: Verify file system was reset to default state
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();

        // Should have original files back
        await expect(lastCommandOutput).toContainText('gta_sa_cheats.txt');
        await expect(lastCommandOutput).toContainText('Documents/');
        await expect(lastCommandOutput).toContainText('Downloads/');

        // Should not have the test files we created
        await expect(lastCommandOutput).not.toContainText('testdir/');
        await expect(lastCommandOutput).not.toContainText('testfile.txt');

        // Verify terminal is functional after reset
        await expect(page.locator(SELECTORS.promptInput)).toBeFocused();
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
        // The exact behavior depends on how the file system simulation handles case
        const lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('No such file or directory');

        // Test with correct case
        await page.keyboard.type('cd Documents');
        await page.keyboard.press('Enter');

        // Should work
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText('~/Documents');
    });

    test('should handle mkdir command with all scenarios', async ({ page }) => {
        // Test 1: mkdir without parameters (missing operand)
        await page.keyboard.type('mkdir');
        await page.keyboard.press('Enter');
        let lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('mkdir: missing operand');

        // Test 2: mkdir with too many parameters
        await page.keyboard.type('mkdir dir1 dir2');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('too many arguments');

        // Test 3: mkdir with existing directory name
        await page.keyboard.type('mkdir Documents');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('File exists');

        // Test 4: mkdir with invalid directory name (contains slash)
        await page.keyboard.type('mkdir dir/subdir');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('Invalid directory name');

        // Test 5: Successfully create directory with mkdir
        await page.keyboard.type('mkdir testdir');
        await page.keyboard.press('Enter');

        // Verify the directory was created by listing contents
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('testdir/');

        // Test that we can navigate into the new directory
        await page.keyboard.type('cd testdir');
        await page.keyboard.press('Enter');

        // Verify we're in the new directory
        await expect(page.locator(SELECTORS.promptLocation).last()).toContainText('~/testdir');

        // Verify the directory is empty
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        // Should show empty directory (no files listed)
        const emptyDirOutput = page.locator(SELECTORS.commandOutput).last();
        const outputText = await emptyDirOutput.textContent();
        // The output should be minimal (just whitespace or empty)
        expect(outputText?.trim().length || 0).toEqual(0);
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

    test('should display command history correctly', async ({ page }) => {
        // Execute a few commands to populate history
        await page.keyboard.type('pwd');
        await page.keyboard.press('Enter');
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        await page.keyboard.type('whoami');
        await page.keyboard.press('Enter');

        // Execute history command
        await page.keyboard.type('history');
        await page.keyboard.press('Enter');

        // Verify history output
        const lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('1 pwd');
        await expect(lastCommandOutput).toContainText('2 ls');
        await expect(lastCommandOutput).toContainText('3 whoami');
    });

    test('should clear command history with history -c', async ({ page }) => {
        // Execute a few commands to populate history
        await page.keyboard.type('pwd');
        await page.keyboard.press('Enter');
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');

        // Clear history
        await page.keyboard.type('history -c');
        await page.keyboard.press('Enter');

        // Execute history command again
        await page.keyboard.type('history');
        await page.keyboard.press('Enter');

        // Verify history is empty (or only contains 'history')
        const lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        const outputText = await lastCommandOutput.textContent();

        // After clearing, the new history will just contain 'history'
        expect(outputText?.trim()).toContain('No commands in history.');
        expect(outputText?.trim()).not.toContain('pwd');
        expect(outputText?.trim()).not.toContain('ls');
    });
});

test.describe('Theme command', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should change the theme when using the theme command', async ({ page }) => {
        const terminalBodyContainer = page.locator(SELECTORS.terminalBodyContainer);

        // The initial theme is 'default', with background '#440a2b' -> rgb(68, 10, 43)
        await expect(terminalBodyContainer).toHaveCSS('background-color', 'rgb(68, 10, 43)');

        // Change theme to dracula
        await page.keyboard.type('theme set dracula');
        await page.keyboard.press('Enter');

        // Assert that the new color matches the dracula theme's background
        // The color value is '#282a36' -> rgb(40, 42, 54)
        await expect(terminalBodyContainer).toHaveCSS('background-color', 'rgb(40, 42, 54)');
    });

    test('should show available themes when no subcommand is provided', async ({ page }) => {
        await page.keyboard.type('theme');
        await page.keyboard.press('Enter');

        const lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('Available themes:');
        await expect(lastCommandOutput).toContainText('Usage: theme set {theme_name}');
    });

    test('should show usage message when "set" is used without a theme name', async ({ page }) => {
        await page.keyboard.type('theme set');
        await page.keyboard.press('Enter');

        const lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText('Usage: theme set {theme_name}');
        await expect(lastCommandOutput).toContainText('Available themes:');
    });

    test('should show error for non-existent theme', async ({ page }) => {
        await page.keyboard.type('theme set non_existent_theme');
        await page.keyboard.press('Enter');

        const lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText("Theme 'non_existent_theme' not found.");
        await expect(lastCommandOutput).toContainText('Available themes:');
    });

    test('should show error for unknown subcommand', async ({ page }) => {
        await page.keyboard.type('theme invalid_subcommand');
        await page.keyboard.press('Enter');

        const lastCommandOutput = page.locator(SELECTORS.commandOutput).last();
        await expect(lastCommandOutput).toContainText(
            "theme: unknown subcommand 'invalid_subcommand'"
        );
        await expect(lastCommandOutput).toContainText('Usage: theme set {theme_name}');
    });
});
