import React from 'react';
import PromptLabel from './PromptLabel';

const Line = ({ settings, command }) => {
	const { pwd, text, type, breakWord } = command;
	const wordBreakStyle = breakWord ? {} : { wordBreak: 'normal' };

	if (type === 'cin') {
		return (
			<div className="terminal-prompt">
				<PromptLabel
					username={settings.userName}
					computerName={settings.computerName}
					currentPath={pwd}
				/>
				<span className="prompt-text">{text}</span>
			</div>
		);
	} else {
		return (
			<div className="terminal-prompt">
				<span
					className="prompt-text ml-0"
					style={wordBreakStyle}
					dangerouslySetInnerHTML={{ __html: text }}
				/>
			</div>
		);
	}
};

export default Line;
