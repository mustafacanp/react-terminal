import React, { useEffect, useLayoutEffect, useRef, useCallback, useState } from 'react';
import { Line, Toolbar, Prompt } from './components';
import { PromptRef } from './components/Prompt';
import {
    copy,
    removeSpaces,
    AppState,
    CommandLine,
    FileSystemEntry,
    buildPwdText,
    createCommandLine,
    createTerminalOutput,
    getCommandFromHistory,
    loadFileSystemFromStorage,
    saveFileSystemToStorage,
    loadCommandHistoryFromStorage,
    saveCommandHistoryToStorage,
    loadThemeFromStorage,
    saveThemeToStorage,
    pasteFromClipboard
} from './utils/utils';
import { createCommands, executeCommand } from './utils/commands';
import { handleTab, TabCompletionContext } from './utils/tabCompletion';
import initialFsJson from './fs.json';
import { themes } from './themes';

const initialState: AppState = {
    settings: {
        computerName: import.meta.env.VITE_COMPUTER_NAME || 'ubuntu',
        userName: import.meta.env.VITE_USER_NAME || 'root'
    },
    fs: initialFsJson as FileSystemEntry,
    cfs: initialFsJson as FileSystemEntry,
    path: [],
    basePath: import.meta.env.VITE_BASE_PATH || 'home/user',
    promptText: '',
    previousLines: [],
    previousCommands: [],
    currentLineFromLast: 0,
    tabPressed: false,
    unsubmittedInput: '',
    themes: themes,
    theme: 'default'
};

