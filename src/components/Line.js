import React, { Component } from 'react';
import PromptLabel from './promptLabel';

class Line extends Component {
	constructor(props) {
		super();
		this.settings = props.settings;
		this.pwd = props.command.pwd;
		this.text = props.command.text;
		this.type = props.command.type;
		this.breakWord = props.command.breakWord;
		this.wordBreakStyle = {};

		if (!this.breakWord) this.wordBreakStyle = { wordBreak: 'normal' };
	}

	render() {
		if (this.type === 'cin') {
			return (
				<div className="terminal-prompt">
					<PromptLabel
						username={this.settings.user_name}
						computerName={this.settings.computer_name}
						currentPath={this.pwd}
					/>
					<span className="prompt-text">{this.text}</span>
				</div>
			);
		} else {
			return (
				<div className="terminal-prompt">
					<span
						className="prompt-text ml-0"
						style={this.wordBreakStyle}
						dangerouslySetInnerHTML={{ __html: this.text }}
					/>
				</div>
			);
		}
	}
}

export default Line;
