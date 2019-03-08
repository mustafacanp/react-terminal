import React, { Component } from "react";
import "./Home.css";
import Line from "../../components/Line";
import Toolbar from "../../components/Toolbar";

class App extends Component {

  constructor() {
    super();
    
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this._promptInput = this._cursor = this._terminal_body = this._terminal_body_container = undefined;

    this.fs = {
      type: "directory",
      children: {
        "about.txt": {
          type: "file",
          src: "/files/aboutme.txt"
        },
        "awards.txt": {
          type: "file",
          src: "/files/awards.txt"
        },
        blog: {
          type: "directory",
          children: {
            last_article: {
              type: "file",
              src: "/files/blog/last_article.txt"
            }
          }
        },
        "contact.txt": {
          type: "file",
          src: "/files/contact.txt"
        },
        "credits.txt": {
          type: "file",
          src: "/files/credits.txt"
        },
        "github.txt": {
          type: "file",
          src: "/files/github.txt"
        },
        "projects.txt": {
          type: "file",
          src: "/files/projects.txt"
        },
        "skills.txt": {
          type: "file",
          src: "/files/skills.txt"
        },
      }
    };

    this.state = {
      settings: {
        computer_name: "tchavadar.com",
        user_name: "guest",
      },
      fs: this.fs,
      cfs: this.fs, // Current fs
      // path: ["home", "user"],
      path: [],
      base_path: "home/guest",
      prompt_text: "",
      cursor_from_the_right: 0,
      cursor_letter: "",
      previousLines: [],
      previousCommands: [],
      current_line_from_last: 0,
      tab_pressed: false
    }
  }


  pwd_text = () => {
    return "~" + ((this.state.path.join("/") === this.state.base_path) ? "" : "/" + this.state.path.join("/"));
  }

  isDirecroryExist = (dir_name) => {
    
  }

  is_dir = (obj) => {
    return !!(obj && obj.type === "directory");
  }
  is_file = (obj) => {
    return !!(obj && obj.type === "file");
  }

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

  handleInputChange = (e) => {
    this.setState({prompt_text:e.target.value});
  }

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

  createNewLine = (text, type, breakWord) => {
    const new_command = {
      id: this.state.previousLines.length+1,
      pwd: this.pwd_text(),
      text: this.trim(text),
      type: type,
      breakWord: breakWord ? false : true
    };

    if(type==="cout") {

      new_command.id = this.state.previousLines.length+2;

      const response_of_command = new_command;

      const new_command2 = {
        id: this.state.previousLines.length+1,
        pwd: this.pwd_text(),
        text: (this.state.prompt_text).trimEnd(),
        type: "cin",
        breakWord: breakWord ? false : true
      };

      this.setState(prevState => ({
        previousLines: [...prevState.previousLines, new_command2]
      }));

      this.setState(prevState => ({
        previousLines: [...prevState.previousLines, response_of_command]
      }), () => this.focusTerminal());

    } else if(type==="cin") {

      this.setState(prevState => ({
        previousLines: [...prevState.previousLines, new_command]
      }));
    }
    this.setState({prompt_text:""}, () => this.focusTerminal());
  }

  updatePreviousCommands = (new_command_text) => {
    if(new_command_text !== ""){
      this.setState(prevState => ({
        previousCommands: [...prevState.previousCommands, new_command_text]
      }));
    }
  }

  trim = (str) => {
    return str.trimStart().trimEnd();
  }

  createErrorLine = () => {
    this.createNewLine(this.firstParameter(this.state.prompt_text)+": command not found", "cout");
  }

  commands = {
    help: () => {
      const usable_commands = Object.keys(this.commands).join("   ");
      this.createNewLine(`Usable Commands:   ${usable_commands}`, "cout");
    },
    ls: () => {
      const cmd = this.state.prompt_text.replace(/\s+/g, " ");
      if(this.checkSecondParameter(cmd, "ls")) return;
      const folders = Object.keys(this.state.cfs.children).filter(folder => folder);
      this.createNewLine(folders.join("   "), "cout", "break-none");
    },
    cd: () => {
      const cmd = this.state.prompt_text.replace(/\s+/g, " ");
      if(cmd === "cd" || cmd === "cd ") { this.printCommandLine(); return; }
      const secondParam = this.secondParameter(cmd).replace("/", "");

      if(this.checkThirdParameter(cmd, "cd")) return; // Third Parameter
      if(!secondParam || secondParam === ".") { this.printCommandLine(); return; } // cd Current Path

      if(secondParam === "..") { // Up folder
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
      }

      if(this.state.cfs.children[secondParam] && this.state.cfs.children[secondParam].type === "directory") { // If Folder Exist
        this.setState(prevState => ({
          path: [...prevState.path, secondParam]
        }));
        this.setState({ cfs: this.state.cfs.children[secondParam] });
      } else if(this.state.cfs.children[secondParam] && this.state.cfs.children[secondParam].type !== "directory") { // If File Exist
        this.createNewLine(`bash: cd: ${secondParam}: Not a directory`, "cout"); return;
      } else { // If Not Exist
        this.createNewLine(`bash: cd: ${secondParam}: No such file or directory`, "cout"); return;
      }
      this.printCommandLine();
    },
    pwd: () => {
      const cwd = this.pwd_text().replace("~", "/" + this.state.base_path);
      this.createNewLine(cwd, "cout");
    },
    clear: () => {
      this.setState({ previousLines: [] }, this.printCommandLine());
    },
    cat: async () => {
      const cmd = this.state.prompt_text.replace(/\s+/g, " ");
      if(cmd === "cat" || cmd === "cat ") { this.createNewLine("cat: missing operand", "cout"); return }
      const secondParam = this.secondParameter(cmd).replace("/", "");

      let coutString = "";
      if(this.state.cfs.children[secondParam] && this.state.cfs.children[secondParam].type === "file") {
        const file = this.state.cfs.children[secondParam];
        coutString = await fetch(file.src).then(res => res.text());
      } else if(this.state.cfs.children[secondParam] && this.state.cfs.children[secondParam].type === "directory") {
        coutString = `cat: ${secondParam}: Is a directory`;
      } else {
        coutString = `cat: ${secondParam}: No such file or directory`;
      }
      this.createNewLine(coutString, "cout");
    },
    rm: () => {
      const cmd = this.state.prompt_text.replace(/\s+/g, " ");
      if(cmd === "rm" || cmd === "rm ") { this.createNewLine("rm: missing operand", "cout"); return }
      const secondParam = this.secondParameter(cmd).replace("/", "");

      let coutString = "";
      if(this.state.cfs.children[secondParam] && this.state.cfs.children[secondParam].type === "file") {
        
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
      } else if(this.state.cfs.children[secondParam] && this.state.cfs.children[secondParam].type === "directory") {
        coutString = `rm: cannot remove '${secondParam}': Is a directory`;
      } else {
        coutString = `rm: ${secondParam}: No such file or directory`;
      }
      this.createNewLine(coutString, "cout");
    }
  }

