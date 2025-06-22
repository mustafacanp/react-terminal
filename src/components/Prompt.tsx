import React, {
    useState,
    useEffect,
    useRef,
    useImperativeHandle,
    forwardRef,
    useLayoutEffect
} from 'react';
import CursorWithText from './CursorWithText';
import PromptLabel from './PromptLabel';

interface PromptProps {
    username: string;
    computerName: string;
    currentPath?: string;
    value?: string;
    onChange?: (value: string) => void;
}

export interface PromptRef {
    content: string;
    clear: () => void;
    focusPrompt: () => void;
    blurPrompt: () => void;
    setValue: (value: string) => void;
    getSelectionStart: () => number | null | undefined;
    setCursorPosition: (position: number) => void;
    setValueWithCursor: (value: string, cursorPosition: number) => void;
}

const Prompt = forwardRef<PromptRef, PromptProps>(
    ({ username, computerName, currentPath, value, onChange }, ref) => {
        const [internalPromptText, setInternalPromptText] = useState('');
        const [pendingCursorPosition, setPendingCursorPosition] = useState<number | null>(null);
        const promptInputRef = useRef<HTMLInputElement>(null);

        // Use controlled value if provided, otherwise use internal state
        const promptText = value !== undefined ? value : internalPromptText;
        const setPromptText = onChange || setInternalPromptText;

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setPromptText(e.target.value);
        };

        const focusPrompt = () => {
            promptInputRef.current?.focus();
        };

        const blurPrompt = () => {
            promptInputRef.current?.blur();
        };

        const clear = () => {
            setPromptText('');
        };

        const setValue = (newValue: string) => {
            setPromptText(newValue);
        };

        const setValueWithCursor = (newValue: string, cursorPosition: number) => {
            setPromptText(newValue);
            setPendingCursorPosition(cursorPosition);
        };

        // Apply pending cursor position after render
        useLayoutEffect(() => {
            if (pendingCursorPosition !== null && promptInputRef.current) {
                promptInputRef.current.focus();
                promptInputRef.current.setSelectionRange(
                    pendingCursorPosition,
                    pendingCursorPosition
                );
                setPendingCursorPosition(null);
            }
        }, [pendingCursorPosition, promptText]);

        useImperativeHandle(ref, () => ({
            get content() {
                return promptText;
            },
            set content(newValue) {
                setPromptText(newValue);
            },
            clear,
            focusPrompt,
            blurPrompt,
            setValue,
            getSelectionStart: () => promptInputRef.current?.selectionStart,
            setCursorPosition: (position: number) => {
                if (promptInputRef.current) {
                    promptInputRef.current.focus();
                    requestAnimationFrame(() => {
                        if (promptInputRef.current) {
                            promptInputRef.current.setSelectionRange(position, position);
                        }
                    });
                }
            },
            setValueWithCursor
        }));

        useEffect(() => {
            focusPrompt();
        }, []);

        return (
            <div className="terminal-prompt">
                <PromptLabel
                    username={username}
                    computerName={computerName}
                    currentPath={currentPath || '~'}
                />
                <input
                    autoCorrect="off"
                    autoComplete="off"
                    autoCapitalize="off"
                    className="prompt-input"
                    ref={promptInputRef}
                    value={promptText}
                    onChange={handleInputChange}
                />
                <span className="prompt-text">
                    <CursorWithText promptText={promptText} />
                </span>
            </div>
        );
    }
);

export default Prompt;
