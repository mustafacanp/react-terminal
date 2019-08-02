import React, { Component } from 'react';
import Cursor from "./cursor";
import PropTypes from "prop-types";

class Prompt extends Component {

  constructor(props) {
    super(props);
    this.state = {
      promptText: ""
    }
    this.handleInputChange = this.handleInputChange.bind(this);
    this.focusPrompt = this.focusPrompt.bind(this);
    this.blurPrompt = this.blurPrompt.bind(this);
    this._promptInput = React.createRef();
  }

  get content() {
    return this.state.promptText;
  }

  set content(value) {
    this.setState({ promptText: value });
  }

  clear() {
    this.setState({ promptText: "" });
  }

  componentDidMount() {
    this.focusPrompt();
  }

  handleInputChange(e) {
    this.setState({ promptText: e.target.value });
  }

  focusPrompt() {
    this._promptInput.current.focus();
  }

  blurPrompt() {
    this._promptInput.current.blur();
  }

  render() {
    let { username, computerName, currentPath } = this.props;
    return (
      <div className="terminal-prompt">
        <span className="prompt-user">
          {username}@{computerName}:
        </span>
        <span className="prompt-location">{currentPath}</span>
        <span className="prompt-dollar">$</span>
        <input
          className="prompt-input"
          ref={this._promptInput}
          value={this.state.promptText}
          onChange={this.handleInputChange}
        />
        <span className="prompt-text">{this.state.promptText}</span>
        <Cursor promptText={this.state.promptText} />
      </div>
    );
  }
}

Prompt.propTypes = {
  username: PropTypes.string.isRequired,
  computerName: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
}

export default Prompt;
