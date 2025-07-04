import React, { useEffect, useCallback } from 'react';

interface ToolbarProps {
    settings: {
        userName: string;
        computerName: string;
    };
    pwd: string;
    onReset: () => void;
}

// Extend Document interface for fullscreen API
declare global {
    interface Document {
        webkitIsFullScreen?: boolean;
        mozFullScreen?: boolean;
        msFullscreenElement?: Element;
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        webkitExitFullscreen?: () => void;
        mozCancelFullScreen?: () => void;
        msExitFullscreen?: () => void;
    }

    interface HTMLElement {
        mozRequestFullScreen?: () => void;
        webkitRequestFullScreen?: () => void;
        msRequestFullscreen?: () => void;
    }
}

const Toolbar: React.FC<ToolbarProps> = ({ settings, pwd, onReset }) => {
    const { userName, computerName } = settings;

    const exitFullscreen = useCallback(() => {
        if (
            !document.fullscreenElement &&
            !document.webkitIsFullScreen &&
            !document.mozFullScreen &&
            !document.msFullscreenElement
        ) {
            const terminal = document.querySelector('.terminal') as HTMLElement;
            const terminalBody = document.querySelector('.terminal-body-container') as HTMLElement;

            if (terminal) {
                terminal.style.height = '624px';
                terminal.style.width = '830px';
                terminal.style.top = 'auto';
            }
            if (terminalBody) {
                terminalBody.style.height = '600px';
            }
        }
    }, []);

    const requestFullScreen = () => {
        const isMobileOrTablet = window.matchMedia('screen and (max-width: 991px)').matches;
        if (!isMobileOrTablet) {
            const isInFullScreen =
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement;
            const docElm = document.documentElement;
            if (!isInFullScreen) {
                const terminal = document.querySelector('.terminal') as HTMLElement;
                const terminalBody = document.querySelector(
                    '.terminal-body-container'
                ) as HTMLElement;

                if (terminal) {
                    terminal.style.height = window.screen.height - 25 + 'px';
                    terminal.style.width = window.innerWidth + 'px';
                    terminal.style.top = '0';
                }
                if (terminalBody) {
                    terminalBody.style.height = window.screen.height - 25 + 'px';
                }
                if (docElm.requestFullscreen) {
                    docElm.requestFullscreen();
                } else if (docElm.mozRequestFullScreen) {
                    docElm.mozRequestFullScreen();
                } else if (docElm.webkitRequestFullScreen) {
                    docElm.webkitRequestFullScreen();
                } else if (docElm.msRequestFullscreen) {
                    docElm.msRequestFullscreen();
                }
            } else {
                const terminal = document.querySelector('.terminal') as HTMLElement;
                const terminalBody = document.querySelector(
                    '.terminal-body-container'
                ) as HTMLElement;

                if (terminal) {
                    terminal.style.height = '624px';
                    terminal.style.width = '830px';
                    terminal.style.top = 'auto';
                }
                if (terminalBody) {
                    terminalBody.style.height = '600px';
                }
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        }
    };

    useEffect(() => {
        document.addEventListener('fullscreenchange', exitFullscreen);
        document.addEventListener('webkitfullscreenchange', exitFullscreen);
        document.addEventListener('mozfullscreenchange', exitFullscreen);
        document.addEventListener('MSFullscreenChange', exitFullscreen);

        return () => {
            document.removeEventListener('fullscreenchange', exitFullscreen);
            document.removeEventListener('webkitfullscreenchange', exitFullscreen);
            document.removeEventListener('mozfullscreenchange', exitFullscreen);
            document.removeEventListener('MSFullscreenChange', exitFullscreen);
        };
    }, [exitFullscreen]);

    return (
        <div className="terminal-toolbar" onDoubleClick={requestFullScreen}>
            <p className="toolbar-user">
                {userName}@{computerName}:{pwd}
            </p>
            <div className="toolbar-buttons">
                <button className="toolbar-button">—</button>
                <button className="toolbar-button" onClick={requestFullScreen}>
                    ❐
                </button>
                <button
                    className="toolbar-button toolbar-button--exit"
                    onClick={() => {
                        if (window.confirm('Are you sure you want to reset the terminal?')) {
                            onReset();
                        }
                    }}
                >
                    &#10005;
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
