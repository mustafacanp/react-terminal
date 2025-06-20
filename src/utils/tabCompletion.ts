import {
    AppState,
    FileSystemEntry,
    getFirstParameter,
    getSecondParameter,
    navigateToTargetDirectory,
    getMatchingItems,
    isDir
} from './utils';

export interface TabCompletionContext {
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    setPromptValue: (value: string) => void;
    cout: (text: string, breakWord?: boolean) => void;
}

// Tab completion for directory navigation
const handleTabCompletion = (
    originalInput: string,
    command: string,
    targetPath: string,
    childrenFS: { [key: string]: FileSystemEntry },
    matchingItems: string[],
    sudoPrefix: string,
    context: TabCompletionContext
): void => {
    const { setState, setPromptValue, cout } = context;

    if (targetPath.includes('/')) {
        const selectedDir = targetPath.split('/').pop() || '';
        const dir = childrenFS[selectedDir];
        if (isDir(dir)) {
            const newTargetPath = targetPath.split('/').pop()?.toLowerCase() || '';
            const children = Object.keys(dir.children || {});
            const newMatchingItems = children.filter(item =>
                item.toLowerCase().startsWith(newTargetPath.toLowerCase())
            );
            return handleTabCompletion(
                originalInput,
                command,
                newTargetPath,
                dir.children || {},
                newMatchingItems,
                sudoPrefix,
                context
            );
        }
    }

    if (targetPath === '') {
        cout(matchingItems.join('&#09;'), false);
        setState(prev => ({ ...prev, promptText: originalInput }));
        return;
    }

    if (matchingItems.length === 1) {
        const inputWithoutSudo = originalInput.replace('sudo ', '');
        const param2 = getSecondParameter(inputWithoutSudo);
        const parentFolders = param2.substring(0, param2.lastIndexOf('/') + 1);
        const dirSlash = isDir(childrenFS[matchingItems[0]]) ? '/' : '';

        setPromptValue(`${sudoPrefix + command} ${parentFolders}${matchingItems[0]}${dirSlash}`);
    } else if (matchingItems.length > 1) {
        setState(prev => ({ ...prev, tabPressed: true }));
        cout(matchingItems.join('&#09;'), false);
        setState(prev => ({ ...prev, promptText: originalInput }));
    }
};

// Main tab handling logic
export const handleTab = (
    e: KeyboardEvent,
    promptContent: string,
    context: TabCompletionContext
): void => {
    e.preventDefault();

    const input = promptContent;
    const inputWithoutSudo = input.replace('sudo ', '');
    const sudoString = input.startsWith('sudo ') ? 'sudo ' : '';
    const command = getFirstParameter(inputWithoutSudo);
    const param2 = getSecondParameter(inputWithoutSudo);

    // if the command is not a command that supports tab completion, return
    if (!['cd', 'cat', 'rm', 'rmdir', 'touch', 'mkdir'].includes(command)) {
        return;
    }

    // if the input is a command, set the prompt value to the input + space to make it easier to type the next command
    if (['cd', 'cat', 'rm', 'rmdir', 'touch', 'mkdir'].includes(input)) {
        context.setPromptValue(input + ' ');
        return;
    }

    const { targetFS, searchTerm } = navigateToTargetDirectory(context.state, param2);
    const matchingItems = getMatchingItems(targetFS.children || {}, searchTerm);

    handleTabCompletion(
        input,
        command,
        param2,
        targetFS.children || {},
        matchingItems,
        sudoString,
        context
    );
};
