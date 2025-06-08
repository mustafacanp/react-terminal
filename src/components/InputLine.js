import React from 'react';

const InputLine = ({
	settings,
	pwd,
	promptText,
	cursorLetter,
	handleInputChange,
	handleKeyPress
}) => {
	return (
		<div className="terminal-prompt">
			<span className="prompt-user">
				{settings.userName}@{settings.computerName}:
			</span>
			<span className="prompt-location">{pwd}</span>
			<span className="prompt-dollar">$</span>
			<input
				className="prompt-input"
				value={promptText}
				onChange={handleInputChange}
				onKeyDown={handleKeyPress}
			/>
			<span className="prompt-text">{promptText}</span>
			<span className="prompt-cursor">{cursorLetter}</span>
		</div>
	);
};

export default InputLine;
