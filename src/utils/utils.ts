import { FSEntry } from '../enums';

// File system type definitions
export interface FileSystemEntry {
    type: string;
    name?: string;
    content?: string;
    src?: string;
    sudo?: boolean;
    children?: { [key: string]: FileSystemEntry };
}

export interface Settings {
    computerName: string;
    userName: string;
}

export interface CommandLine {
    type: string;
    id: number;
    pwd: string;
    text: string;
    breakWord: boolean;
}

export interface AppState {
    settings: Settings;
    fs: FileSystemEntry; // Initial File System
    cfs: FileSystemEntry; // Current File System (current directory)
    path: string[]; // Current path array
    basePath: string; // Initial path string e.g. "home/user"
    promptText: string;
    previousLines: CommandLine[];
    previousCommands: string[];
    currentLineFromLast: number;
    tabPressed: boolean;
}

export interface TerminalOutput {
    cin: (text?: string, breakWord?: boolean) => void;
    cout: (text?: string, breakWord?: boolean, input?: string, noTrim?: boolean) => void;
}

// String manipulation utilities
export const trim = (str: string): string => str.trimStart().trimEnd();
export const removeSpaces = (text: string): string => text.replace(/\s+/g, ' ').trim();

// File system utilities
export const isDir = (obj: FileSystemEntry | null | undefined): boolean =>
    !!(obj && FSEntry.parse(obj.type) === FSEntry.DIRECTORY);
export const isFile = (obj: FileSystemEntry | null | undefined): boolean =>
    !!(obj && FSEntry.parse(obj.type) === FSEntry.FILE);

// Command parameter utilities
export const getFirstParameter = (str: string): string => trim(str).split(' ')[0];
export const getSecondParameter = (str: string): string => trim(str).split(' ')[1] || '';

// Parameter validation utilities
export const hasSecondParameter = (str: string): boolean => !!getSecondParameter(str);
export const hasTooManyParameters = (str: string): boolean => trim(str).split(' ').length > 2;

// Path display utility
export const buildPwdText = (path: string[], basePath: string): string => {
    return '~' + (path.join('/') === basePath ? '' : '/' + path.join('/'));
};

// Command creation utility
export const createCommandLine = (
    type: string,
    text: string,
    breakWord: boolean,
    noTrim: boolean,
    commandId: number,
    pwdText: string
): CommandLine => {
    return {
        type,
        id: commandId,
        pwd: pwdText,
        text: noTrim ? text : trim(text),
        breakWord
    };
};

// Terminal I/O utilities
export const createTerminalOutput = (
    addLine: (line: CommandLine) => void,
    createCommand: (type: string, text: string, breakWord: boolean, noTrim: boolean) => CommandLine,
    getPromptContent: () => string
): TerminalOutput => {
    const cin = (text = '', breakWord = true) => {
        const cinText = createCommand('cin', text, breakWord, false);
        addLine(cinText);
    };

    const cout = (text = '', breakWord = true, input = '', noTrim = false) => {
        const inputTrimmed = removeSpaces(getPromptContent() || input);
        cin(inputTrimmed, breakWord);

        const coutText = createCommand('cout', text, breakWord, noTrim);
        addLine(coutText);
    };

    return { cin, cout };
};

// Command validation utilities
export const validateCommand = (
    hasExtraParams: boolean,
    commandName: string,
    cout: (text: string) => void
): boolean => {
    if (hasExtraParams) {
        cout(`bash: ${commandName}: too many arguments`);
        return false;
    }
    return true;
};

export const validateFileName = (
    fileName: string | undefined,
    commandName: string,
    cout: (text: string) => void
): boolean => {
    if (!fileName) {
        cout(`${commandName}: missing operand`);
        return false;
    }
    return true;
};

// File system operations utilities
export const handleFileNotFound = (fileName: string, cout: (text: string) => void) => {
    cout(`bash: ${fileName}: No such file or directory`);
};

export const handlePermissionDenied = (fileName: string, cout: (text: string) => void) => {
    cout(`bash: ${fileName}: permission denied`);
};

export const handleIsDirectory = (
    fileName: string,
    commandName: string,
    cout: (text: string) => void
) => {
    if (commandName === 'cat') {
        cout(`cat: ${fileName}: Is a directory`);
    } else if (commandName === 'rm') {
        cout(`rm: cannot remove '${fileName}': Is a directory`);
    }
};

export const handleNotDirectory = (fileName: string, cout: (text: string) => void) => {
    cout(`bash: cd: ${fileName}: Not a directory`);
};

// File system navigation utility
export const resolveFileSystemPath = (
    rootFileSystem: FileSystemEntry,
    currentFileSystem: FileSystemEntry,
    currentPath: string[],
    targetPath: string
): FileSystemEntry | null => {
    if (!targetPath || targetPath === '.') return currentFileSystem;

    const pathParts = targetPath.split('/').filter(part => part !== '');
    let current = currentFileSystem;
    let workingPath = [...currentPath]; // Copy current path

    for (const part of pathParts) {
        if (part === '..') {
            // Go up one directory
            if (workingPath.length > 0) {
                workingPath.pop();
                // Navigate to the parent directory from root
                current = rootFileSystem;
                for (const pathSegment of workingPath) {
                    if (current.children && current.children[pathSegment]) {
                        current = current.children[pathSegment];
                    } else {
                        return null; // Path not found
                    }
                }
            } else {
                // Already at root, can't go up further
                current = rootFileSystem;
            }
        } else {
            // Normal directory navigation
            if (!current || !current.children || !current.children[part]) {
                return null; // Path not found
            }
            current = current.children[part];
            workingPath.push(part);
        }
    }

    return current;
};

