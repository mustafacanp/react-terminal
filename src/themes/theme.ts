export interface TerminalTheme {
    background: string;
    foreground: string;
    cursor: string;
    selection: string;
    colors: {
        black: string;
        red: string;
        green: string;
        yellow: string;
        blue: string;
        magenta: string;
        cyan: string;
        white: string;
    };
}

export const themes: Record<string, TerminalTheme> = {
    default: {
        background: '#440a2b',
        foreground: '#e5e5e5',
        cursor: '#e5e5e5',
        selection: '#4a4a4a',
        colors: {
            black: '#000000',
            red: '#ff5555',
            green: '#87d441',
            yellow: '#f1fa8c',
            blue: '#6d85a9',
            magenta: '#ff79c6',
            cyan: '#38b8e7',
            white: '#dddddd'
        }
    },
    matrix: {
        background: '#0D0D0D',
        foreground: '#33FF00',
        cursor: '#33FF00',
        selection: '#224D1E',
        colors: {
            black: '#0D0D0D',
            red: '#FF3333',
            green: '#33FF00',
            yellow: '#FFFF33',
            blue: '#3399FF',
            magenta: '#FF33FF',
            cyan: '#7BE885',
            white: '#E5E5E5'
        }
    },
    dracula: {
        background: '#282a36',
        foreground: '#f8f8f2',
        cursor: '#f8f8f2',
        selection: '#44475a',
        colors: {
            black: '#000000',
            red: '#ff5555',
            green: '#50fa7b',
            yellow: '#f1fa8c',
            blue: '#bd93f9',
            magenta: '#ff79c6',
            cyan: '#8be9fd',
            white: '#f8f8f2'
        }
    },
    dark: {
        background: '#1a1a1a',
        foreground: '#e5e5e5',
        cursor: '#e5e5e5',
        selection: '#4a4a4a',
        colors: {
            black: '#000000',
            red: '#ff5555',
            green: '#50fa7b',
            yellow: '#f1fa8c',
            blue: '#61afef',
            magenta: '#ff79c6',
            cyan: '#8be9fd',
            white: '#e5e5e5'
        }
    },
    cyberpunk: {
        background: '#0d0221',
        foreground: '#00f0ff',
        cursor: '#f9f9f9',
        selection: '#4a4a4a',
        colors: {
            black: '#000000',
            red: '#ff2f9a',
            green: '#34d42f',
            yellow: '#f5f543',
            blue: '#2d6fff',
            magenta: '#ff2f9a',
            cyan: '#00f0ff',
            white: '#f5f5f5'
        }
    },
    monokai: {
        background: '#272822',
        foreground: '#f8f8f2',
        cursor: '#f8f8f2',
        selection: '#49483e',
        colors: {
            black: '#272822',
            red: '#f92672',
            green: '#a6e22e',
            yellow: '#f4bf75',
            blue: '#66d9ef',
            magenta: '#ae81ff',
            cyan: '#a1efe4',
            white: '#f8f8f2'
        }
    },
    solarized: {
        background: '#002b36',
        foreground: '#839496',
        cursor: '#839496',
        selection: '#073642',
        colors: {
            black: '#073642',
            red: '#dc322f',
            green: '#859900',
            yellow: '#b58900',
            blue: '#268bd2',
            magenta: '#d33682',
            cyan: '#2aa198',
            white: '#eee8d5'
        }
    }
};
