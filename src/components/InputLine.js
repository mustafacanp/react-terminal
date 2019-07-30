import React, { Component } from 'react';

class Line extends Component {
  constructor(props) {
    super();
    this.settings = props.settings;
    this.pwd = props.pwd;
    this.pwd = props.pwd;
    this.pwd = props.pwd;
    this.pwd = props.pwd;
  }

  render() {
    return (
      <div className="terminal-prompt">
        <span className="prompt-user">
          {this.settings.user_name}@{this.settings.computer_name}:
        </span>
        <span className="prompt-location">{this.pwd}</span>
        <span className="prompt-dollar">$</span>
        <input
          className="prompt-input"
          value={this.prompt_text}
          onChange={this.handleInputChange}
          onKeyDown={this.handleKeyPress}
        />
        <span className="prompt-text">{this.prompt_text}</span>
        <span className="prompt-cursor">{this.cursor_letter}</span>
      </div>
    );
  }
}

export default Line;
