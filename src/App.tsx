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
    saveFileSystemToStorage
} from './utils/utils';
import { createCommands, executeCommand } from './utils/commands';
import { handleTab, TabCompletionContext } from './utils/tabCompletion';
import initialFsJson from './fs.json';

const App: React.FC = () => {
    const [state, setState] = useState<AppState>({
        settings: {
            computerName: 'ubuntu',
            userName: 'root'
        },
        fs: initialFsJson as FileSystemEntry,
        cfs: initialFsJson as FileSystemEntry,
        path: [],
        basePath: 'home/user',
        promptText: '',
        previousLines: [],
        previousCommands: [],
        currentLineFromLast: 0,
        tabPressed: false
    });

    // Initialize file system from localStorage on component mount
    useEffect(() => {
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

        initializeFileSystem();
    }, []);

    const _prompt = useRef<PromptRef>(null);
    const commandIdCounter = useRef(0);
    const _terminalBodyContainer = useRef<HTMLElement | null>(null);
    const _terminalBody = useRef<HTMLElement | null>(null);

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
        setState(prev => ({
            ...prev,
            previousCommands: [...prev.previousCommands, command]
        }));
    }, []);

    const handleCommandExecution = useCallback(
        (input: string) => {
            executeCommand(input, commands, io, addToHistory);
        },
        [commands, io, addToHistory]
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
                setState(prev => ({
                    ...prev,
                    currentLineFromLast: result.newLineFromLast
                }));
                _prompt.current?.setValue(result.command);
            }
        },
        [state.previousCommands, state.currentLineFromLast]
    );

    const handleDownArrow = useCallback(() => {
        const result = getCommandFromHistory(
            state.previousCommands,
            state.currentLineFromLast,
            'down'
        );
        if (result) {
            setState(prev => ({
                ...prev,
                currentLineFromLast: result.newLineFromLast
            }));
            _prompt.current?.setValue(result.command);
        }
    }, [state.previousCommands, state.currentLineFromLast]);

    const handleEnter = useCallback(() => {
        setState(prev => ({
            ...prev,
            tabPressed: false,
            currentLineFromLast: 0
        }));

        const input = removeSpaces(getPromptContent());
        handleCommandExecution(input);
        _prompt.current?.clear();
    }, [getPromptContent, handleCommandExecution]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Handle Ctrl+C for copying selected text
            if (e.ctrlKey && e.key === 'c') {
                const selection = window.getSelection();
                if (selection && selection.toString() !== '') {
                    copy(selection.toString());
                    e.preventDefault();
                    return false;
                }
            }

            if (e.ctrlKey || e.altKey) {
                _prompt.current?.blurPrompt();
                e.preventDefault();
                return false;
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

    const handleMouseInteraction = useCallback(async (e: React.MouseEvent) => {
        e.preventDefault();

        if (e.buttons === 2) {
            // right click - paste
            try {
                if (navigator.clipboard) {
                    const clipboardText = await navigator.clipboard.readText();
                    if (clipboardText) {
                        const currentContent = _prompt.current?.content || '';
                        _prompt.current?.setValue(currentContent + clipboardText);
                    }
                }
            } catch (err) {
                console.warn('Could not read from clipboard:', err);
            }

            if (e.type === 'click') {
                if ((window as any).isTouchDevice?.()) {
                    _prompt.current?.focusPrompt();
                }
            }
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
                    className="terminal"
                    onMouseDown={handleMouseInteraction}
                    onContextMenu={handleMouseInteraction}
                    onClick={handleMouseInteraction}
                >
                    <Toolbar settings={state.settings} pwd={pwdText()} />
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
