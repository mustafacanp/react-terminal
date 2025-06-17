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

// String manipulation utilities
export const trim = (str: string): string => str.trimStart().trimEnd();
export const removeSpaces = (text: string): string =>
    text.replace(/\s+/g, ' ').trim();

// File system utilities
export const isDir = (obj: FileSystemEntry | null | undefined): boolean =>
    !!(obj && FSEntry.parse(obj.type) === FSEntry.DIRECTORY);
export const isFile = (obj: FileSystemEntry | null | undefined): boolean =>
    !!(obj && FSEntry.parse(obj.type) === FSEntry.FILE);

// Command parameter utilities
export const getFirstParameter = (str: string): string =>
    trim(str).split(' ')[0];
export const getSecondParameter = (str: string): string =>
    trim(str).split(' ')[1] || '';

// Parameter validation utilities
export const hasSecondParameter = (str: string): boolean =>
    !!getSecondParameter(str);
export const hasTooManyParameters = (str: string): boolean =>
    trim(str).split(' ').length > 2;

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

// Path utilities
export const getLastDir = (path: string): string => {
    const parts = path.split('/').filter(Boolean);
    return path.endsWith('/')
        ? parts[parts.length - 1]
        : parts[parts.length - 2];
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
