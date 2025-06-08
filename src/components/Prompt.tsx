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
}

export interface PromptRef {
	content: string;
	clear: () => void;
	focusPrompt: () => void;
	blurPrompt: () => void;
}

const Prompt = forwardRef<PromptRef, PromptProps>(
	({ username, computerName, currentPath }, ref) => {
		const [promptText, setPromptText] = useState('');
		const promptInputRef = useRef<HTMLInputElement>(null);

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

		useImperativeHandle(ref, () => ({
			get content() {
				return promptText;
			},
			set content(value) {
				setPromptText(value);
			},
			clear,
			focusPrompt,
			blurPrompt
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
