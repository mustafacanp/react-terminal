import { useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Line, Toolbar, Prompt } from './components';
import { useTerminal } from './hooks/useTerminal';
import { copy } from './utils/utils';

const App = () => {
    const {
        state,
        _prompt,
        pwdText,
        handleTab,
        handleEnter,
        handleUpArrow,
        handleDownArrow
    } = useTerminal();

    const _terminalBodyContainer = useRef<HTMLElement | null>(null);
    const _terminalBody = useRef<HTMLElement | null>(null);

    // Auto-scroll to bottom when new lines are added
    useLayoutEffect(() => {
        if (_terminalBodyContainer.current && _terminalBody.current) {
            _terminalBodyContainer.current.scrollTop =
                _terminalBody.current.scrollHeight;
        }
    }, [state.previousLines]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.ctrlKey || e.altKey) {
                _prompt.current?.blurPrompt();
                e.preventDefault();
                return false;
            }

            switch (e.key) {
                case 'Tab':
                    handleTab(e);
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
        [handleTab, handleEnter, handleUpArrow, handleDownArrow]
    );

    const focusTerminalIfTouchDevice = useCallback((e: React.MouseEvent) => {
        if (e.buttons === 2) {
            // right click
            e.preventDefault();
            const selection = window.getSelection();
            if (selection && selection.toString() !== '') {
                copy(selection.toString());
                selection.empty();
            }
        } else if (e.type === 'click') {
            if ((window as any).isTouchDevice?.()) {
                _prompt.current?.focusPrompt();
            }
        }
    }, []);

    const renderPreviousLines = () => {
        return state.previousLines.map((previousCommand: any) => (
            <Line
                settings={state.settings}
                key={previousCommand.id}
                command={previousCommand}
            />
        ));
    };

    useEffect(() => {
        _terminalBodyContainer.current = document.querySelector(
            '.terminal-body-container'
        );
        _terminalBody.current = document.querySelector(
            '.terminal-body-container'
        );

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div className="App">
            <div className="container">
                <div
                    className="terminal"
                    onMouseDown={focusTerminalIfTouchDevice}
                    onContextMenu={e => e.preventDefault()}
                    onClick={focusTerminalIfTouchDevice}
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
