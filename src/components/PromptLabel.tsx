import React from 'react';

interface PromptLabelProps {
	username: string;
	computerName: string;
	currentPath: string;
}

const PromptLabel: React.FC<PromptLabelProps> = ({
	username,
	computerName,
	currentPath
}) => {
	return (
		<span>
			<span className="prompt-user">
				{username}@{computerName}:
			</span>
			<span className="prompt-location">{currentPath}</span>
			<span className="prompt-dollar">$</span>
		</span>
	);
};

export default PromptLabel;
