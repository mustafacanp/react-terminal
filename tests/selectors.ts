// Shared CSS selectors for React Terminal Emulator tests
export const SELECTORS = {
    // Main containers
    terminal: '.terminal',
    terminalBody: '.terminal-body',
    terminalBodyContainer: '.terminal-body-container',

    // Toolbar
    toolbar: '.terminal-toolbar',
    toolbarButtons: '.toolbar-buttons',
    toolbarButton: '.toolbar-button',
    toolbarUser: '.toolbar-user',

    // Prompt and input
    terminalPrompt: '.terminal-prompt',
    promptInput: '.prompt-input',
    promptText: '.prompt-text',
    promptUser: '.prompt-user',
    promptLocation: '.prompt-location',
    promptDollar: '.prompt-dollar',
    promptCursor: '.prompt-cursor',

    // File types
    typeDirectory: '.type-directory',
    typeFile: '.type-file',

    // Command output types (based on actual HTML structure)
    commandInput: '.prompt-text', // cin input (without ml-0)
    commandOutput: '.prompt-text.ml-0', // cout output

    // Layout
    container: '.container',
    app: '.App'
} as const;

// Compound selectors for common operations
export const COMPOUND_SELECTORS = {
    // Command history
    commandHistory: `${SELECTORS.terminalBody} ${SELECTORS.terminalPrompt} ${SELECTORS.promptText}`
} as const;

// Helper functions for dynamic selectors
export const selectorHelpers = {
    // Get selector for text content
    withText: (text: string) => `text=${text}`,

    // Get selector for command output
    commandOutput: (command: string) => `${SELECTORS.terminalBody} >> text=${command}`,

    // Get selector for error messages
    errorMessage: (error: string) => `${SELECTORS.terminalBody} >> text=${error}`,

    // Get nth element of a type
    nthElement: (selector: string, index: number) => `${selector}:nth-child(${index})`
};
