import React, { useState, useEffect, useCallback } from 'react';

interface Props {
    promptText: string;
}

const CursorWithText: React.FC<Props> = ({ promptText }) => {
    const [isBlinking, setIsBlinking] = useState(false);
    const [cursorLetter, setCursorLetter] = useState('');
    const [cursorFromTheRight, setCursorFromTheRight] = useState(0);

    const resetState = useCallback(() => {
        setCursorLetter('');
        setCursorFromTheRight(0);
    }, []);

    const updateCursor = useCallback(
        (newIndex: number) => {
            setCursorLetter(promptText[promptText.length - newIndex]);
        },
        [promptText]
    );

    const handleLeftArrow = useCallback(() => {
        if (cursorFromTheRight < promptText.length) {
            setCursorFromTheRight(prev => {
                const newIndex = prev + 1;
                setTimeout(() => updateCursor(newIndex), 0);
                return newIndex;
            });
        }
    }, [cursorFromTheRight, promptText, updateCursor]);

    const handleRightArrow = useCallback(() => {
        if (cursorFromTheRight > 0) {
            setCursorFromTheRight(prev => {
                const newIndex = prev - 1;
                setTimeout(() => updateCursor(newIndex), 0);
                return newIndex;
            });
        }
    }, [cursorFromTheRight, updateCursor]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.ctrlKey || e.altKey) {
                e.preventDefault();
                return;
            }
            setIsBlinking(false);
            setTimeout(() => {
                setIsBlinking(true);
            }, 600);
            // Handles non-printable chars.
            switch (e.key) {
                case 'ArrowLeft':
                    handleLeftArrow();
                    break;
                case 'ArrowRight':
                    handleRightArrow();
                    break;
                case 'Delete':
                    handleRightArrow();
                    break;
                default:
                    break;
            }
        },
        [handleLeftArrow, handleRightArrow]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    // Reset state when promptText is empty
    useEffect(() => {
        if (promptText.length === 0 && cursorFromTheRight !== 0) {
            resetState();
        }
    }, [promptText.length, cursorFromTheRight, resetState]);

    const userSelectStyle = cursorFromTheRight === 0 ? { userSelect: 'none' as const } : {};

    return (
        <>
            {promptText.slice(0, promptText.length - cursorFromTheRight)}
            <span className={`prompt-cursor ${isBlinking ? 'blink' : ''}`} style={userSelectStyle}>
                {cursorLetter || ' '}
            </span>
            {promptText.slice(promptText.length - cursorFromTheRight + 1)}
        </>
    );
};

export default CursorWithText;
