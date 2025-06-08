export const createTerminalCommands = context => {
	const {
		getState,
		setState,
		removeSpaces,
		_prompt,
		isItCommand,
		extractCommandName,
		cin,
		createErrorLine,
		getUsableCommands,
		cout,
		openLink,
		printCommandLine,
		pwd_text,
		checkSecondParameter,
		is_dir,
		is_file,
		checkThirdParameter,
		secondParameter,
		getCommands
	} = context;

	// Helper function to resolve paths with slashes through nested file structure
	const resolveFileSystemPath = (
		rootFileSystem,
		currentFileSystem,
		currentPath,
		targetPath
	) => {
		if (!targetPath || targetPath === '.') return currentFileSystem;

		const pathParts = targetPath.split('/').filter(part => part !== '');
		let current = currentFileSystem;
		let workingPath = [...currentPath]; // Copy current path

		for (const part of pathParts) {
			if (part === '..') {
				// Go up one directory
				if (workingPath.length > 0) {
					workingPath.pop();
					// Navigate to the parent directory from root
					current = rootFileSystem;
					for (const pathSegment of workingPath) {
						if (current.children && current.children[pathSegment]) {
							current = current.children[pathSegment];
						} else {
							return null; // Path not found
						}
					}
				} else {
					// Already at root, can't go up further
					current = rootFileSystem;
				}
			} else {
				// Normal directory navigation
				if (!current || !current.children || !current.children[part]) {
					return null; // Path not found
				}
				current = current.children[part];
				workingPath.push(part);
			}
		}

		return current;
	};

	return {
		sudo: () => {
			const input = removeSpaces(_prompt.current.content);
			const input_without_sudo = input.substr(input.indexOf(' ') + 1);

			const is_it_command = isItCommand(input_without_sudo);
			const command = extractCommandName(input_without_sudo);

			const command_input = removeSpaces(input_without_sudo);
			if (is_it_command) getCommands()[command](true, command_input);
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
			const cwd = pwd_text().replace('~', '/' + state.base_path);
			cout(cwd);
		},
		ls: (sudo, input) => {
			const state = getState();
			if (checkSecondParameter(input, 'ls')) return;
			const dirs = Object.keys(state.cfs.children).map(key => {
				const slash = is_dir(state.cfs.children[key]) ? '/' : '';
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

			if (checkThirdParameter(input, 'cd')) return;

			const secondParam = secondParameter(input);
			if (!secondParam || secondParam === '.') {
				printCommandLine();
				return;
			}

			if (secondParam === '~') {
				printCommandLine();
				setState({
					cfs: state.fs,
					path: []
				});
				return;
			}

			const selected_file_or_dir = resolveFileSystemPath(
				state.fs,
				state.cfs,
				state.path,
				secondParam
			);
			if (is_dir(selected_file_or_dir)) {
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
					cfs: selected_file_or_dir
				}));
				return;
			} else if (is_file(selected_file_or_dir)) {
				cout(`bash: cd: ${secondParam}: Not a directory`);
				return;
			} else {
				cout(`bash: cd: ${secondParam}: No such file or directory`);
				return;
			}
		},
		cat: async (sudo, input) => {
			const state = getState();
			if (!secondParameter(input)) {
				cout('cat: missing operand');
				return;
			}
			const secondParam = secondParameter(input);
			if (checkThirdParameter(input, 'cat')) return;

			const selected_file_or_dir = resolveFileSystemPath(
				state.fs,
				state.cfs,
				state.path,
				secondParam
			);
			if (is_file(selected_file_or_dir)) {
				const file = selected_file_or_dir;
				if (!file.sudo || sudo) {
					const input = _prompt.current.content;
					const file_content = await fetch(
						process.env.PUBLIC_URL + file.src
					).then(res => res.text());
					cout(file_content, false, input, true);
				} else {
					cout(`bash: ${secondParam}: permission denied`);
				}
			} else if (is_dir(selected_file_or_dir)) {
				cout(`cat: ${secondParam}: Is a directory`);
			} else {
				cout(`cat: ${secondParam}: No such file or directory`);
			}
		},
		rm: (sudo, input) => {
			const state = getState();
			if (!secondParameter(input)) {
				cout('rm: missing operand');
				return;
			}
			const secondParam = secondParameter(input);
			if (checkThirdParameter(input, 'rm')) return;

			const selected_file_or_dir = resolveFileSystemPath(
				state.fs,
				state.cfs,
				state.path,
				secondParam
			);
			if (is_file(selected_file_or_dir)) {
				const file = selected_file_or_dir;
				if (!file.sudo || sudo) {
					// Handle nested path removal
					const pathParts = secondParam.split('/').filter(part => part !== '');
					const fileName = pathParts[pathParts.length - 1];

					if (pathParts.length === 1) {
						// Simple case: file in current directory
						const new_cfs = Object.keys(state.cfs.children)
							.filter(key => key !== fileName)
							.reduce((obj, key) => {
								obj[key] = state.cfs.children[key];
								return obj;
							}, {});

						setState(prevState => ({
							cfs: { ...prevState.cfs, children: new_cfs }
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
			} else if (is_dir(selected_file_or_dir))
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
