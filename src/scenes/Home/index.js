import React, { Component } from "react";
import "./Home.css";
import Line from "../../components/Line";
import Toolbar from "../../components/Toolbar";
import fs from "../../fs.json"
import { FSEntry } from "../../enums";
import { Cursor } from "../../components";

class App extends Component {
  constructor() {
    super();

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this._promptInput = this._terminal_body = this._terminal_body_container = undefined;

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
      cursor_from_the_right: 0,
      cursor_letter: '',
      previousLines: [],
      previousCommands: [],
      current_line_from_last: 0,
      tab_pressed: false
    };
  }

  commands = {
    sudo: () => {
      const input = this.removeSpaces(this.state.prompt_text);
      const input_without_sudo = input.substr(input.indexOf(' ') + 1);

      const is_it_command = this.isItCommand(input_without_sudo);
      const command = this.clearCommandName(input_without_sudo);

      const command_input = this.removeSpaces(input_without_sudo);
      if (is_it_command) this.commands[command](true, command_input);
      else if (input === '') this.cin();
      else this.createErrorLine();
    },
    help: async () => {
      const commands = await this.getUsableCommands();
      this.cout(['Usable Commands:', ...commands].join('&#09;'));
    },
    textgame: () => {
      this.openLink('http://textgamerpg.com');
    },
    randomcolor: () => {
      this.openLink('http://randomcolor.online');
    },
    clear: () => {
      this.setState({ previousLines: [] }, this.printCommandLine());
    },
    pwd: () => {
      const cwd = this.pwd_text().replace('~', '/' + this.state.base_path);
      this.cout(cwd);
    },
    ls: (sudo, input) => {
      if (this.checkSecondParameter(input, 'ls')) return;
      const dirs = Object.keys(this.state.cfs.children).map(key => {
        let slash = this.is_dir(this.state.cfs.children[key]) ? '/' : '';
        return `<span class="type-${
          this.state.cfs.children[key].type
        }">${key}${slash}</span>`;
      });
      this.cout(dirs.join('&#09;'), 'break-none');
    },
    cd: (sudo, input) => {
      if (input === 'cd' || input === 'cd ') {
        this.printCommandLine();
        return;
      }
      const secondParam = this.secondParameter(input).replace('/', '');

      if (this.checkThirdParameter(input, 'cd')) return;
      if (!secondParam || secondParam === '.') {
        this.printCommandLine();
        return;
      }

      if (secondParam === '..') {
        this.printCommandLine();
        if (this.state.path.length) {
          let temp_path = this.state.path;
          temp_path.pop();
          let temp_cfs = this.state.fs;
          temp_path.forEach(path => {
            temp_cfs = temp_cfs.children[path];
          });
          this.setState({ cfs: temp_cfs });
        }
        return;
      } else if (secondParam === '~') {
        this.printCommandLine();
        this.setState({ cfs: this.state.fs });
        this.setState({ path: [] });
        return;
      }

      const selected_file_or_dir = this.state.cfs.children[secondParam];
      if(this.is_dir(selected_file_or_dir)) {
        this.printCommandLine();
        this.setState(prevState => ({
          path: [...prevState.path, secondParam]
        }));
        this.setState({ cfs: selected_file_or_dir });
        return;
      } else if(this.is_file(selected_file_or_dir)) {
        this.cout(`bash: cd: ${secondParam}: Not a directory`); return;
      } else {
        this.cout(`bash: cd: ${secondParam}: No such file or directory`);
        return;
      }
    },
    cat: async (sudo, input) => {
      if (!this.secondParameter(input)) {
        this.cout('cat: missing operand');
        return;
      }
      const secondParam = this.secondParameter(input).replace('/', '');
      if (this.checkThirdParameter(input, 'cat')) return;

      const selected_file_or_dir = this.state.cfs.children[secondParam];
      if (this.is_file(selected_file_or_dir)) {
        const file = selected_file_or_dir;
        if (!file.sudo || sudo)
          this.cout(await fetch(file.src).then(res => res.text()));
        else this.cout(`bash: ${secondParam}: permission denied`);
        return;
      } else if (this.is_dir(selected_file_or_dir))
        this.cout(`cat: ${secondParam}: Is a directory`);
      else this.cout(`cat: ${secondParam}: No such file or directory`);
    },
    rm: (sudo, input) => {
      if (!this.secondParameter(input)) {
        this.cout('rm: missing operand');
        return;
      }
      const secondParam = this.secondParameter(input).replace('/', '');
      if (this.checkThirdParameter(input, 'rm')) return;

      const selected_file_or_dir = this.state.cfs.children[secondParam];
      if (this.is_file(selected_file_or_dir)) {
        const file = selected_file_or_dir;
        if (!file.sudo || sudo) {
          const new_fs = Object.keys(this.state.fs.children)
            .filter(key => key !== secondParam)
            .reduce((obj, key) => {
              obj[key] = this.state.fs.children[key];
              return obj;
            }, {});

          const new_cfs = Object.keys(this.state.cfs.children)
            .filter(key => key !== secondParam)
            .reduce((obj, key) => {
              obj[key] = this.state.cfs.children[key];
              return obj;
            }, {});

          this.setState({ fs: { type: 'directory', children: new_fs } });
          this.setState({ cfs: { type: 'directory', children: new_cfs } });
          this.cout();
        } else this.cout(`bash: ${secondParam}: permission denied`);
        return;
      } else if (this.is_dir(selected_file_or_dir))
        this.cout(`rm: cannot remove '${secondParam}': Is a directory`);
      else this.cout(`rm: ${secondParam}: No such file or directory`);
    }
  };

  openLink(link) {
    var win = window.open(link, '_blank');
    win.focus();
    this.printCommandLine();
  }

  async getUsableCommands() {
    const bashrc = await fetch('/files/bashrc.txt').then(res => res.text());
    const rows = bashrc.split('\n');

    let hiddenCommands = rows.map(row => {
      return row.substring(row.indexOf(' ') + 1, row.indexOf('='));
    });
    hiddenCommands.push('sudo');

    return Object.keys(this.commands).filter(
      cmd => hiddenCommands.indexOf(cmd) < 0
    );
  }

  isItCommand = input => {
    return !!Object.keys(this.commands).find(command_name => {
      if (input === command_name || input.startsWith(command_name + ' '))
        return true;
      else return false;
    });
  };

  clearCommandName = input =>
    Object.keys(this.commands).find(command_name => {
      if (input.startsWith(command_name + ' ')) return input.split(' ')[0];
      else if (input === command_name) return input;
      else return undefined;
    });

  createNewCommand = (type, text, breakWord) => {
    return {
      type,
      id: this.state.previousLines.length + 1,
      pwd: this.pwd_text(),
      text: this.trim(text),
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

  cout = (text = '', breakWord) => {
    const new_command = this.createNewCommand('cout', text, breakWord);
    new_command.id = this.state.previousLines.length + 2;
    const cout_text = new_command;

    const input = this.removeSpaces(this.state.prompt_text);

    this.cin(input, breakWord);

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

  printCommandLine = () => this.cin(this.state.prompt_text);
  handleInputChange = e => this.setState({ prompt_text: e.target.value });
  createErrorLine = () =>
    this.cout(
      this.firstParameter(this.state.prompt_text) + ': command not found'
    );
  pwd_text = () =>
    '~' +
    (this.state.path.join('/') === this.state.base_path
      ? ''
      : '/' + this.state.path.join('/'));

  firstParameter = str => this.trim(str).split(' ')[0];
  secondParameter = str =>
    this.trim(str).split(' ') ? this.trim(str).split(' ')[1] : false;
  thirthParameter = str =>
    this.trim(str).split(' ') ? this.trim(str).split(' ').length > 2 : false;

  /** START HANDLE KEYS */

  handleKeyDown = e => {
    // Handles non-printable chars.
    if (e.ctrlKey || e.altKey) {
      this._promptInput.blur();
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

    const input = this.state.prompt_text;
    const input_without_sudo = input.replace('sudo ', '');
    const sudo_string = input.startsWith('sudo ') ? 'sudo ' : '';

    const param1 = this.firstParameter(input_without_sudo);
    const param2 = this.secondParameter(input_without_sudo);

    if ((param1 === 'cd' || param1 === 'cat' || param1 === 'rm') && param2) {
      const children = Object.keys(this.state.cfs.children);
      const existed_things = children.filter(dir => dir.startsWith(param2));

      if (existed_things.length > 1) this.setState({ tab_pressed: true });

      if (existed_things.length === 1) {
        let slash = this.is_dir(this.state.cfs.children[existed_things[0]])
          ? '/'
          : '';
        this.setState({
          prompt_text: `${sudo_string + param1} ${existed_things[0]}${slash}`
        });
        return;
      }

      if (this.state.tab_pressed) {
        this.cout(existed_things.join('&#09;'), 'break-none');
        this.setState({ prompt_text: input });
        return;
      }
    }
  };

  handleEnter = () => {
    this.setState({ tab_pressed: false });
    this.setState({ current_line_from_last: 0 });

    const input = this.removeSpaces(this.state.prompt_text);
    const is_it_command = this.isItCommand(input);
    const command = this.clearCommandName(input);

    const command_input = this.removeSpaces(input);
    if (is_it_command) this.commands[command](false, command_input);
    else if (input === '') this.cin();
    else this.createErrorLine();

    this.updatePreviousCommands(input);
  };

  handleUpArrow = e => {
    e.preventDefault();
    if (this.state.current_line_from_last < this.state.previousCommands.length)
      this.setState(
        { current_line_from_last: this.state.current_line_from_last + 1 },
        () =>
          this.setState(
            {
              prompt_text: this.state.previousCommands[
                this.state.previousCommands.length -
                  this.state.current_line_from_last
              ]
            },
            () => this.focusTerminal()
          )
      );
  };

  handleDownArrow = () => {
    if (this.state.current_line_from_last > 1)
      this.setState(
        { current_line_from_last: this.state.current_line_from_last - 1 },
        () =>
          this.setState(
            {
              prompt_text: this.state.previousCommands[
                this.state.previousCommands.length -
                  this.state.current_line_from_last
              ]
            },
            () => this.focusTerminal()
          )
      );
  };

  /** END HANDLE KEYS */

  /** DOM ACTIONS */

  componentDidMount() {
    this._promptInput = document.querySelector('.prompt-input');
    this._terminal_body_container = document.querySelector(
      '.terminal-body-container'
    );
    this._terminal_body = document.querySelector('.terminal-body-container');

    this.focusTerminal();
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  componentWillUnmount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  focusTerminal() {
    this._promptInput.focus();
    this._terminal_body_container.scrollTop = this._terminal_body.scrollHeight;
  }

  copy = (text) => {
    let fallback = () => {
      try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
      }
    }
    if (!navigator.clipboard) {
      fallback();
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      console.log('Async: Copying to clipboard was successful!');
    }, err => {
      console.error('Async: Could not copy text: ', err);
    });

  }

  focusTerminalIfTouchDevice = (e) => {
    if (e.buttons === 2) { // right click
      e.preventDefault();
      if (window.getSelection().toString() !== "") {
        this.copy(window.getSelection().toString());
        window.getSelection().empty();
      }
    } else if (e.type === "click") {
      if(window.isTouchDevice()) {
        this.focusTerminal();
      }
    }
  }

  renderPreviousLines = () =>
    this.state.previousLines.map(previousCommand => (
      <Line
        settings={this.state.settings}
        key={previousCommand.id}
        command={previousCommand}
      />
    ));

  renderCoutResponse = content => (
    <div className="terminal-prompt">{content}</div>
  );

  /** DOM ACTIONS */

  render = () => {
    return (
      <div className="App">
        <div className="container">
          <div className="terminal" onMouseDown={e => this.focusTerminalIfTouchDevice(e)} onContextMenu={e => e.preventDefault()} onClick={e => this.focusTerminalIfTouchDevice(e)}>
            <Toolbar settings={this.state.settings} pwd={this.pwd_text()}></Toolbar>
            <div className="terminal-body-container">
              <div className="terminal-body">
                {this.renderPreviousLines()}
                <div className="terminal-prompt">
                  <span className="prompt-user">
                    {this.state.settings.user_name}@
                    {this.state.settings.computer_name}:
                  </span>
                  <span className="prompt-location">{this.pwd_text()}</span>
                  <span className="prompt-dollar">$</span>
                  <input
                    className="prompt-input"
                    value={this.state.prompt_text}
                    onChange={this.handleInputChange}
                  />
                  <span className="prompt-text">{this.state.prompt_text}</span>
                  <Cursor promptText={this.state.prompt_text} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
}

export default App;