// Navigate to target directory for tab completion
export const navigateToTargetDirectory = (
    state: { fs: FileSystemEntry; cfs: FileSystemEntry; path: string[] },
    param2: string
): { targetFS: FileSystemEntry; searchTerm: string; workingPath: string[] } => {
    let targetFS = state.cfs;
    let searchTerm = param2;
    let workingPath = [...state.path];

    if (param2.includes('/')) {
        const pathParts = param2.split('/');
        searchTerm = pathParts.pop() || '';
        const directoryPath = pathParts.filter(part => part !== '');

        for (const dirName of directoryPath) {
            if (dirName === '..') {
                if (workingPath.length > 0) {
                    workingPath.pop();
                    targetFS = state.fs;
                    for (const pathSegment of workingPath) {
                        if (targetFS.children && targetFS.children[pathSegment]) {
                            targetFS = targetFS.children[pathSegment];
                        } else {
                            return {
                                targetFS: state.cfs,
                                searchTerm: param2,
                                workingPath
                            };
                        }
                    }
                } else {
                    targetFS = state.fs;
                }
            } else {
                if (
                    targetFS.children &&
                    targetFS.children[dirName] &&
                    isDir(targetFS.children[dirName])
                ) {
                    targetFS = targetFS.children[dirName];
                    workingPath.push(dirName);
                } else {
                    return {
                        targetFS: state.cfs,
                        searchTerm: param2,
                        workingPath
                    };
                }
            }
        }
    }

    return { targetFS, searchTerm, workingPath };
};

// Tab completion utilities
export const getMatchingItems = (
    children: { [key: string]: FileSystemEntry },
    searchTerm: string
): string[] => {
    return Object.keys(children).filter(dir =>
        dir.toLowerCase().startsWith(searchTerm.toLowerCase())
    );
};

export const formatDirectoryListing = (children: { [key: string]: FileSystemEntry }): string => {
    const dirs = Object.keys(children).map(key => {
        const slash = isDir(children[key]) ? '/' : '';
        return `<span class="type-${children[key]?.type}">${key}${slash}</span>`;
    });
    return dirs.join('&#09;');
};

// Path calculation for navigation
export const calculateNewPath = (currentPath: string[], fileName: string): string[] => {
    const pathParts = fileName.split('/').filter(part => part !== '');
    let newPath = [...currentPath];

    for (const part of pathParts) {
        if (part === '..') {
            if (newPath.length > 0) newPath.pop();
        } else {
            newPath.push(part);
        }
    }

    return newPath;
};

// Command history utilities
export const getCommandFromHistory = (
    commands: string[],
    currentLineFromLast: number,
    direction: 'up' | 'down'
): { command: string; newLineFromLast: number } | null => {
    if (direction === 'up') {
        if (currentLineFromLast < commands.length) {
            const newCurrentLine = currentLineFromLast + 1;
            return {
                command: commands[commands.length - newCurrentLine],
                newLineFromLast: newCurrentLine
            };
        }
    } else if (direction === 'down') {
        if (currentLineFromLast > 1) {
            const newCurrentLine = currentLineFromLast - 1;
            return {
                command: commands[commands.length - newCurrentLine],
                newLineFromLast: newCurrentLine
            };
        }
    }
    return null;
};

// File system modification utilities
export const removeFileFromFileSystem = (
    fs: FileSystemEntry,
    path: string[],
    fileToRemove: string
): FileSystemEntry => {
    if (path.length === 0) {
        // We're at the target directory, remove the file
        const newChildren = { ...fs.children };
        delete newChildren[fileToRemove];
        return { ...fs, children: newChildren };
    }

    // We need to go deeper
    const [currentPath, ...remainingPath] = path;
    const newChildren = { ...fs.children };

    if (newChildren[currentPath]) {
        newChildren[currentPath] = removeFileFromFileSystem(
            newChildren[currentPath],
            remainingPath,
            fileToRemove
        );
    }

    return { ...fs, children: newChildren };
};

export const addDirectoryToFileSystem = (
    fs: FileSystemEntry,
    path: string[],
    directoryName: string
): FileSystemEntry => {
    if (path.length === 0) {
        // We're at the target directory, add the new directory
        const newChildren = { ...fs.children };
        newChildren[directoryName] = {
            type: 'directory',
            name: directoryName,
            children: {}
        };
        return { ...fs, children: newChildren };
    }

    // We need to go deeper
    const [currentPath, ...remainingPath] = path;
    const newChildren = { ...fs.children };

    if (newChildren[currentPath]) {
        newChildren[currentPath] = addDirectoryToFileSystem(
            newChildren[currentPath],
            remainingPath,
            directoryName
        );
    }

    return { ...fs, children: newChildren };
};

// Browser utilities
export const copy = (text: string): void => {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(
            () => {
                console.log('Copying to clipboard was successful!');
            },
            err => {
                console.error('Could not copy text: ', err);
            }
        );
    } else {
        console.warn('Clipboard API not available');
    }
};

export const openExternalLink = (link: string): void => {
    window.open(link, '_blank')?.focus();
};
