import React, { Component } from 'react';
import PropTypes from 'prop-types';

class PromptLabel extends Component {
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

PromptLabel.propTypes = {
  username: PropTypes.string.isRequired,
  computerName: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired
};

export default PromptLabel;
