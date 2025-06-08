import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Home.css';
import Line from '../../components/Line';
import Toolbar from '../../components/Toolbar';
import fs from '../../fs.json';
import { Prompt } from '../../components';
import { createTerminalCommands } from '../../commands/terminalCommands';
import {
	trim,
	removeSpaces,
	isDir,
	getFirstParameter,
	getSecondParameter
} from '../../utils/utils';

const App = () => {
	// State management
	const [state, setState] = useState({
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
	});

	// Refs
	const _prompt = useRef();
	const _terminalBodyContainer = useRef();
	const _terminalBody = useRef();
	const commands = useRef(null);
	const commandIdCounter = useRef(0);
	const stateRef = useRef(state);

	// Keep state ref in sync
	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	const pwdText = useCallback((currentState = null) => {
		const activeState = currentState || stateRef.current;
		return (
			'~' +
			(activeState.path.join('/') === activeState.basePath
				? ''
				: '/' + activeState.path.join('/'))
		);
	}, []);

	const focusTerminal = useCallback(() => {
		_prompt.current.focusPrompt();
		_terminalBodyContainer.current.scrollTop =
			_terminalBody.current.scrollHeight;
	}, []);

	const createNewCommand = useCallback(
		(type, text, breakWord, noTrim) => {
			commandIdCounter.current += 1;
			return {
				type,
				id: commandIdCounter.current,
				pwd: pwdText(),
				text: noTrim ? text : trim(text),
				breakWord: breakWord ? false : true
			};
		},
		[pwdText]
	);

	const cin = useCallback(
		(text = '', breakWord) => {
			const cinText = createNewCommand('cin', text, breakWord);
			setState(prevState => ({
				...prevState,
				previousLines: [...prevState.previousLines, cinText],
				promptText: ''
			}));
			setTimeout(() => focusTerminal(), 0);
		},
		[createNewCommand, focusTerminal]
	);

	const cout = useCallback(
		(text = '', breakWord, input, noTrim) => {
			const inputTrimmed = removeSpaces(_prompt.current.content || input);
			cin(inputTrimmed, breakWord);

			const coutText = createNewCommand('cout', text, breakWord, noTrim);
			setState(prevState => ({
				...prevState,
				previousLines: [...prevState.previousLines, coutText],
				promptText: ''
			}));
			setTimeout(() => focusTerminal(), 0);
		},
		[createNewCommand, cin, focusTerminal]
	);

	const printCommandLine = useCallback(
		() => cin(_prompt.current.content),
		[cin]
	);

	const createErrorLine = useCallback(
		() =>
			cout(getFirstParameter(_prompt.current.content) + ': command not found'),
		[cout]
	);

	const updatePreviousCommands = useCallback(commandText => {
		if (commandText !== '') {
			setState(prevState => ({
				...prevState,
				previousCommands: [...prevState.previousCommands, commandText]
			}));
		}
	}, []);

	const validateAndShowError = useCallback(
		(hasExtraParams, commandName, errorType = 'too many arguments') => {
			if (hasExtraParams) {
				cout(`bash: ${commandName}: ${errorType}`);
				return true;
			}
			return false;
		},
		[cout]
	);

	const openLink = useCallback(
		link => {
			var win = window.open(link, '_blank');
			win.focus();
			printCommandLine();
		},
		[printCommandLine]
	);

	const getUsableCommands = useCallback(async () => {
		const bashrc = await fetch('/files/bashrc.txt').then(res => res.text());
		const rows = bashrc.split('\n');

		const hiddenCommands = rows.map(row => {
			return row.substring(row.indexOf(' ') + 1, row.indexOf('='));
		});
		hiddenCommands.push('sudo');

		if (!commands.current) return [];
		return Object.keys(commands.current).filter(
			cmd => hiddenCommands.indexOf(cmd) < 0
		);
	}, []);

	// Enhanced setState function for terminal commands
	const terminalSetState = useCallback(updater => {
		setState(prevState => {
			let newState;
			if (typeof updater === 'function') {
				// Function-based update
				newState = { ...prevState, ...updater(prevState) };
			} else {
				// Object-based update
				newState = { ...prevState, ...updater };
			}
			// Immediately update the state ref so pwdText gets fresh state
			stateRef.current = newState;
			return newState;
		});
	}, []);

	// Get commands with proper context
	const getCommands = useCallback(() => {
		// Create local functions to avoid circular dependencies
		const localIsItCommand = input => {
			if (!commands.current) return false;
			return !!Object.keys(commands.current).find(commandName => {
				if (input === commandName || input.startsWith(commandName + ' '))
					return true;
				else return false;
			});
		};

		const localExtractCommandName = input => {
			if (!commands.current) return undefined;
			return Object.keys(commands.current).find(commandName => {
				if (input.startsWith(commandName + ' ')) return input.split(' ')[0];
				else if (input === commandName) return input;
				else return undefined;
			});
		};

		commands.current = createTerminalCommands({
			getState: () => stateRef.current,
			setState: terminalSetState,
			_prompt,
			isItCommand: localIsItCommand,
			extractCommandName: localExtractCommandName,
			cin,
			createErrorLine,
			getUsableCommands,
			cout,
			openLink,
			printCommandLine,
			pwdText,
			validateAndShowError,
			getCommands: () => commands.current
		});

		return commands.current;
	}, [
		terminalSetState,
		cin,
		createErrorLine,
		getUsableCommands,
		cout,
		openLink,
		printCommandLine,
		pwdText,
		validateAndShowError
	]);

	// Standalone functions that use commands
	const isItCommand = useCallback(
		input => {
			if (!commands.current) getCommands();
			return !!Object.keys(commands.current || {}).find(commandName => {
				if (input === commandName || input.startsWith(commandName + ' '))
					return true;
				else return false;
			});
		},
		[getCommands]
	);

	const extractCommandName = useCallback(
		input => {
			if (!commands.current) getCommands();
			return Object.keys(commands.current || {}).find(commandName => {
				if (input.startsWith(commandName + ' ')) return input.split(' ')[0];
				else if (input === commandName) return input;
				else return undefined;
			});
		},
		[getCommands]
	);

	const getLastDir = useCallback(path => {
		const parts = path.split('/').filter(Boolean);
		return path.endsWith('/')
			? parts[parts.length - 1]
			: parts[parts.length - 2];
	}, []);

	const handleTabCompletion = useCallback(
		(
			originalInput,
			command,
			targetPath,
			childrenFS,
			matchingItems,
			sudoPrefix
		) => {
			if (targetPath.includes('/')) {
				const selectedDir = getLastDir(targetPath);
				const dir = childrenFS[selectedDir];
				if (isDir(dir)) {
					const newTargetPath = targetPath.split('/').pop().toLowerCase();
					const children = Object.keys(dir.children);
					const newMatchingItems = children.filter(dir =>
						dir.toLowerCase().startsWith(newTargetPath.toLowerCase())
					);
					handleTabCompletion(
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
				cout(matchingItems.join('&#09;'), 'break-none');
				setState(prevState => ({ ...prevState, promptText: originalInput }));
				return;
			}

			if (matchingItems.length === 1) {
				const inputWithoutSudo = originalInput.replace('sudo ', '');
				const param2 = getSecondParameter(inputWithoutSudo);
				const parentFolders = param2.substring(0, param2.lastIndexOf('/') + 1);
				const dirSlash = isDir(childrenFS[matchingItems[0]]) ? '/' : '';

				_prompt.current.content = `${sudoPrefix + command} ${parentFolders}${
					matchingItems[0]
				}${dirSlash}`;
				return;
			}

			if (matchingItems.length > 1) {
				setState(prevState => ({ ...prevState, tabPressed: true }));
				cout(matchingItems.join('&#09;'), 'break-none');
				setState(prevState => ({ ...prevState, promptText: originalInput }));
			}
		},
		[getLastDir, cout]
	);

	const handleTab = useCallback(
		e => {
			e.preventDefault();

			const input = _prompt.current.content;
			const inputWithoutSudo = input.replace('sudo ', '');
			const sudoString = input.startsWith('sudo ') ? 'sudo ' : '';

			const command = getFirstParameter(inputWithoutSudo);
			const param2 = getSecondParameter(inputWithoutSudo);

			if (!['cd', 'cat', 'rm'].includes(command)) {
				return;
			}

			// Navigate to the target directory for nested paths with ".." support
			let targetFS = stateRef.current.cfs;
			let searchTerm = param2;
			let workingPath = [...stateRef.current.path]; // Copy current path

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
							targetFS = stateRef.current.fs;
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
							targetFS = stateRef.current.fs;
						}
					} else {
						// Normal directory navigation
						if (
							targetFS.children &&
							targetFS.children[dirName] &&
							isDir(targetFS.children[dirName])
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

			handleTabCompletion(
				input,
				command,
				param2,
				targetFS.children,
				matchingItems,
				sudoString
			);
		},
		[handleTabCompletion]
	);

	const handleEnter = useCallback(() => {
		setState(prevState => ({
			...prevState,
			tabPressed: false,
			currentLineFromLast: 0
		}));

		const input = removeSpaces(_prompt.current.content);
		const isItCommandResult = isItCommand(input);
		const command = extractCommandName(input);

		const commandInput = removeSpaces(input);
		if (isItCommandResult) {
			getCommands()[command](false, commandInput);
		} else if (input === '') {
			cin();
		} else {
			createErrorLine();
		}

		updatePreviousCommands(input);
		_prompt.current.clear();
	}, [
		isItCommand,
		extractCommandName,
		getCommands,
		cin,
		createErrorLine,
		updatePreviousCommands
	]);

	const handleUpArrow = useCallback(
		e => {
			e.preventDefault();
			if (
				stateRef.current.currentLineFromLast <
				stateRef.current.previousCommands.length
			) {
				const newCurrentLine = stateRef.current.currentLineFromLast + 1;
				setState(prevState => ({
					...prevState,
					currentLineFromLast: newCurrentLine
				}));
				_prompt.current.content =
					stateRef.current.previousCommands[
						stateRef.current.previousCommands.length - newCurrentLine
					];
				focusTerminal();
			}
		},
		[focusTerminal]
	);

	const handleDownArrow = useCallback(() => {
		if (stateRef.current.currentLineFromLast > 1) {
			const newCurrentLine = stateRef.current.currentLineFromLast - 1;
			setState(prevState => ({
				...prevState,
				currentLineFromLast: newCurrentLine
			}));
			_prompt.current.content =
				stateRef.current.previousCommands[
					stateRef.current.previousCommands.length - newCurrentLine
				];
			focusTerminal();
		}
	}, [focusTerminal]);

	const copy = useCallback(text => {
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
	}, []);

	// Key handling functions
	const handleKeyDown = useCallback(
		e => {
			// Handles non-printable chars.
			if (e.ctrlKey || e.altKey) {
				_prompt.current.blurPrompt();
				e.preventDefault();
				e.returnValue = false;
				return false;
			} else {
				focusTerminal();
			}

			switch (e.keyCode) {
				case 9:
					handleTab(e);
					break; // tab
				case 13:
					handleEnter();
					break; // enter
				case 38:
					handleUpArrow(e);
					break; // up
				case 40:
					handleDownArrow();
					break; // down
				default:
					break;
			}
		},
		[focusTerminal, handleTab, handleEnter, handleUpArrow, handleDownArrow]
	);

	const focusTerminalIfTouchDevice = useCallback(
		e => {
			if (e.buttons === 2) {
				// right click
				e.preventDefault();
				if (window.getSelection().toString() !== '') {
					copy(window.getSelection().toString());
					window.getSelection().empty();
				}
			} else if (e.type === 'click') {
				if (window.isTouchDevice()) {
					focusTerminal();
				}
			}
		},
		[copy, focusTerminal]
	);

	const renderPreviousLines = useCallback(
		() =>
			state.previousLines.map(previousCommand => (
				<Line
					settings={state.settings}
					key={previousCommand.id}
					command={previousCommand}
				/>
			)),
		[state.previousLines, state.settings]
	);

	// Effects
	useEffect(() => {
		_terminalBodyContainer.current = document.querySelector(
			'.terminal-body-container'
		);
		_terminalBody.current = document.querySelector('.terminal-body-container');

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [handleKeyDown]);

	return (
		<div className="App">
			<div className="container">
				<div
					className="terminal"
					onMouseDown={focusTerminalIfTouchDevice}
					onContextMenu={e => e.preventDefault()}
					onClick={focusTerminalIfTouchDevice}
				>
					<Toolbar settings={state.settings} pwd={pwdText()}></Toolbar>
					<div className="terminal-body-container">
						<div className="terminal-body">
							{renderPreviousLines()}
							<Prompt
								ref={_prompt}
								username={state.settings.userName}
								computerName={state.settings.computerName}
								currentPath={pwdText()}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default App;
