import {
    AppState,
    TerminalOutput,
    FileSystemEntry,
    getSecondParameter,
    hasSecondParameter,
    hasTooManyParameters,
    resolveFileSystemPath,
    removeFileFromFileSystem,
    addDirectoryToFileSystem,
    addFileToFileSystem,
    isDir,
    isFile,
    isLink,
    getFirstParameter,
    validateCommand,
    validateFileName,
    handleFileNotFound,
    handlePermissionDenied,
    handleIsDirectory,
    handleNotDirectory,
    formatDirectoryListing,
    calculateNewPath,
    buildPwdText,
    openExternalLink,
    saveFileSystemToStorage,
    clearFileSystemStorage,
    removeDirectoryFromFileSystem,
    clearCommandHistoryStorage,
    clearThemeStorage
} from './utils';

export type CommandFunction = (input?: string, sudo?: boolean) => void | Promise<void>;

export interface CommandContext {
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    io: TerminalOutput;
    getPromptContent: () => string;
}

// Available commands list
export const AVAILABLE_COMMANDS = [
    'help',
    'clear',
    'pwd',
    'ls',
    'cd',
    'cat',
    'mkdir',
    'rm',
    'rmdir',
    'reset',
    'echo',
    'touch',
    'whoami',
    'textgame',
    'randomcolor',
    'history',
    'theme'
];