const App: React.FC = () => {
    const [state, setState] = useState<AppState>(initialState);
    const terminalRef = useRef<HTMLDivElement>(null);

    // Initialize file system from localStorage on component mount
    useEffect(() => {
        const initializeTheme = () => {
            const storedTheme = loadThemeFromStorage();
            if (storedTheme && themes[storedTheme]) {
                setState(prev => ({ ...prev, theme: storedTheme }));
            }
        };

        const initializeFileSystem = () => {
            const storedFs = loadFileSystemFromStorage();
            if (storedFs) {
                setState(prev => ({
                    ...prev,
                    fs: storedFs,
                    cfs: storedFs,
                    path: [] // Reset to root when loading from localStorage
                }));
            } else {
                // If no stored file system exists, save the default one to localStorage
                const defaultFs = initialFsJson as FileSystemEntry;
                saveFileSystemToStorage(defaultFs);
            }
        };

        const initializeHistory = () => {
            const storedHistory = loadCommandHistoryFromStorage();
            if (storedHistory) {
                setState(prev => ({ ...prev, previousCommands: storedHistory }));
            }
        };

        initializeTheme();
        initializeFileSystem();
        initializeHistory();
    }, []);

    useEffect(() => {
        if (terminalRef.current) {
            const currentTheme = state.themes[state.theme];
            if (currentTheme) {
                for (const [key, value] of Object.entries(currentTheme)) {
                    if (key === 'colors') {
                        if (typeof value === 'object' && value !== null) {
                            for (const [colorKey, colorValue] of Object.entries(value)) {
                                if (typeof colorValue === 'string') {
                                    terminalRef.current.style.setProperty(
                                        `--${colorKey}`,
                                        colorValue
                                    );
                                }
                            }
                        }
                    } else {
                        if (typeof value === 'string') {
                            terminalRef.current.style.setProperty(`--${key}`, value);
                        }
                    }
                }
            }
        }
        saveThemeToStorage(state.theme);
    }, [state.theme, state.themes]);

    const _prompt = useRef<PromptRef>(null);
    const commandIdCounter = useRef(0);
    const _terminalBodyContainer = useRef<HTMLElement | null>(null);
    const _terminalBody = useRef<HTMLElement | null>(null);

    const resetTerminal = useCallback(() => {
        setState(initialState);
        _prompt.current?.clear();
    }, []);

    // Helper functions
    const pwdText = useCallback(() => {
        return buildPwdText(state.path, state.basePath);
    }, [state.path, state.basePath]);

    const getPromptContent = useCallback(() => {
        return _prompt.current?.content || '';
    }, []);

    const addLine = useCallback((line: CommandLine) => {
        setState(prev => ({
            ...prev,
            previousLines: [...prev.previousLines, line],
            promptText: ''
        }));
    }, []);

    const createCommand = useCallback(
        (type: string, text: string, breakWord: boolean, noTrim: boolean) => {
            commandIdCounter.current += 1;
            return createCommandLine(
                type,
                text,
                breakWord,
                noTrim,
                commandIdCounter.current,
                pwdText()
            );
        },
        [pwdText]
    );

    // Terminal I/O
    const io = createTerminalOutput(addLine, createCommand, getPromptContent);

    // Command context
    const commandContext = {
        state,
        setState,
        io,
        getPromptContent
    };

    // Commands
    const commands = createCommands(commandContext);

    const addToHistory = useCallback((command: string) => {
        setState(prev => {
            if (
                // don't add history -c
                command === 'history -c' ||
                // don't add duplicate commands
                prev.previousCommands[prev.previousCommands.length - 1] === command
            ) {
                return prev;
            }
            const newHistory = [...prev.previousCommands, command];
            saveCommandHistoryToStorage(newHistory);
            return {
                ...prev,
                previousCommands: newHistory
            };
        });
    }, []);

    const handleCommandExecution = useCallback(
        (input: string) => {
            executeCommand(input, commands, io, addToHistory, state);
        },
        [commands, io, addToHistory, state]
    );

    // Tab completion context
    const tabCompletionContext: TabCompletionContext = {
        state,
        setState,
        setPromptValue: (value: string) => {
            _prompt.current?.setValue(value);
        },
        cout: io.cout
    };

    // Event handlers
    const handleTabKey = useCallback(
        (e: KeyboardEvent) => {
            handleTab(e, getPromptContent(), tabCompletionContext);
        },
        [getPromptContent, tabCompletionContext]
    );

    const handleUpArrow = useCallback(
        (e: KeyboardEvent) => {
            e.preventDefault();
            const result = getCommandFromHistory(
                state.previousCommands,
                state.currentLineFromLast,
                'up'
            );
            if (result) {
                setState(prev => {
                    const isFirstArrowUp = prev.currentLineFromLast === 0;
                    return {
                        ...prev,
                        currentLineFromLast: result.newLineFromLast,
                        unsubmittedInput: isFirstArrowUp
                            ? getPromptContent()
                            : prev.unsubmittedInput
                    };
                });
                _prompt.current?.setValue(result.command);
            }
        },
        [state.previousCommands, state.currentLineFromLast, getPromptContent]
    );

    const handleDownArrow = useCallback(() => {
        const result = getCommandFromHistory(
            state.previousCommands,
            state.currentLineFromLast,
            'down'
        );
        if (result) {
            const commandToSet =
                result.newLineFromLast === 0 ? state.unsubmittedInput : result.command;

            setState(prev => ({
                ...prev,
                currentLineFromLast: result.newLineFromLast
            }));
            _prompt.current?.setValue(commandToSet);
        }
    }, [state.previousCommands, state.currentLineFromLast, state.unsubmittedInput]);

    const handleEnter = useCallback(() => {
        setState(prev => ({
            ...prev,
            tabPressed: false,
            currentLineFromLast: 0,
            unsubmittedInput: ''
        }));

        const input = removeSpaces(getPromptContent());
        handleCommandExecution(input);
        _prompt.current?.clear();
    }, [getPromptContent, handleCommandExecution]);

    const handleKeyDown = useCallback(
        async (e: KeyboardEvent) => {
            // Handle Ctrl+C for copying selected text
            if (e.ctrlKey && e.key === 'c') {
                const selection = window.getSelection();
                if (selection && selection.toString() !== '') {
                    copy(selection.toString());
                    e.preventDefault();
                    return;
                }
            }

            if (e.ctrlKey && e.key === 'v') {
                e.preventDefault();
                await pasteFromClipboard(_prompt);
                return;
            }

            if (e.ctrlKey || e.altKey) {
                _prompt.current?.blurPrompt();
                e.preventDefault();
                return;
            }

            switch (e.key) {
                case 'Tab':
                    handleTabKey(e);
                    break;
                case 'Enter':
                    handleEnter();
                    break;
                case 'ArrowUp':
                    handleUpArrow(e);
                    break;
                case 'ArrowDown':
                    handleDownArrow();
                    break;
                default:
                    break;
            }

            _prompt.current?.focusPrompt();
        },
        [handleTabKey, handleEnter, handleUpArrow, handleDownArrow]
    );

    const handleMouseInteraction = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
        // Prevent focus when text is selected
        const selection = window.getSelection();
        if (e.type === 'click' && selection?.toString()) {
            return;
        }

        if ('buttons' in e && e.buttons === 2) {
            // Right-click for paste
            e.preventDefault();
            await pasteFromClipboard(_prompt);
        } else if (e.type === 'click' || e.type === 'touchend') {
            // Left-click/tap for focus
            _prompt.current?.focusPrompt();
        }
    }, []);

    const renderPreviousLines = useCallback(() => {
        return state.previousLines.map((previousCommand: CommandLine) => (
            <Line settings={state.settings} key={previousCommand.id} command={previousCommand} />
        ));
    }, [state.previousLines, state.settings]);

    // Auto-scroll to bottom when new lines are added
    useLayoutEffect(() => {
        if (_terminalBodyContainer.current && _terminalBody.current) {
            _terminalBodyContainer.current.scrollTop = _terminalBody.current.scrollHeight;
        }
    }, [state.previousLines]);

    // Setup event listeners
    useEffect(() => {
        _terminalBodyContainer.current = document.querySelector('.terminal-body-container');
        _terminalBody.current = document.querySelector('.terminal-body-container');

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div className="App">
            <div className="container">
                <div
                    ref={terminalRef}
                    className="terminal"
                    onClick={handleMouseInteraction}
                    onMouseDown={handleMouseInteraction}
                    onTouchEnd={handleMouseInteraction}
                    onContextMenu={e => e.preventDefault()}
                >
                    <Toolbar settings={state.settings} pwd={pwdText()} onReset={resetTerminal} />
                    <div className="terminal-body-container">
                        <div className="terminal-body">
                            {renderPreviousLines()}
                            <Prompt
                                ref={_prompt}
                                username={state.settings.userName}
                                computerName={state.settings.computerName}
                                currentPath={pwdText()}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
