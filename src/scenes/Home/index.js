import React, { Component } from 'react';
import './Home.css';
import Line from '../../components/Line';
import Toolbar from '../../components/Toolbar';
import fs from '../../fs.json';
import { FSEntry } from '../../enums';
import { Prompt } from '../../components';
import { createTerminalCommands } from '../../commands/terminalCommands';

class App extends Component {
  constructor() {
    super();

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this._terminal_body = this._terminal_body_container = undefined;
    this._prompt = React.createRef();
    this.state = {
      settings: {
        computer_name: 'ubuntu',
        user_name: 'root'
      },
      fs: fs,
      cfs: fs,
      path: [],
      base_path: 'home/user',
      prompt_text: '',
      previousLines: [],
      previousCommands: [],
      current_line_from_last: 0,
      tab_pressed: false
    };

    // Initialize commands - will be created dynamically to access current state
    this.commands = null;
  }

  getCommands() {
    if (!this.commands) {
      this.commands = createTerminalCommands({
        getState: () => this.state,
        setState: this.setState.bind(this),
        removeSpaces: this.removeSpaces,
        _prompt: this._prompt,
        isItCommand: this.isItCommand,
        extractCommandName: this.extractCommandName,
        cin: this.cin,
        createErrorLine: this.createErrorLine,
        getUsableCommands: this.getUsableCommands.bind(this),
        cout: this.cout,
        openLink: this.openLink.bind(this),
        printCommandLine: this.printCommandLine,
        pwd_text: this.pwd_text,
        checkSecondParameter: this.checkSecondParameter,
        is_dir: this.is_dir,
        is_file: this.is_file,
        checkThirdParameter: this.checkThirdParameter,
        secondParameter: this.secondParameter,
        getCommands: this.getCommands.bind(this)
      });
    }
    return this.commands;
  }

  openLink(link) {
    var win = window.open(link, '_blank');
    win.focus();
    this.printCommandLine();
  }

  async getUsableCommands() {
    const bashrc = await fetch('/files/bashrc.txt').then(res => res.text());
    const rows = bashrc.split('\n');

    const hiddenCommands = rows.map(row => {
      return row.substring(row.indexOf(' ') + 1, row.indexOf('='));
    });
    hiddenCommands.push('sudo');

    return Object.keys(this.getCommands()).filter(
      cmd => hiddenCommands.indexOf(cmd) < 0
    );
  }

  isItCommand = input => {
    return !!Object.keys(this.getCommands()).find(command_name => {
      if (input === command_name || input.startsWith(command_name + ' '))
        return true;
      else return false;
    });
  };

  extractCommandName = input =>
    Object.keys(this.getCommands()).find(command_name => {
      if (input.startsWith(command_name + ' ')) return input.split(' ')[0];
      else if (input === command_name) return input;
      else return undefined;
    });

  createNewCommand = (type, text, breakWord, noTrim) => {
    return {
      type,
      id: this.state.previousLines.length + 1,
      pwd: this.pwd_text(),
      text: noTrim ? text : this.trim(text),
      breakWord: breakWord ? false : true
    };
  };

  cin = (text = '', breakWord) => {
    const cin_text = this.createNewCommand('cin', text, breakWord);

    this.setState(prevState => ({
      previousLines: [...prevState.previousLines, cin_text]
    }));

    this.setState({ prompt_text: '' }, () => this.focusTerminal());
  };

  cout = (text = '', breakWord, input, noTrim) => {
    const new_command = this.createNewCommand('cout', text, breakWord, noTrim);
    new_command.id = this.state.previousLines.length + 2;
    const cout_text = new_command;

    const inputTrimmed = this.removeSpaces(this._prompt.current.content || input);
    this.cin(inputTrimmed, breakWord);

    this.setState(
      prevState => ({
        previousLines: [...prevState.previousLines, cout_text]
      }),
      () => this.focusTerminal()
    );

    this.setState({ prompt_text: '' }, () => this.focusTerminal());
  };

  updatePreviousCommands = command_text => {
    if (command_text !== '')
      this.setState(prevState => ({
        previousCommands: [...prevState.previousCommands, command_text]
      }));
  };

