import React, { Component } from "react";
import "./Home.css";
import Line from "../../components/Line";
import Toolbar from "../../components/Toolbar";
import fs from "../../fs.json"

class App extends Component {

  constructor() {
    super();
    
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this._promptInput = this._cursor = this._terminal_body = this._terminal_body_container = undefined;

    this.state = {
      settings: {
        computer_name: "ubuntu",
        user_name: "root",
      },
      fs: fs,
      cfs: fs,
      path: [],
      base_path: "home/user",
      prompt_text: "",
      cursor_from_the_right: 0,
      cursor_letter: "",
      previousLines: [],
      previousCommands: [],
      current_line_from_last: 0,
      tab_pressed: false
    }
  }

  commands = {
    sudo: () => {
      console.log("sudo");
    },
    help: () => this.cout((["Usable Commands:", ...Object.keys(this.commands)]).join("&#09;")),
    ls: () => {
      const input = this.removeSpaces(this.state.prompt_text);
      if(this.checkSecondParameter(input, "ls")) return;
      const folders = Object.keys(this.state.cfs.children).map(key => {
        let slash = this.is_dir(this.state.cfs.children[key]) ? "/" : "";
        return `<span class="type-${this.state.cfs.children[key].type}">${key}${slash}</span>`
      });
      this.cout(folders.join("&#09;"), "break-none");
    },
    cd: () => {
      const input = this.removeSpaces(this.state.prompt_text);
      if(input === "cd" || input === "cd ") { this.printCommandLine(); return; }
      const secondParam = this.secondParameter(input).replace("/", "");

      if(this.checkThirdParameter(input, "cd")) return;
      if(!secondParam || secondParam === ".") { this.printCommandLine(); return; }

      if(secondParam === "..") {
        this.printCommandLine();
        if(this.state.path.length){
          let temp_path = this.state.path;
          temp_path.pop();

          let temp_cfs = this.state.fs;
          temp_path.forEach(path => {
            temp_cfs = temp_cfs.children[path];
          });

          this.setState({ cfs: temp_cfs });
        }
        return;
      } else if (secondParam === "~") {
        this.printCommandLine();
        this.setState({ cfs: this.state.fs });
        this.setState({ path: [] });
        return;
      }

      if(this.is_dir(this.state.cfs.children[secondParam])) {
        this.setState(prevState => ({
          path: [...prevState.path, secondParam]
        }));
        this.setState({ cfs: this.state.cfs.children[secondParam] });
      } else if(this.is_file(this.state.cfs.children[secondParam])) {
        this.cout(`bash: cd: ${secondParam}: Not a directory`); return;
      } else {
        this.cout(`bash: cd: ${secondParam}: No such file or directory`); return;
      }
      this.printCommandLine();
    },
    pwd: () => {
      const cwd = this.pwd_text().replace("~", "/" + this.state.base_path);
      this.cout(cwd);
    },
    clear: () => {
      this.setState({ previousLines: [] }, this.printCommandLine());
    },
    cat: async () => {
      const input = this.removeSpaces(this.state.prompt_text);

      if(!this.secondParameter(input)) { this.cout("cat: missing operand"); return }
      const secondParam = this.secondParameter(input).replace("/", "");
      if(this.checkThirdParameter(input, "cat")) return;

      if(this.is_file(this.state.cfs.children[secondParam])) {
        const file = this.state.cfs.children[secondParam];
        this.cout(await fetch(file.src).then(res => res.text()));
      } else if(this.is_dir(this.state.cfs.children[secondParam]))
        this.cout(`cat: ${secondParam}: Is a directory`);
      else
        this.cout(`cat: ${secondParam}: No such file or directory`);
    },
    rm: () => {
      const input = this.removeSpaces(this.state.prompt_text);

      if(!this.secondParameter(input)) { this.cout("rm: missing operand"); return }
      const secondParam = this.secondParameter(input).replace("/", "");
      if(this.checkThirdParameter(input, "rm")) return;

      if(this.is_file(this.state.cfs.children[secondParam])) {
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
        
        this.setState({ fs: { type: "directory", children: new_fs }});
        this.setState({ cfs: { type: "directory", children: new_cfs }});
        this.cout();
      } else if(this.is_dir(this.state.cfs.children[secondParam]))
        this.cout(`rm: cannot remove '${secondParam}': Is a directory`);
      else
        this.cout(`rm: ${secondParam}: No such file or directory`);
    }
  }


