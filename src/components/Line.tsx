import React from 'react';
import PromptLabel from './PromptLabel';

interface Command {
	pwd?: string;
	text: string;
	type?: string;
	breakWord?: boolean;
}

interface Settings {
	userName: string;
	computerName: string;
}

interface LineProps {
	settings: Settings;
	command: Command;
}

const Line: React.FC<LineProps> = ({ settings, command }) => {
	const { pwd, text, type, breakWord } = command;
	const wordBreakStyle = breakWord ? {} : { wordBreak: 'normal' as const };

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
