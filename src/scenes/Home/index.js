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
		this._terminalBody = this._terminalBodyContainer = undefined;
		this._prompt = React.createRef();
		this.state = {
			settings: {
				computerName: 'ubuntu',
				userName: 'root'
			},
			fs: fs,
			cfs: fs,
			path: [],
			basePath: 'home/user',
			promptText: '',
			previousLines: [],
			previousCommands: [],
			currentLineFromLast: 0,
			tabPressed: false
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
				pwdText: this.pwdText,
				checkSecondParameter: this.checkSecondParameter,
				isDir: this.isDir,
				isFile: this.isFile,
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
		return !!Object.keys(this.getCommands()).find(commandName => {
			if (input === commandName || input.startsWith(commandName + ' '))
				return true;
			else return false;
		});
	};

	extractCommandName = input =>
		Object.keys(this.getCommands()).find(commandName => {
			if (input.startsWith(commandName + ' ')) return input.split(' ')[0];
			else if (input === commandName) return input;
			else return undefined;
		});

	createNewCommand = (type, text, breakWord, noTrim) => {
		return {
			type,
			id: this.state.previousLines.length + 1,
			pwd: this.pwdText(),
			text: noTrim ? text : this.trim(text),
			breakWord: breakWord ? false : true
		};
	};

	cin = (text = '', breakWord) => {
		const cinText = this.createNewCommand('cin', text, breakWord);

		this.setState(prevState => ({
			previousLines: [...prevState.previousLines, cinText]
		}));

		this.setState({ promptText: '' }, () => this.focusTerminal());
	};

	cout = (text = '', breakWord, input, noTrim) => {
		const newCommand = this.createNewCommand('cout', text, breakWord, noTrim);
		newCommand.id = this.state.previousLines.length + 2;
		const coutText = newCommand;

		const inputTrimmed = this.removeSpaces(
			this._prompt.current.content || input
		);
		this.cin(inputTrimmed, breakWord);

		this.setState(
			prevState => ({
				previousLines: [...prevState.previousLines, coutText]
			}),
			() => this.focusTerminal()
		);

		this.setState({ promptText: '' }, () => this.focusTerminal());
	};

	updatePreviousCommands = commandText => {
		if (commandText !== '')
			this.setState(prevState => ({
				previousCommands: [...prevState.previousCommands, commandText]
			}));
	};

	checkSecondParameter = (text, commandName) => {
		if (this.secondParameter(text)) {
			this.cout(`bash: ${commandName}: too many arguments`);
			return true;
		}
		return false;
	};
	checkThirdParameter = (text, commandName) => {
		if (this.thirdParameter(text)) {
			this.cout(`bash: ${commandName}: too many arguments`);
			return true;
		}
		return false;
	};

	trim = str => str.trimStart().trimEnd();
	removeSpaces = text => text.replace(/\s+/g, ' ').trim();

	isDir = obj => !!(obj && FSEntry.parse(obj.type) === FSEntry.DIRECTORY);
	isFile = obj => !!(obj && FSEntry.parse(obj.type) === FSEntry.FILE);

	printCommandLine = () => this.cin(this._prompt.current.content);
	createErrorLine = () =>
		this.cout(
			this.firstParameter(this._prompt.current.content) + ': command not found'
		);
	pwdText = () =>
		'~' +
		(this.state.path.join('/') === this.state.basePath
			? ''
			: '/' + this.state.path.join('/'));

	firstParameter = str => this.trim(str).split(' ')[0];
	secondParameter = str => this.trim(str).split(' ')[1] || '';
	thirdParameter = str => this.trim(str).split(' ').length > 2 || '';

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

		// Navigate to the target directory for nested paths with ".." support
		let targetFS = this.state.cfs;
		let searchTerm = param2;
		let workingPath = [...this.state.path]; // Copy current path

		if (param2.includes('/')) {
			const pathParts = param2.split('/');
			searchTerm = pathParts.pop(); // Get the last part to search for
			const directoryPath = pathParts.filter(part => part !== '');

			// Navigate through the directory structure with ".." support
			for (const dirName of directoryPath) {
				if (dirName === '..') {
					// Go up one directory
					if (workingPath.length > 0) {
						workingPath.pop();
						// Navigate to the parent directory from root
						targetFS = this.state.fs;
						for (const pathSegment of workingPath) {
							if (targetFS.children && targetFS.children[pathSegment]) {
								targetFS = targetFS.children[pathSegment];
							} else {
								// Path not found
								return;
							}
						}
					} else {
						// Already at root, can't go up further
						targetFS = this.state.fs;
					}
				} else {
					// Normal directory navigation
					if (
						targetFS.children &&
						targetFS.children[dirName] &&
						this.isDir(targetFS.children[dirName])
					) {
						targetFS = targetFS.children[dirName];
						workingPath.push(dirName);
					} else {
						// Path doesn't exist, no completions available
						return;
					}
				}
			}
		}

		const children = Object.keys(targetFS.children || {});
		const matchingItems = children.filter(dir =>
			dir.toLowerCase().startsWith(searchTerm.toLowerCase())
		);

		this.handleTabCompletion(
			input,
			command,
			param2,
			targetFS.children,
			matchingItems,
			sudoString
		);
	};

	getLastDir = path => {
		const parts = path.split('/').filter(Boolean);
		return path.endsWith('/')
			? parts[parts.length - 1]
			: parts[parts.length - 2];
	};

	handleTabCompletion = (
		originalInput,
		command,
		targetPath,
		childrenFS,
		matchingItems,
		sudoPrefix
	) => {
		if (targetPath.includes('/')) {
			const selectedDir = this.getLastDir(targetPath);
			const dir = childrenFS[selectedDir];
			if (this.isDir(dir)) {
				const newTargetPath = targetPath.split('/').pop().toLowerCase();
				const children = Object.keys(dir.children);
				const newMatchingItems = children.filter(dir =>
					dir.toLowerCase().startsWith(newTargetPath.toLowerCase())
				);
				this.handleTabCompletion(
					originalInput,
					command,
					newTargetPath,
					dir.children,
					newMatchingItems,
					sudoPrefix
				);
				return;
			}
		}

		if (targetPath === '') {
			this.cout(matchingItems.join('&#09;'), 'break-none');
			this.setState({ promptText: originalInput });
			return;
		}

		if (matchingItems.length === 1) {
			const inputWithoutSudo = originalInput.replace('sudo ', '');
			const param2 = this.secondParameter(inputWithoutSudo);
			const parentFolders = param2.substring(0, param2.lastIndexOf('/') + 1);
			const dirSlash = this.isDir(childrenFS[matchingItems[0]]) ? '/' : '';

			this._prompt.current.content = `${sudoPrefix + command} ${parentFolders}${
				matchingItems[0]
			}${dirSlash}`;
			return;
		}

		if (matchingItems.length > 1) {
			this.setState({ tabPressed: true });
			this.cout(matchingItems.join('&#09;'), 'break-none');
			this.setState({ promptText: originalInput });
		}
	};

	handleEnter = () => {
		this.setState({ tabPressed: false });
		this.setState({ currentLineFromLast: 0 });

		const input = this.removeSpaces(this._prompt.current.content);
		const isItCommand = this.isItCommand(input);
		const command = this.extractCommandName(input);

		const commandInput = this.removeSpaces(input);
		if (isItCommand) this.getCommands()[command](false, commandInput);
		else if (input === '') this.cin();
		else this.createErrorLine();

		this.updatePreviousCommands(input);
		this._prompt.current.clear();
	};

	handleUpArrow = e => {
		e.preventDefault();
		if (this.state.currentLineFromLast < this.state.previousCommands.length)
			this.setState(
				{ currentLineFromLast: this.state.currentLineFromLast + 1 },
				() =>
					(this._prompt.current.content =
						this.state.previousCommands[
							this.state.previousCommands.length -
								this.state.currentLineFromLast
						]),
				() => this.focusTerminal()
			);
	};

	handleDownArrow = () => {
		if (this.state.currentLineFromLast > 1)
			this.setState(
				{ currentLineFromLast: this.state.currentLineFromLast - 1 },
				() =>
					(this._prompt.current.content =
						this.state.previousCommands[
							this.state.previousCommands.length -
								this.state.currentLineFromLast
						]),
				() => this.focusTerminal()
			);
	};

	/** END HANDLE KEYS */

	/** DOM ACTIONS */

	componentDidMount() {
		this._terminalBodyContainer = document.querySelector(
			'.terminal-body-container'
		);
		this._terminalBody = document.querySelector('.terminal-body-container');

		// this.focusTerminal();
		document.addEventListener('keydown', this.handleKeyDown.bind(this));
	}

	componentWillUnmount() {
		document.removeEventListener('keydown', this.handleKeyDown);
	}

	focusTerminal() {
		this._prompt.current.focusPrompt();
		this._terminalBodyContainer.scrollTop = this._terminalBody.scrollHeight;
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
							pwd={this.pwdText()}
						></Toolbar>
						<div className="terminal-body-container">
							<div className="terminal-body">
								{this.renderPreviousLines()}
								<Prompt
									ref={this._prompt}
									username={this.state.settings.userName}
									computerName={this.state.settings.computerName}
									currentPath={this.pwdText()}
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