  createNewCommand = (type, text, breakWord) => {
    return {
      type,
      id: this.state.previousLines.length+1,
      pwd: this.pwd_text(),
      text: this.trim(text),
      breakWord: breakWord ? false : true
    };
  }

  cin = (text="", breakWord) => {
    const cin_text = this.createNewCommand("cin", text, breakWord);

    this.setState(prevState => ({
      previousLines: [...prevState.previousLines, cin_text]
    }));
  
    this.setState({prompt_text:""}, () => this.focusTerminal());
  }

  cout = (text="", breakWord) => {
    const new_command = this.createNewCommand("cout", text, breakWord);
    new_command.id = this.state.previousLines.length+2;
    const cout_text = new_command;

    const input = this.removeSpaces(this.state.prompt_text);

    this.cin(input, breakWord);

    this.setState(prevState => ({
      previousLines: [...prevState.previousLines, cout_text]
    }), () => this.focusTerminal());

    this.setState({prompt_text:""}, () => this.focusTerminal());
  }

  updatePreviousCommands = (command_text) => {
    if(command_text !== ""){
      this.setState(prevState => ({
        previousCommands: [...prevState.previousCommands, command_text]
      }));
    }
  }

  checkSecondParameter = (text, command_name) => {
    if(this.secondParameter(text)){
      this.cout(`bash: ${command_name}: too many arguments`);
      return true;
    }
    return false;
  }
  checkThirdParameter = (text, command_name) => {
    if(this.thirthParameter(text)){
      this.cout(`bash: ${command_name}: too many arguments`);
      return true;
    }
    return false;
  }

  trim = str => str.trimStart().trimEnd();
  removeSpaces = text => text.replace(/\s+/g, " ").trim();

  is_dir = obj => !!(obj && obj.type === "directory");
  is_file = obj => !!(obj && obj.type === "file");

  printCommandLine = () => this.cin(this.state.prompt_text);
  handleInputChange = (e) => this.setState({ prompt_text:e.target.value });
  createErrorLine = () => this.cout(this.firstParameter(this.state.prompt_text)+": command not found");
  pwd_text = () =>  "~" + ((this.state.path.join("/") === this.state.base_path) ? "" : "/" + this.state.path.join("/"));

  firstParameter = str => this.trim(str).split(" ")[0];
  secondParameter = str => this.trim(str).split(" ") ? this.trim(str).split(" ")[1] : false;
  thirthParameter = str => this.trim(str).split(" ") ? this.trim(str).split(" ").length>2 : false;


  /** START HANDLE KEYS */

  handleKeyPress = (e) => {
    switch (e.keyCode) {
      case 9: this.handleTab(e); break; // tab
      case 13: this.handleEnter(); break; // enter
      case 37: this.handleLeftArrow(); break; // left
      case 39: this.handleRightArrow(); break; // right
      case 38: this.handleUpArrow(e); break; // up
      case 40: this.handleDownArrow(); break; // down
      case 46: this.handleRightArrow(); break; // del
      // case 16: return; // shift
      // case 17: return; // ctrl
      default: break;
    }
  }

  handleTab = (e) => {
    e.preventDefault();

    const input = this.state.prompt_text;

    const param1 = this.firstParameter(input);
    const param2 = this.secondParameter(input);

    if((param1 === "cd" || param1 === "cat" || param1 === "rm") && param2) {
      const children = Object.keys(this.state.cfs.children);
      const existed_things = children.filter(folder => folder.startsWith(param2));

      if(existed_things.length > 1) this.setState({ tab_pressed: true });

      if (existed_things.length === 1) {
        let slash = this.is_dir(this.state.cfs.children[existed_things[0]]) ? "/" : "";
        this.setState({ prompt_text: `${param1} ${existed_things[0]}${slash}` });
        return;
      }

      if(this.state.tab_pressed) {
        this.cout(existed_things.join("&#09;"), "break-none");
        this.setState({ prompt_text: input });
        return;
      }
    }
  }

