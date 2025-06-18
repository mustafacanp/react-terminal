import {
    AppState,
    TerminalOutput,
    FileSystemEntry,
    getSecondParameter,
    hasSecondParameter,
    hasTooManyParameters,
    resolveFileSystemPath,
    removeFileFromFileSystem,
    isDir,
    isFile,
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
    openExternalLink
} from './utils';

export type CommandFunction = (
    input?: string,
    sudo?: boolean
) => void | Promise<void>;

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
    'rm',
    'textgame',
    'randomcolor'
];

// Command implementations
export const createCommands = (
    context: CommandContext
): Record<string, CommandFunction> => {
    const { state, setState, io, getPromptContent } = context;
    const { cin, cout } = io;

    return {
        help: async () => {
            cout(
                ['Usable Commands:', ...AVAILABLE_COMMANDS].join('&#09;'),
                false
            );
        },

        clear: () => {
            setState(prev => ({ ...prev, previousLines: [] }));
        },

        pwd: () => {
            const cwd = buildPwdText(state.path, state.basePath).replace(
                '~',
                '/' + state.basePath
            );
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
            if (
                !validateCommand(hasTooManyParameters(input || ''), 'cd', cout)
            ) {
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

        cat: async (input?: string, sudo = false) => {
            const fileName = getSecondParameter(input || '');
            if (!validateFileName(fileName, 'cat', cout)) {
                return;
            }

            if (
                !validateCommand(hasTooManyParameters(input || ''), 'cat', cout)
            ) {
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
                            const fileContent = await fetch(
                                selectedFileOrDir.src
                            ).then(res => res.text());
                            cout(fileContent, true, getPromptContent(), true);
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

            if (
                !validateCommand(hasTooManyParameters(input || ''), 'rm', cout)
            ) {
                return;
            }

            const fileEntry = resolveFileSystemPath(
                state.fs,
                state.cfs,
                state.path,
                fileName
            );

            if (!fileEntry) {
                cout(
                    `rm: cannot remove '${fileName}': No such file or directory`
                );
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

            // Remove file from file system
            const baseFileName = fileName.split('/').pop() || fileName;
            setState(prev => ({
                ...prev,
                fs: removeFileFromFileSystem(prev.fs, prev.path, baseFileName),
                cfs: {
                    ...prev.cfs,
                    children: prev.cfs.children
                        ? Object.fromEntries(
                              Object.entries(prev.cfs.children).filter(
                                  ([key]) => key !== baseFileName
                              )
                          )
                        : {}
                }
            }));
            cin(getPromptContent());
        },

        sudo: (input?: string) => {
            const inputWithoutSudo = (input || '').substring(
                (input || '').indexOf(' ') + 1
            );
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
        }
    };
};

// Command execution utility
export const executeCommand = (
    input: string,
    commands: Record<string, CommandFunction>,
    io: TerminalOutput,
    addToHistory: (command: string) => void
): void => {
    const { cin, cout } = io;
    const command = getFirstParameter(input);

    if (commands[command]) {
        commands[command](input);
    } else if (input === '') {
        cin();
    } else {
        cout(`${command}: command not found`);
    }

    // Update command history
    if (input !== '') {
        addToHistory(input);
    }
};
