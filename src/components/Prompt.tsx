import React, {
    useState,
    useEffect,
    useRef,
    useImperativeHandle,
    forwardRef
} from 'react';
import Cursor from './Cursor';
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
}

const Prompt = forwardRef<PromptRef, PromptProps>(
    ({ username, computerName, currentPath, value, onChange }, ref) => {
        const [internalPromptText, setInternalPromptText] = useState('');
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
            setValue
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
                    className="prompt-input"
                    ref={promptInputRef}
                    value={promptText}
                    onChange={handleInputChange}
                />
                <span className="prompt-text">{promptText}</span>
                <Cursor promptText={promptText} />
            </div>
        );
    }
);

export default Prompt;