  handleEnter = () => {
    this.setState({ tab_pressed: false });
    this.setState({ current_line_from_last: 0 });

    const input = this.removeSpaces(this.state.prompt_text);
    let is_it_command = false;
    let command = "";

    Object.keys(this.commands).map(command_name => {
      if(input === command_name) {
        is_it_command = true;
        command = input;
      } else if(input.startsWith(command_name+" ")) {
        is_it_command = true;
        command = input.split(" ")[0];
      }
      return undefined;
    });

    if(is_it_command) this.commands[command]();
    else if(input === "") this.cin();
    else this.createErrorLine();

    this.updatePreviousCommands(input);
  }

  handleLeftArrow = () => {
    if(this.state.cursor_from_the_right < this.state.prompt_text.length)
      this.setState({cursor_from_the_right:this.state.cursor_from_the_right+1}, ()=>this.moveCursor());
  }

  handleRightArrow = () => {
    if(this.state.cursor_from_the_right > 0)
      this.setState({cursor_from_the_right:this.state.cursor_from_the_right-1}, ()=>this.moveCursor());
  }

  handleUpArrow = (e) => {
    e.preventDefault();
    if(this.state.current_line_from_last < this.state.previousCommands.length)
      this.setState({current_line_from_last:this.state.current_line_from_last+1},
        () => this.setState({prompt_text: this.state.previousCommands[this.state.previousCommands.length - this.state.current_line_from_last]}, ()=>this.focusTerminal()));
  }

  handleDownArrow = () => {
    if(this.state.current_line_from_last > 1)
      this.setState({current_line_from_last:this.state.current_line_from_last-1},
        () => this.setState({prompt_text: this.state.previousCommands[this.state.previousCommands.length - this.state.current_line_from_last]}, ()=>this.focusTerminal()));
  }

  /** END HANDLE KEYS */
  

  /** DOM ACTIONS */

  componentDidMount() {
    this._promptInput = document.querySelector(".prompt-input");
    this._cursor = document.querySelector(".prompt-cursor");
    this._terminal_body_container = document.querySelector(".terminal-body-container");
    this._terminal_body = document.querySelector(".terminal-body-container");

    this.focusTerminal();
  }

  focusTerminal() {
    this._promptInput.focus();
    this._terminal_body_container.scrollTop = this._terminal_body.scrollHeight;
  }

  moveCursor = () => {
    this._cursor.style.marginLeft = -8*this.state.cursor_from_the_right+"px"; // move cursor
    this.setState({cursor_letter:this.state.prompt_text[this.state.prompt_text.length-this.state.cursor_from_the_right]}); // set letter to cursor
  }

  renderPreviousLines = () =>
    this.state.previousLines.map((previousCommand) =>
      <Line settings={this.state.settings} key={previousCommand.id} command={previousCommand}></Line>
    );

  renderCoutResponse = (content) => <div className="terminal-prompt">{content}</div>

  /** DOM ACTIONS */

  render() {
    return(
      <div className="App" onClick={()=>this.focusTerminal()}>
        <div className="container">
          <div className="terminal">
            <Toolbar settings={this.state.settings} pwd={this.pwd_text()}></Toolbar>
            <div className="terminal-body-container">
              <div className="terminal-body">
                {this.renderPreviousLines()}
                <div className="terminal-prompt">
                  <span className="prompt-user">{this.state.settings.user_name}@{this.state.settings.computer_name}:</span><span className="prompt-location">{this.pwd_text()}</span><span className="prompt-dollar">$</span>
                  <input className="prompt-input" value={this.state.prompt_text} onChange={this.handleInputChange} onKeyDown={this.handleKeyPress} />
                  <span className="prompt-text">{this.state.prompt_text}</span>
                  <span className="prompt-cursor">{this.state.cursor_letter}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
