import React, { useState, useEffect, useCallback } from 'react';

interface CursorProps {
    promptText: string;
}

const Cursor: React.FC<CursorProps> = ({ promptText }) => {
    const [style, setStyle] = useState({});
    const [cursorLetter, setCursorLetter] = useState('');
    const [cursorFromTheRight, setCursorFromTheRight] = useState(0);

    const resetState = useCallback(() => {
        setStyle({});
        setCursorLetter('');
        setCursorFromTheRight(0);
    }, []);

    const updateCursor = useCallback(
        (newValue: number) => {
            setStyle({
                marginLeft: -8 * newValue + 'px'
            });
            setCursorLetter(promptText[promptText.length - newValue]);
        },
        [promptText]
    );

    const handleLeftArrow = useCallback(() => {
        if (cursorFromTheRight < promptText.length) {
            setCursorFromTheRight(prev => {
                const newValue = prev + 1;
                setTimeout(() => updateCursor(newValue), 0);
                return newValue;
            });
        }
    }, [cursorFromTheRight, promptText, updateCursor]);

    const handleRightArrow = useCallback(() => {
        if (cursorFromTheRight > 0) {
            setCursorFromTheRight(prev => {
                const newValue = prev - 1;
                setTimeout(() => updateCursor(newValue), 0);
                return newValue;
            });
        }
    }, [cursorFromTheRight, updateCursor]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
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

    return (
        <span style={style} className="prompt-cursor">
            {cursorLetter}
        </span>
    );
};

export default Cursor;
