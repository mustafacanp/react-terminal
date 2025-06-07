export const createTerminalCommands = (context) => {
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
      const commands = await getUsableCommands();
      cout(['Usable Commands:', ...commands].join('&#09;'), true);
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
      cout(dirs.join('&#09;'), 'break-none');
    },
    cd: (sudo, input) => {
      const state = getState();
      if (input === 'cd' || input === 'cd ') {
        printCommandLine();
        return;
      }
      const secondParam = secondParameter(input).replace('/', '');

      if (checkThirdParameter(input, 'cd')) return;

      if (!secondParam || secondParam === '.') {
        printCommandLine();
        return;
      }

      if (secondParam === '..') {
        printCommandLine();
        if (state.path.length) {
          const temp_path = [...state.path];
          temp_path.pop();
          let temp_cfs = state.fs;
          temp_path.forEach(path => {
            temp_cfs = temp_cfs.children[path];
          });
          setState({ 
            path: temp_path,
            cfs: temp_cfs
          });
        }
        return;
      } else if (secondParam === '~') {
        printCommandLine();
        setState({ 
          cfs: state.fs,
          path: [] 
        });
        return;
      }

      const selected_file_or_dir = state.cfs.children[secondParam];
      if (is_dir(selected_file_or_dir)) {
        printCommandLine();
        setState(prevState => ({
          path: [...prevState.path, secondParam],
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
      const secondParam = secondParameter(input).replace('/', '');
      if (checkThirdParameter(input, 'cat')) return;

      const selected_file_or_dir = state.cfs.children[secondParam];
      if (is_file(selected_file_or_dir)) {
        const file = selected_file_or_dir;
        if (!file.sudo || sudo) {
          const file_content = await fetch(process.env.PUBLIC_URL + file.src).then(res => res.text());
          cout(file_content);
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
      const secondParam = secondParameter(input).replace('/', '');
      if (checkThirdParameter(input, 'rm')) return;

      const selected_file_or_dir = state.cfs.children[secondParam];
      if (is_file(selected_file_or_dir)) {
        const file = selected_file_or_dir;
        if (!file.sudo || sudo) {
          const new_fs = Object.keys(state.fs.children)
            .filter(key => key !== secondParam)
            .reduce((obj, key) => {
              obj[key] = state.fs.children[key];
              return obj;
            }, {});

          const new_cfs = Object.keys(state.cfs.children)
            .filter(key => key !== secondParam)
            .reduce((obj, key) => {
              obj[key] = state.cfs.children[key];
              return obj;
            }, {});

          setState({ 
            fs: { type: 'directory', children: new_fs },
            cfs: { type: 'directory', children: new_cfs }
          });
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

