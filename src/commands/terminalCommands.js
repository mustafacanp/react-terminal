import {
	removeSpaces,
	isDir,
	isFile,
	getSecondParameter,
	hasSecondParameter,
	hasTooManyParameters,
	resolveFileSystemPath
} from '../utils/utils';

export const createTerminalCommands = context => {
	const {
		getState,
		setState,
		_prompt,
		isItCommand,
		extractCommandName,
		cin,
		createErrorLine,
		getUsableCommands,
		cout,
		openLink,
		printCommandLine,
		pwdText,
		validateAndShowError,
		getCommands
	} = context;

	return {
		sudo: () => {
			const input = removeSpaces(_prompt.current.content);
			const inputWithoutSudo = input.substr(input.indexOf(' ') + 1);

			const isCommand = isItCommand(inputWithoutSudo);
			const command = extractCommandName(inputWithoutSudo);

			const commandInput = removeSpaces(inputWithoutSudo);
			if (isCommand) getCommands()[command](true, commandInput);
			else if (input === '') cin();
			else createErrorLine();
		},
		help: async () => {
			const input = _prompt.current.content;
			const commands = await getUsableCommands();
			cout(['Usable Commands:', ...commands].join('&#09;'), true, input);
		},
		clear: () => {
			setState({ previousLines: [] });
		},
		pwd: () => {
			const state = getState();
			const cwd = pwdText(state).replace('~', '/' + state.basePath);
			cout(cwd);
		},
		ls: (sudo, input) => {
			const state = getState();
			if (validateAndShowError(hasSecondParameter(input), 'ls')) return;
			const dirs = Object.keys(state.cfs.children).map(key => {
				const slash = isDir(state.cfs.children[key]) ? '/' : '';
				return `<span class="type-${state.cfs.children[key].type}">${key}${slash}</span>`;
			});
			cout(dirs.join('&#09;'), true);
		},
		cd: (sudo, input) => {
			const state = getState();
			if (input === 'cd' || input === 'cd ') {
				printCommandLine();
				return;
			}

			if (validateAndShowError(hasTooManyParameters(input), 'cd')) return;

			const secondParam = getSecondParameter(input);
			if (!secondParam || secondParam === '.') {
				printCommandLine();
				return;
			}

			if (secondParam === '/' || secondParam === '~') {
				printCommandLine();
				setState({
					cfs: state.fs,
					path: []
				});
				return;
			}

			const selectedFileOrDir = resolveFileSystemPath(
				state.fs,
				state.cfs,
				state.path,
				secondParam
			);
			if (isDir(selectedFileOrDir)) {
				printCommandLine();

				// Calculate the new path considering ".." navigation
				const pathParts = secondParam.split('/').filter(part => part !== '');
				let newPath = [...state.path];

				for (const part of pathParts) {
					if (part === '..') {
						if (newPath.length > 0) {
							newPath.pop();
						}
					} else {
						newPath.push(part);
					}
				}

				setState(prevState => ({
					path: newPath,
					cfs: selectedFileOrDir
				}));
				return;
			} else if (isFile(selectedFileOrDir)) {
				cout(`bash: cd: ${secondParam}: Not a directory`);
				return;
			} else {
				cout(`bash: cd: ${secondParam}: No such file or directory`);
				return;
			}
		},
		cat: async (sudo, input) => {
			const state = getState();
			if (!getSecondParameter(input)) {
				cout('cat: missing operand');
				return;
			}
			const secondParam = getSecondParameter(input);
			if (validateAndShowError(hasTooManyParameters(input), 'cat')) return;

			const selectedFileOrDir = resolveFileSystemPath(
				state.fs,
				state.cfs,
				state.path,
				secondParam
			);
			if (isFile(selectedFileOrDir)) {
				const file = selectedFileOrDir;
				if (!file.sudo || sudo) {
					const input = _prompt.current.content;
					const fileContent = await fetch(
						process.env.PUBLIC_URL + file.src
					).then(res => res.text());
					cout(fileContent, false, input, true);
				} else {
					cout(`bash: ${secondParam}: permission denied`);
				}
			} else if (isDir(selectedFileOrDir)) {
				cout(`cat: ${secondParam}: Is a directory`);
			} else {
				cout(`cat: ${secondParam}: No such file or directory`);
			}
		},
		rm: (sudo, input) => {
			const state = getState();
			if (!getSecondParameter(input)) {
				cout('rm: missing operand');
				return;
			}
			const secondParam = getSecondParameter(input);
			if (validateAndShowError(hasTooManyParameters(input), 'rm')) return;

			const selectedFileOrDir = resolveFileSystemPath(
				state.fs,
				state.cfs,
				state.path,
				secondParam
			);
			if (isFile(selectedFileOrDir)) {
				const file = selectedFileOrDir;
				if (!file.sudo || sudo) {
					// Handle nested path removal
					const pathParts = secondParam.split('/').filter(part => part !== '');
					const fileName = pathParts[pathParts.length - 1];

					if (pathParts.length === 1) {
						// Simple case: file in current directory
						const newCfs = Object.keys(state.cfs.children)
							.filter(key => key !== fileName)
							.reduce((obj, key) => {
								obj[key] = state.cfs.children[key];
								return obj;
							}, {});

						setState(prevState => ({
							cfs: { ...prevState.cfs, children: newCfs }
						}));
					} else {
						// Complex case: file in nested directory - for now, show error
						cout(
							`rm: removing files from nested directories not yet implemented`
						);
						return;
					}
					cout();
				} else cout(`bash: ${secondParam}: permission denied`);
				return;
			} else if (isDir(selectedFileOrDir))
				cout(`rm: cannot remove '${secondParam}': Is a directory`);
			else cout(`rm: ${secondParam}: No such file or directory`);
		},
		textgame: () => {
			openLink('https://rpgtextgame.netlify.app');
		},
		randomcolor: () => {
			openLink('https://randomcolor2.netlify.app');
		}
	};
};