  checkSecondParameter = (text, command_name) => {
    if (this.secondParameter(text)) {
      this.cout(`bash: ${command_name}: too many arguments`);
      return true;
    }
    return false;
  };
  checkThirdParameter = (text, command_name) => {
    if (this.thirthParameter(text)) {
      this.cout(`bash: ${command_name}: too many arguments`);
      return true;
    }
    return false;
  };

  trim = str => str.trimStart().trimEnd();
  removeSpaces = text => text.replace(/\s+/g, ' ').trim();

  is_dir = obj => !!(obj && FSEntry.parse(obj.type) === FSEntry.DIRECTORY);
  is_file = obj => !!(obj && FSEntry.parse(obj.type) === FSEntry.FILE);

  printCommandLine = () => this.cin(this._prompt.current.content);
  createErrorLine = () =>
    this.cout(
      this.firstParameter(this._prompt.current.content) + ': command not found'
    );
  pwd_text = () =>
    '~' +
    (this.state.path.join('/') === this.state.base_path
      ? ''
      : '/' + this.state.path.join('/'));

  firstParameter = str => this.trim(str).split(' ')[0];
  secondParameter = str => this.trim(str).split(' ')[1] || '';
  thirthParameter = str => this.trim(str).split(' ').length > 2 || '';

  /** START HANDLE KEYS */

  handleKeyDown = e => {
    // Handles non-printable chars.
    if (e.ctrlKey || e.altKey) {
      this._prompt.current.blurPrompt();
      e.preventDefault();
      e.returnValue = false;
      return false;
    } else {
      this.focusTerminal();
    }

    switch (e.keyCode) {
      case 9:
        this.handleTab(e);
        break; // tab
      case 13:
        this.handleEnter();
        break; // enter
      case 38:
        this.handleUpArrow(e);
        break; // up
      case 40:
        this.handleDownArrow();
        break; // down
      default:
        break;
    }
  };

  handleTab = e => {
    e.preventDefault();

    const input = this._prompt.current.content;
    const inputWithoutSudo = input.replace('sudo ', '');
    const sudoString = input.startsWith('sudo ') ? 'sudo ' : '';

    const command = this.firstParameter(inputWithoutSudo);
    const param2 = this.secondParameter(inputWithoutSudo);

    if (!['cd', 'cat', 'rm'].includes(command)) {
      return;
    }

    // Navigate to the target directory for nested paths
    let targetFS = this.state.cfs;
    let searchTerm = param2;
    
    if (param2.includes('/')) {
      const pathParts = param2.split('/');
      searchTerm = pathParts.pop(); // Get the last part to search for
      const directoryPath = pathParts.filter(part => part !== '');
      
      // Navigate through the directory structure
      for (const dirName of directoryPath) {
        if (targetFS.children && targetFS.children[dirName] && this.is_dir(targetFS.children[dirName])) {
          targetFS = targetFS.children[dirName];
        } else {
          // Path doesn't exist, no completions available
          return;
        }
      }
    }

    const children = Object.keys(targetFS.children || {});
    const matchingItems = children.filter(dir =>
      dir.toLowerCase().startsWith(searchTerm.toLowerCase())
    );

    this.handleTabCompletion(input, command, param2, targetFS.children, matchingItems, sudoString);
  };

  getLastDir = (path) => {
    const parts = path.split('/').filter(Boolean);
    return path.endsWith('/') ? parts[parts.length - 1] : parts[parts.length - 2];
  }

