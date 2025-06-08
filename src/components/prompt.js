import React, {
	useState,
	useEffect,
	useRef,
	useImperativeHandle,
	forwardRef
} from 'react';
import Cursor from './Cursor';
import PromptLabel from './PromptLabel';

const Prompt = forwardRef(({ username, computerName, currentPath }, ref) => {
	const [promptText, setPromptText] = useState('');
	const promptInputRef = useRef();

	const handleInputChange = e => {
		setPromptText(e.target.value);
	};

	const focusPrompt = () => {
		promptInputRef.current.focus();
	};

	const blurPrompt = () => {
		promptInputRef.current.blur();
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
				currentPath={currentPath}
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
});

export default Prompt;
