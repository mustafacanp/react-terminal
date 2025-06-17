import { useState, useRef, useCallback } from 'react';
import { PromptRef } from '../components/Prompt';
import {
    trim,
    removeSpaces,
    isDir,
    isFile,
    getFirstParameter,
    getSecondParameter,
    hasSecondParameter,
    hasTooManyParameters,
    resolveFileSystemPath,
    FileSystemEntry
} from '../utils/utils';
import fs from '../fs.json';

interface Settings {
    computerName: string;
    userName: string;
}

interface CommandLine {
    type: string;
    id: number;
    pwd: string;
    text: string;
    breakWord: boolean;
}

interface AppState {
    settings: Settings;
    fs: FileSystemEntry;
    cfs: FileSystemEntry;
    path: string[];
    basePath: string;
    promptText: string;
    previousLines: CommandLine[];
    previousCommands: string[];
    currentLineFromLast: number;
    tabPressed: boolean;
}

export const useTerminal = () => {
    const [state, setState] = useState<AppState>({
        settings: {
            computerName: 'ubuntu',
            userName: 'root'
        },
        fs: fs as FileSystemEntry,
        cfs: fs as FileSystemEntry,
        path: [],
        basePath: 'home/user',
        promptText: '',
        previousLines: [],
        previousCommands: [],
        currentLineFromLast: 0,
        tabPressed: false
    });

    const _prompt = useRef<PromptRef>(null);
    const commandIdCounter = useRef(0);

    // Helper functions
    const pwdText = useCallback(() => {
        return (
            '~' +
            (state.path.join('/') === state.basePath
                ? ''
                : '/' + state.path.join('/'))
        );
    }, [state.path, state.basePath]);

    const createNewCommand = useCallback(
        (type: string, text: string, breakWord: boolean, noTrim: boolean) => {
            commandIdCounter.current += 1;
            return {
                type,
                id: commandIdCounter.current,
                pwd: pwdText(),
                text: noTrim ? text : trim(text),
                breakWord
            };
        },
        [pwdText]
    );

    const cin = useCallback(
        (text = '', breakWord = true) => {
            const cinText = createNewCommand('cin', text, breakWord, false);
            setState(prev => ({
                ...prev,
                previousLines: [...prev.previousLines, cinText],
                promptText: ''
            }));
        },
        [createNewCommand]
    );

    const cout = useCallback(
        (text = '', breakWord = true, input = '', noTrim = false) => {
            const inputTrimmed = removeSpaces(
                _prompt.current?.content || input
            );
            cin(inputTrimmed, breakWord);

            const coutText = createNewCommand('cout', text, breakWord, noTrim);
            setState(prev => ({
                ...prev,
                previousLines: [...prev.previousLines, coutText],
                promptText: ''
            }));
        },
        [createNewCommand, cin]
    );

    const openLink = useCallback(
        (link: string) => {
            window.open(link, '_blank')?.focus();
            cin(_prompt.current?.content || '');
        },
        [cin]
    );

    const validateAndShowError = useCallback(
        (hasExtraParams: boolean, commandName: string) => {
            if (hasExtraParams) {
                cout(`bash: ${commandName}: too many arguments`);
                return true;
            }
            return false;
        },
        [cout]
    );

    // Command implementations directly in the hook
    const commands = {
        help: async () => {
            // Simplified - you can fetch from bashrc if needed
            const availableCommands = [
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
            cout(
                ['Usable Commands:', ...availableCommands].join('&#09;'),
                false
            );
        },

        clear: () => {
            setState(prev => ({ ...prev, previousLines: [] }));
        },

        pwd: () => {
            const cwd = pwdText().replace('~', '/' + state.basePath);
            cout(cwd);
        },

        ls: (input?: string) => {
            if (validateAndShowError(hasSecondParameter(input || ''), 'ls'))
                return;

            const dirs = Object.keys(state.cfs.children || {}).map(key => {
                const slash = isDir(state.cfs.children?.[key]) ? '/' : '';
                return `<span class="type-${state.cfs.children?.[key]?.type}">${key}${slash}</span>`;
            });
            cout(dirs.join('&#09;'), false);
        },

        cd: (input?: string) => {
            if (validateAndShowError(hasTooManyParameters(input || ''), 'cd'))
                return;

            const secondParam = getSecondParameter(input || '');
            if (!secondParam || secondParam === '.') {
                cin(_prompt.current?.content || '');
                return;
            }

            if (secondParam === '/' || secondParam === '~') {
                cin(_prompt.current?.content || '');
                setState(prev => ({ ...prev, cfs: state.fs, path: [] }));
                return;
            }

            const selectedFileOrDir = resolveFileSystemPath(
                state.fs,
                state.cfs,
                state.path,
                secondParam
            );

            if (isDir(selectedFileOrDir)) {
                cin(_prompt.current?.content || '');
                const pathParts = secondParam
                    .split('/')
                    .filter(part => part !== '');
                let newPath = [...state.path];

                for (const part of pathParts) {
                    if (part === '..') {
                        if (newPath.length > 0) newPath.pop();
                    } else {
                        newPath.push(part);
                    }
                }

                setState(prev => ({
                    ...prev,
                    path: newPath,
                    cfs: selectedFileOrDir as FileSystemEntry
                }));
            } else if (isFile(selectedFileOrDir)) {
                cout(`bash: cd: ${secondParam}: Not a directory`);
            } else {
                cout(`bash: cd: ${secondParam}: No such file or directory`);
            }
        },

        cat: async (input?: string, sudo = false) => {
            const secondParam = getSecondParameter(input || '');
            if (!secondParam) {
                cout('cat: missing operand');
                return;
            }

            if (validateAndShowError(hasTooManyParameters(input || ''), 'cat'))
                return;

            const selectedFileOrDir = resolveFileSystemPath(
                state.fs,
                state.cfs,
                state.path,
                secondParam
            );

            if (isFile(selectedFileOrDir) && selectedFileOrDir) {
                if (!selectedFileOrDir.sudo || sudo) {
                    if (selectedFileOrDir.src) {
                        const input = _prompt.current?.content;
                        const fileContent = await fetch(
                            selectedFileOrDir.src
                        ).then(res => res.text());
                        cout(fileContent, true, input || '', true);
                    } else {
                        cout(`cat: ${secondParam}: No such file or directory`);
                    }
                } else {
                    cout(`bash: ${secondParam}: permission denied`);
                }
            } else if (isDir(selectedFileOrDir)) {
                cout(`cat: ${secondParam}: Is a directory`);
            } else {
                cout(`cat: ${secondParam}: No such file or directory`);
            }
        },

        sudo: (input?: string) => {
            const inputWithoutSudo = (input || '').substring(
                (input || '').indexOf(' ') + 1
            );
            const command = getFirstParameter(inputWithoutSudo);

            if (commands[command as keyof typeof commands]) {
                (commands[command as keyof typeof commands] as any)(
                    inputWithoutSudo,
                    true
                );
            } else {
                cout(`sudo: ${command}: command not found`);
            }
        },

        textgame: () => openLink('https://rpgtextgame.netlify.app'),
        randomcolor: () => openLink('https://randomcolor2.netlify.app')
    };

    const executeCommand = useCallback(
        (input: string) => {
            const command = getFirstParameter(input);

            if (commands[command as keyof typeof commands]) {
                (commands[command as keyof typeof commands] as any)(input);
            } else if (input === '') {
                cin();
            } else {
                cout(`${command}: command not found`);
            }

            // Update command history
            if (input !== '') {
                setState(prev => ({
                    ...prev,
                    previousCommands: [...prev.previousCommands, input]
                }));
            }
        },
        [cin, cout]
    );

    // Tab completion logic
    const handleTabCompletion = useCallback(
        (
            originalInput: string,
            command: string,
            targetPath: string,
            childrenFS: { [key: string]: FileSystemEntry },
            matchingItems: string[],
            sudoPrefix: string
        ) => {
            if (targetPath.includes('/')) {
                const selectedDir = targetPath.split('/').pop() || '';
                const dir = childrenFS[selectedDir];
                if (isDir(dir)) {
                    const newTargetPath =
                        targetPath.split('/').pop()?.toLowerCase() || '';
                    const children = Object.keys(dir.children || {});
                    const newMatchingItems = children.filter(item =>
                        item
                            .toLowerCase()
                            .startsWith(newTargetPath.toLowerCase())
                    );
                    return handleTabCompletion(
                        originalInput,
                        command,
                        newTargetPath,
                        dir.children || {},
                        newMatchingItems,
                        sudoPrefix
                    );
                }
            }

            if (targetPath === '') {
                cout(matchingItems.join('&#09;'), false);
                setState(prev => ({ ...prev, promptText: originalInput }));
                return;
            }

            if (matchingItems.length === 1) {
                const inputWithoutSudo = originalInput.replace('sudo ', '');
                const param2 = getSecondParameter(inputWithoutSudo);
                const parentFolders = param2.substring(
                    0,
                    param2.lastIndexOf('/') + 1
                );
                const dirSlash = isDir(childrenFS[matchingItems[0]]) ? '/' : '';

                if (_prompt.current) {
                    _prompt.current.setValue(
                        `${sudoPrefix + command} ${parentFolders}${matchingItems[0]}${dirSlash}`
                    );
                }
            } else if (matchingItems.length > 1) {
                setState(prev => ({ ...prev, tabPressed: true }));
                cout(matchingItems.join('&#09;'), false);
                setState(prev => ({ ...prev, promptText: originalInput }));
            }
        },
        [cout]
    );

    const handleTab = useCallback(
        (e: KeyboardEvent) => {
            e.preventDefault();

            const input = _prompt.current?.content || '';
            const inputWithoutSudo = input.replace('sudo ', '');
            const sudoString = input.startsWith('sudo ') ? 'sudo ' : '';
            const command = getFirstParameter(inputWithoutSudo);
            const param2 = getSecondParameter(inputWithoutSudo);

            if (!['cd', 'cat', 'rm'].includes(command)) return;

            if (input === 'cd' && _prompt.current) {
                _prompt.current.setValue(_prompt.current.content + ' ');
                return;
            }

            // Navigate to target directory with ".." support
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
                                if (
                                    targetFS.children &&
                                    targetFS.children[pathSegment]
                                ) {
                                    targetFS = targetFS.children[pathSegment];
                                } else {
                                    return;
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
                            return;
                        }
                    }
                }
            }

            const children = Object.keys(targetFS.children || {});
            const matchingItems = children.filter(dir =>
                dir.toLowerCase().startsWith(searchTerm.toLowerCase())
            );

            handleTabCompletion(
                input,
                command,
                param2,
                targetFS.children || {},
                matchingItems,
                sudoString
            );
        },
        [handleTabCompletion, state.cfs, state.fs, state.path]
    );

    // Command history navigation
    const handleUpArrow = useCallback(
        (e: KeyboardEvent) => {
            e.preventDefault();
            if (state.currentLineFromLast < state.previousCommands.length) {
                const newCurrentLine = state.currentLineFromLast + 1;
                setState(prev => ({
                    ...prev,
                    currentLineFromLast: newCurrentLine
                }));
                if (_prompt.current) {
                    _prompt.current.setValue(
                        state.previousCommands[
                            state.previousCommands.length - newCurrentLine
                        ]
                    );
                }
            }
        },
        [state.currentLineFromLast, state.previousCommands]
    );

    const handleDownArrow = useCallback(() => {
        if (state.currentLineFromLast > 1) {
            const newCurrentLine = state.currentLineFromLast - 1;
            setState(prev => ({
                ...prev,
                currentLineFromLast: newCurrentLine
            }));
            if (_prompt.current) {
                _prompt.current.setValue(
                    state.previousCommands[
                        state.previousCommands.length - newCurrentLine
                    ]
                );
            }
        }
    }, [state.currentLineFromLast, state.previousCommands]);

    const handleEnter = useCallback(() => {
        setState(prev => ({
            ...prev,
            tabPressed: false,
            currentLineFromLast: 0
        }));

        const input = removeSpaces(_prompt.current?.content || '');
        executeCommand(input);
        _prompt.current?.clear();
    }, [executeCommand]);

    return {
        state,
        setState,
        _prompt,
        pwdText,
        executeCommand,
        cin,
        cout,
        handleTab,
        handleEnter,
        handleUpArrow,
        handleDownArrow
    };
};
