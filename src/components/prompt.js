import React, { Component } from 'react';
import PropTypes from "prop-types";

class Prompt extends Component {
  render() {
    let { username, computerName, currentPath } = this.props;
    return (
      <span>
        <span className="prompt-user">
          {username}@{computerName}:
        </span>
        <span className="prompt-location">{currentPath}</span>
        <span className="prompt-dollar">$</span>
      </span>
    );
  }
}

Prompt.propTypes = {
  username: PropTypes.string.isRequired,
  computerName: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired
}

export default Prompt;
