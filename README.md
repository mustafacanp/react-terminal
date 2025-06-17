# React Terminal Simulator

A web-based terminal simulator built with React that provides an interactive Linux/Unix-like command-line interface in the browser.

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg) ![React](https://img.shields.io/badge/react-19.1.0-61dafb.svg) ![Vite](https://img.shields.io/badge/vite-6.0.3-646CFF.svg)

## 📸 Screenshot

![Terminal Demo](.github/images/terminal-demo.png)

## ✨ Features

- Interactive terminal with command history and tab completion
- File system navigation (`ls`, `cd`, `pwd`, `cat`, `rm`, `clear`, `help`, `sudo`)
- Right-click to copy selected text
- Touch device support
- Realistic bash-like behavior

## 🚀 Quick Start

```bash
git clone https://github.com/mustafacanp/react-terminal.git
cd react-terminal
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎮 Usage

```bash
root@ubuntu:~/$ ls
Documents/  Downloads/  Music/  Pictures/  game_saves/  gta_sa_cheats.txt  .bashrc

root@ubuntu:~/$ cd Pictures
root@ubuntu:~/Pictures$ cat profile.png
[File contents displayed]
```

Use ↑/↓ arrows for command history, Tab for completion.

## 🎨 Customization

### Adding New Commands

To add a new command, extend the commands object in the `useTerminal` hook at `src/hooks/useTerminal.tsx`:

```typescript
// Inside the useTerminal hook
const commands = {
	// ... existing commands
	yourcommand: (input?: string) => {
		if (validateAndShowError(hasTooManyParameters(input || ''), 'yourcommand'))
			return;

		const param = getSecondParameter(input || '');
		// Command implementation using hook's state and helper functions
		cout('Your command output');

		// Update state if needed using functional setState
		setState(prev => ({
			...prev
			// ... your state updates
		}));
	}
};
```

### Modifying File System

Edit `src/fs.json` to customize the virtual file system structure:

```json
{
	"type": "directory",
	"children": {
		"your_folder": {
			"type": "directory",
			"children": {}
		},
		"your_file.txt": {
			"type": "file",
			"src": "/path/to/file/content.txt"
		}
	}
}
```

## 🔗 Demo

Try it live: [https://mustafacanpalaz.com/cmd](https://mustafacanpalaz.com/cmd)

## 📝 License

MIT License - see [LICENSE](LICENSE) file.

---

Built with ❤️ using React

Copyright (c) 2025 Mustafa Can Palaz