// Command implementations
export const createCommands = (context: CommandContext): Record<string, CommandFunction> => {
    const { state, setState, io, getPromptContent } = context;
    const { cin, cout } = io;

    return {
        help: async () => {
            cout(['Usable Commands:', ...AVAILABLE_COMMANDS].join('&#09;'), false);
        },

        clear: () => {
            setState(prev => ({ ...prev, previousLines: [] }));
        },

        pwd: () => {
            const cwd = buildPwdText(state.path, state.basePath).replace('~', '/' + state.basePath);
            cout(cwd);
        },

        ls: (input?: string) => {
            if (!validateCommand(hasSecondParameter(input || ''), 'ls', cout)) {
                return;
            }

            const listing = formatDirectoryListing(state.cfs.children || {});
            cout(listing, false);
        },

        cd: (input?: string) => {
            if (!validateCommand(hasTooManyParameters(input || ''), 'cd', cout)) {
                return;
            }

            const fileName = getSecondParameter(input || '');
            if (!fileName || fileName === '.') {
                cin(getPromptContent());
                return;
            }

            if (fileName === '/' || fileName === '~') {
                cin(getPromptContent());
                setState(prev => ({
                    ...prev,
                    cfs: state.fs,
                    path: []
                }));
                return;
            }

            const selectedFileOrDir = resolveFileSystemPath(
                state.fs,
                state.cfs,
                state.path,
                fileName
            );

            if (isDir(selectedFileOrDir)) {
                cin(getPromptContent());
                const newPath = calculateNewPath(state.path, fileName);

                setState(prev => ({
                    ...prev,
                    path: newPath,
                    cfs: selectedFileOrDir as FileSystemEntry
                }));
            } else if (isFile(selectedFileOrDir)) {
                handleNotDirectory(fileName, cout);
            } else {
                handleFileNotFound(fileName, cout);
            }
        },

        mkdir: (input?: string) => {
            const directoryName = getSecondParameter(input || '');
            if (!validateFileName(directoryName, 'mkdir', cout)) {
                return;
            }

            if (!validateCommand(hasTooManyParameters(input || ''), 'mkdir', cout)) {
                return;
            }

            // Check if directory already exists
            const existingEntry = resolveFileSystemPath(
                state.fs,
                state.cfs,
                state.path,
                directoryName
            );

            if (existingEntry) {
                cout(`mkdir: cannot create directory '${directoryName}': File exists`);
                return;
            }

            // Validate directory name (basic validation - no invalid characters)
            if (directoryName.includes('/') || directoryName.includes('\\')) {
                cout(`mkdir: cannot create directory '${directoryName}': Invalid directory name`);
                return;
            }

            setState(prev => {
                // Add directory to the file system
                const newFs = addDirectoryToFileSystem(prev.fs, prev.path, directoryName);

                // Update current directory children
                const newCfs = {
                    ...prev.cfs,
                    children: {
                        ...prev.cfs.children,
                        [directoryName]: {
                            type: 'directory',
                            name: directoryName,
                            children: {}
                        }
                    }
                };

                // Save updated file system to localStorage
                saveFileSystemToStorage(newFs);

                return {
                    ...prev,
                    fs: newFs,
                    cfs: newCfs
                };
            });

            cin(getPromptContent());
        },

        cat: async (input?: string, sudo = false) => {
            const fileName = getSecondParameter(input || '');
            if (!validateFileName(fileName, 'cat', cout)) {
                return;
            }

            if (!validateCommand(hasTooManyParameters(input || ''), 'cat', cout)) {
                return;
            }

            const selectedFileOrDir = resolveFileSystemPath(
                state.fs,
                state.cfs,
                state.path,
                fileName
            );

            if (isFile(selectedFileOrDir) && selectedFileOrDir) {
                if (!selectedFileOrDir.sudo || sudo) {
                    if (selectedFileOrDir.src) {
                        try {
                            const fileContent = await fetch(selectedFileOrDir.src).then(res =>
                                res.text()
                            );
                            cout(fileContent, true, input || '', true);
                        } catch {
                            handleFileNotFound(fileName, cout);
                        }
                    } else {
                        handleFileNotFound(fileName, cout);
                    }
                } else {
                    handlePermissionDenied(fileName, cout);
                }
            } else if (isDir(selectedFileOrDir)) {
                handleIsDirectory(fileName, 'cat', cout);
            } else {
                handleFileNotFound(fileName, cout);
            }
        },

        rm: (input?: string, sudo = false) => {
            const fileName = getSecondParameter(input || '');
            if (!validateFileName(fileName, 'rm', cout)) {
                return;
            }

            if (!validateCommand(hasTooManyParameters(input || ''), 'rm', cout)) {
                return;
            }

            const fileEntry = resolveFileSystemPath(state.fs, state.cfs, state.path, fileName);

            if (!fileEntry) {
                cout(`rm: cannot remove '${fileName}': No such file or directory`);
                return;
            }

            if (isDir(fileEntry)) {
                handleIsDirectory(fileName, 'rm', cout);
                return;
            }

            if (fileEntry.sudo && !sudo) {
                cout(`rm: cannot remove '${fileName}': Permission denied`);
                return;
            }

            // Calculate the actual path where the file exists
            const baseFileName = fileName.split('/').pop() || fileName;
            const isInCurrentDir = !fileName.includes('/') || fileName === `./${baseFileName}`;
            const targetPath = isInCurrentDir
                ? state.path
                : calculateNewPath(state.path, fileName.substring(0, fileName.lastIndexOf('/')));

            setState(prev => {
                // Remove from the file system using the correct target path
                const newFs = removeFileFromFileSystem(prev.fs, targetPath, baseFileName);

                // Update current directory children only if file is in current directory
                const newCfs = isInCurrentDir
                    ? {
                          ...prev.cfs,
                          children: prev.cfs.children
                              ? Object.fromEntries(
                                    Object.entries(prev.cfs.children).filter(
                                        ([key]) => key !== baseFileName
                                    )
                                )
                              : {}
                      }
                    : prev.cfs;

                // Save updated file system to localStorage
                saveFileSystemToStorage(newFs);

                return {
                    ...prev,
                    fs: newFs,
                    cfs: newCfs
                };
            });
            cin(getPromptContent());
        },

        rmdir: (input?: string) => {
            const directoryName = getSecondParameter(input || '');
            if (!validateFileName(directoryName, 'rmdir', cout)) {
                return;
            }

            if (!validateCommand(hasTooManyParameters(input || ''), 'rmdir', cout)) {
                return;
            }

            const directoryEntry = resolveFileSystemPath(
                state.fs,
                state.cfs,
                state.path,
                directoryName
            );

            if (!directoryEntry) {
                cout(`rmdir: cannot remove '${directoryName}': No such file or directory`);
                return;
            }

            if (!isDir(directoryEntry)) {
                cout(`rmdir: cannot remove '${directoryName}': Not a directory`);
                return;
            }

            // Check if directory is empty
            if (directoryEntry.children && Object.keys(directoryEntry.children).length > 0) {
                cout(`rmdir: cannot remove '${directoryName}': Directory not empty`);
                return;
            }

            // Calculate the actual path where the directory exists
            const baseDirName = directoryName.split('/').pop() || directoryName;
            const isInCurrentDir =
                !directoryName.includes('/') || directoryName === `./${baseDirName}`;
            const targetPath = isInCurrentDir
                ? state.path
                : calculateNewPath(
                      state.path,
                      directoryName.substring(0, directoryName.lastIndexOf('/'))
                  );

            setState(prev => {
                // Remove from the file system using the correct target path
                const newFs = removeDirectoryFromFileSystem(prev.fs, targetPath, baseDirName);

                // Update current directory children only if directory is in current directory
                const newCfs = isInCurrentDir
                    ? {
                          ...prev.cfs,
                          children: prev.cfs.children
                              ? Object.fromEntries(
                                    Object.entries(prev.cfs.children).filter(
                                        ([key]) => key !== baseDirName
                                    )
                                )
                              : {}
                      }
                    : prev.cfs;

                // Save updated file system to localStorage
                saveFileSystemToStorage(newFs);

                return {
                    ...prev,
                    fs: newFs,
                    cfs: newCfs
                };
            });
            cin(getPromptContent());
        },

        reset: () => {
            cout('Resetting file system and theme to default state...');
            clearFileSystemStorage();
            clearThemeStorage();
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        },

        echo: (input?: string) => {
            const text = input?.substring(input.indexOf(' ') + 1) || '';

            if (!text || text === 'echo') {
                cin(getPromptContent());
                return;
            }

            // Handle special characters and basic variable substitution
            let processedText = text
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\$USER/g, state.settings.userName)
                .replace(/\$HOSTNAME/g, state.settings.computerName)
                .replace(/\$PWD/g, buildPwdText(state.path, state.basePath));

            // Remove matching quotes
            if (
                (processedText.startsWith('"') && processedText.endsWith('"')) ||
                (processedText.startsWith("'") && processedText.endsWith("'"))
            ) {
                processedText = processedText.slice(1, -1);
            }

            cout(processedText, true);
        },

        history: (input?: string) => {
            const param = getSecondParameter(input || '');

            if (param === '-c') {
                setState(prev => ({ ...prev, previousCommands: [] }));
                clearCommandHistoryStorage();
            } else if (param) {
                cout(`history: invalid option -- '${param}'`);
                cout(`history: usage: history [-c]`);
            } else {
                const history = state.previousCommands;
                if (history.length === 0) {
                    cout('No commands in history.');
                    return;
                }

                const historyOutput = history
                    .map((cmd, i) => `&nbsp;&nbsp;&nbsp;${i + 1}  ${cmd}`)
                    .join('<br/>');
                cout(historyOutput, false);
            }
        },

        touch: (input?: string) => {
            const fileName = getSecondParameter(input || '');
            if (!validateFileName(fileName, 'touch', cout)) {
                return;
            }

            if (!validateCommand(hasTooManyParameters(input || ''), 'touch', cout)) {
                return;
            }

            // Check if file already exists
            const existingEntry = resolveFileSystemPath(state.fs, state.cfs, state.path, fileName);

            if (existingEntry) {
                // File exists - in real touch, this would update timestamp
                // For simplicity, we'll just report success
                cin(getPromptContent());
                return;
            }

            // Validate file name (basic validation - no invalid characters)
            if (fileName.includes('/') || fileName.includes('\\')) {
                cout(`touch: cannot create file '${fileName}': Invalid file name`);
                return;
            }

            setState(prev => {
                // Add file to the file system
                const newFs = addFileToFileSystem(prev.fs, prev.path, fileName, '');

                // Update current directory children
                const newCfs = {
                    ...prev.cfs,
                    children: {
                        ...prev.cfs.children,
                        [fileName]: {
                            type: 'file',
                            name: fileName,
                            content: ''
                        }
                    }
                };

                // Save updated file system to localStorage
                saveFileSystemToStorage(newFs);

                return {
                    ...prev,
                    fs: newFs,
                    cfs: newCfs
                };
            });

            cin(getPromptContent());
        },

        whoami: () => {
            cout(state.settings.userName);
        },

        sudo: (input?: string) => {
            const inputWithoutSudo = (input || '').substring((input || '').indexOf(' ') + 1);
            const command = getFirstParameter(inputWithoutSudo);
            const commands = createCommands(context);

            if (commands[command]) {
                commands[command](inputWithoutSudo, true);
            } else {
                cout(`sudo: ${command}: command not found`);
            }
        },

        textgame: () => {
            openExternalLink('https://rpgtextgame.netlify.app');
            cin(getPromptContent());
        },

        randomcolor: () => {
            openExternalLink('https://randomcolor2.netlify.app');
            cin(getPromptContent());
        },

        theme: (input?: string) => {
            const subcommand = getSecondParameter(input || '');
            const themeName = (input || '').split(' ')[2] || '';

            if (!subcommand || (subcommand === 'set' && !themeName)) {
                const availableThemes = Object.keys(state.themes).join(', ');
                cout(`Usage: theme set {theme_name}\nAvailable themes: ${availableThemes}`);
                return;
            }

            if (subcommand === 'set') {
                if (state.themes[themeName]) {
                    setState(prev => ({ ...prev, theme: themeName }));
                    cout(`Theme set to ${themeName}`);
                } else {
                    const availableThemes = Object.keys(state.themes).join(', ');
                    cout(`Theme '${themeName}' not found.\nAvailable themes: ${availableThemes}`);
                }
            } else {
                cout(`theme: unknown subcommand '${subcommand}'\nUsage: theme set {theme_name}`);
            }
        }
    };
};

// Command execution utility
export const executeCommand = (
    input: string,
    commands: Record<string, CommandFunction>,
    io: TerminalOutput,
    addToHistory: (command: string) => void,
    state: AppState
): void => {
    const { cin, cout } = io;
    const command = getFirstParameter(input);

    // Update command history
    if (input !== '') {
        addToHistory(input);
    }

    // Check if command is a link in current directory
    if (!commands[command] && state.cfs.children && state.cfs.children[command]) {
        const entry = state.cfs.children[command];
        if (isLink(entry) && entry.target) {
            openExternalLink(entry.target);
            cout('Opening external link...');
            return;
        }
    }

    if (commands[command]) {
        commands[command](input);
    } else if (input === '') {
        cin();
    } else {
        cout(`${command}: command not found`);
    }
};