  handleTabCompletion = (originalInput, command, targetPath, childrenFS, matchingItems, sudoPrefix) => {
    if (targetPath.includes('/')) {

      const selectedDir = this.getLastDir(targetPath);
      const dir = childrenFS[selectedDir];
      console.log({selectedDir, dir, originalInput, command, targetPath, childrenFS, matchingItems, sudoPrefix});
      if (this.is_dir(dir)) {
        console.log(dir.children);

        const newTargetPath = targetPath.split("/").pop().toLowerCase();
        const children = Object.keys(dir.children);
        const newMatchingItems = children.filter(dir =>
          dir.toLowerCase().startsWith(newTargetPath.toLowerCase())
        );
        this.handleTabCompletion(originalInput, command, newTargetPath, dir.children, newMatchingItems, sudoPrefix);
        return;
      }
    }

    if (targetPath === '') {
      this.cout(matchingItems.join('&#09;'), 'break-none');
      this.setState({ prompt_text: originalInput });
      return;
    }

    if (matchingItems.length === 1) {
      const inputWithoutSudo = originalInput.replace('sudo ', '');
      const param2 = this.secondParameter(inputWithoutSudo);
      const parentFolders = param2.substring(0, param2.lastIndexOf('/') + 1);
      const dirSlash = this.is_dir(childrenFS[matchingItems[0]])
        ? '/'
        : '';

      this._prompt.current.content = `${sudoPrefix + command} ${
        parentFolders}${
        matchingItems[0]}${
        dirSlash}`;
      return;
    }

    if (matchingItems.length > 1) {
      this.setState({ tab_pressed: true });
      this.cout(matchingItems.join('&#09;'), 'break-none');
      this.setState({ prompt_text: originalInput });
    } 
  }

  handleEnter = () => {
    this.setState({ tab_pressed: false });
    this.setState({ current_line_from_last: 0 });

    const input = this.removeSpaces(this._prompt.current.content);
    const is_it_command = this.isItCommand(input);
    const command = this.extractCommandName(input);

    const command_input = this.removeSpaces(input);
    if (is_it_command) this.getCommands()[command](false, command_input);
    else if (input === '') this.cin();
    else this.createErrorLine();

    this.updatePreviousCommands(input);
    this._prompt.current.clear();
  };

  handleUpArrow = e => {
    e.preventDefault();
    if (this.state.current_line_from_last < this.state.previousCommands.length)
      this.setState(
        { current_line_from_last: this.state.current_line_from_last + 1 },
        () =>
          (this._prompt.current.content = this.state.previousCommands[
              this.state.previousCommands.length -
                this.state.current_line_from_last
          ]),
        () => this.focusTerminal()
      );
  };

  handleDownArrow = () => {
    if (this.state.current_line_from_last > 1)
      this.setState(
        { current_line_from_last: this.state.current_line_from_last - 1 },
        () =>
          (this._prompt.current.content = this.state.previousCommands[
              this.state.previousCommands.length -
                this.state.current_line_from_last
          ]),
        () => this.focusTerminal()
      );
  };

  /** END HANDLE KEYS */

  /** DOM ACTIONS */

  componentDidMount() {
    this._terminal_body_container = document.querySelector(
      '.terminal-body-container'
    );
    this._terminal_body = document.querySelector('.terminal-body-container');

    // this.focusTerminal();
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  focusTerminal() {
    this._prompt.current.focusPrompt();
    this._terminal_body_container.scrollTop = this._terminal_body.scrollHeight;
  }

  copy = text => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => {
          console.log('Copying to clipboard was successful!');
        },
        err => {
          console.error('Could not copy text: ', err);
        }
      );
    } else {
      console.warn('Clipboard API not available');
    }
  };

  focusTerminalIfTouchDevice = e => {
    if (e.buttons === 2) {
      // right click
      e.preventDefault();
      if (window.getSelection().toString() !== '') {
        this.copy(window.getSelection().toString());
        window.getSelection().empty();
      }
    } else if (e.type === 'click') {
      if (window.isTouchDevice()) {
        this.focusTerminal();
      }
    }
  };

    renderPreviousLines = () =>
    this.state.previousLines.map(previousCommand => (
      <Line
        settings={this.state.settings}
        key={previousCommand.id}
        command={previousCommand}
      />
    ));

  /** DOM ACTIONS */

  render = () => {
    return (
      <div className="App">
        <div className="container">
          <div
            className="terminal"
            onMouseDown={e => this.focusTerminalIfTouchDevice(e)}
            onContextMenu={e => e.preventDefault()}
            onClick={e => this.focusTerminalIfTouchDevice(e)}
          >
            <Toolbar
              settings={this.state.settings}
              pwd={this.pwd_text()}
            ></Toolbar>
            <div className="terminal-body-container">
              <div className="terminal-body">
                {this.renderPreviousLines()}
                <Prompt
                  ref={this._prompt}
                  username={this.state.settings.user_name}
                  computerName={this.state.settings.computer_name}
                  currentPath={this.pwd_text()}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
}

export default App;
