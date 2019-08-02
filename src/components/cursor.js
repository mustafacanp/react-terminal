import React, { Component } from 'react';
import PropTypes from "prop-types";

class Cursor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      style: {},
      cursorLetter: "",
      cursorFromTheRight: 0,
    };
    this.initialState = Object.assign({}, this.state);
    this.resetState = this.resetState.bind(this);
  }

  resetState() {
    this.setState(this.initialState);
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  componentWillUnmount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = e => {
    // Handles non-printable chars.
    switch (e.keyCode) {
      case 37:
        this.handleLeftArrow();
        break;
      case 39:
        this.handleRightArrow();
        break;
      case 46:
        this.handleRightArrow();
        break; // del
      default:
        break;
    }
  };

  moveCursor = () => {
    this.setState({
      style: {
        marginLeft: -8 * this.state.cursorFromTheRight + 'px'
      },
      cursorLetter: this.props.promptText[
        this.props.promptText.length - this.state.cursorFromTheRight
      ]
    }); // set letter to cursor
  };

  handleLeftArrow = () => {
    if (this.state.cursorFromTheRight < this.props.promptText.length)
      this.setState(
        { cursorFromTheRight: this.state.cursorFromTheRight + 1 },
        () => this.moveCursor()
      );
  };

  handleRightArrow = () => {
    if (this.state.cursorFromTheRight > 0)
      this.setState(
        { cursorFromTheRight: this.state.cursorFromTheRight - 1 },
        () => this.moveCursor()
      );
  };

  render() {
    if (this.props.promptText.length === 0 && this.state.cursorFromTheRight !== 0) this.resetState();
    return (
      <span style={this.state.style} className="prompt-cursor">{this.state.cursorLetter}</span>
    );
  }
}

Cursor.propTypes = {
  promptText: PropTypes.string.isRequired
}

export default Cursor;