  checkSecondParameter = (text, command_name) => {
    if(this.secondParameter(text)){
      this.createNewLine(`bash: ${command_name}: too many arguments`, "cout");
      return true;
    }
    return false;
  }
  checkThirdParameter = (text, command_name) => {
    if(this.thirthParameter(text)){
      this.createNewLine(`bash: ${command_name}: too many arguments`, "cout");
      return true;
    }
    return false;
  }

  printCommandLine = () => {
    this.createNewLine(this.state.prompt_text, "cin");
  }

  firstParameter = (str) => {
    str = this.trim(str);
    return str.split(" ")[0];
  }
  secondParameter = (str) => {
    str = this.trim(str);
    return (str.split(" ") ? str.split(" ")[1] : false);
  }
  thirthParameter = (str) => {
    str = this.trim(str);
    return (str.split(" ") ? str.split(" ").length>2 : false);
  }


  /** START HANDLE KEYS */

  handleTab = (e) => {
    e.preventDefault();

    const cmd = this.state.prompt_text;

    const param1 = this.firstParameter(cmd);
    const param2 = this.secondParameter(cmd);

    if((param1 === "cd" || param1 === "cat" || param1 === "rm") && param2) {
      const children = Object.keys(this.state.cfs.children);
      const existed_things = children.filter(folder => folder.startsWith(param2));

      if(existed_things.length > 1) this.setState({ tab_pressed: true });

      if (existed_things.length === 1) {
        this.setState({ prompt_text: `${param1} ${existed_things[0]}/` });
        return;
      }

      if(this.state.tab_pressed) {
        this.createNewLine(existed_things.join("   "), "cout", "break-none");
        this.setState({ prompt_text: this.state.prompt_text });
        return;
      }
    }
  }

  handleEnter = () => {
    this.setState({ tab_pressed: false });
    const cmd = this.trim(this.state.prompt_text);
    this.setState({ current_line_from_last:0 });
    let is_it_command = false;
    let command = "";
    Object.keys(this.commands).map((command_name, index) => {
      if(cmd === command_name) {
        is_it_command = true;
        command = cmd;
      } else if(cmd.startsWith(command_name+" ")) {
        is_it_command = true;
        command = cmd.split(" ")[0];
      }
      return undefined;
    });
    if(is_it_command) this.commands[command]();
    else if(this.state.prompt_text === "") this.createNewLine("", "cin");
    else this.createErrorLine();

    this.updatePreviousCommands(this.state.prompt_text);
  }

  handleLeftArrow = () => {
    if(this.state.cursor_from_the_right < this.state.prompt_text.length) {
      this.setState({cursor_from_the_right:this.state.cursor_from_the_right+1}, ()=>this.moveCursor());
    }
  }

  handleRightArrow = () => {
    if(this.state.cursor_from_the_right > 0) {
      this.setState({cursor_from_the_right:this.state.cursor_from_the_right-1}, ()=>this.moveCursor());
    }
  }

  handleUpArrow = (e) => {
    e.preventDefault();
    if(this.state.current_line_from_last < this.state.previousCommands.length) {
      this.setState({current_line_from_last:this.state.current_line_from_last+1},
        () => this.setState({prompt_text: this.state.previousCommands[this.state.previousCommands.length - this.state.current_line_from_last]}, ()=>this.focusTerminal()));
    }
  }

  handleDownArrow = () => {
    if(this.state.current_line_from_last > 1) {
      this.setState({current_line_from_last:this.state.current_line_from_last-1},
        () => this.setState({prompt_text: this.state.previousCommands[this.state.previousCommands.length - this.state.current_line_from_last]}, ()=>this.focusTerminal()));
    }
  }

  /** END HANDLE KEYS */
  
  
  moveCursor = () => {
    this._cursor.style.marginLeft = -8*this.state.cursor_from_the_right+"px"; // move cursor
    this.setState({cursor_letter:this.state.prompt_text[this.state.prompt_text.length-this.state.cursor_from_the_right]}); // set letter to cursor
  }

  cursorPosition = () => {
    return this.state.prompt_text.length -  - 1;
  }

  renderPreviousLines = () => {
    return this.state.previousLines.map((previousCommand) => <Line settings={this.state.settings} key={previousCommand.id} command={previousCommand}></Line>);
  }

  renderCoutResponse = (content) => {
    return(<div className="terminal-prompt">{content}</div>);
  }

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
