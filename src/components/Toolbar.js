import React, { Component } from 'react';

class Toolbar extends Component {
	constructor(props) {
		super();
		this.user_name = props.settings.user_name;
		this.computer_name = props.settings.computer_name;
		this.pwd = props.pwd;

		document.addEventListener('fullscreenchange', this.exitFullscreen);
		document.addEventListener('webkitfullscreenchange', this.exitFullscreen);
		document.addEventListener('mozfullscreenchange', this.exitFullscreen);
		document.addEventListener('MSFullscreenChange', this.exitFullscreen);
	}

	exitFullscreen() {
		if (
			!document.fullscreenElement &&
			!document.webkitIsFullScreen &&
			!document.mozFullScreen &&
			!document.msFullscreenElement
		) {
			document.querySelector('.terminal').style.height = '524px';
			document.querySelector('.terminal').style.width = '818px';
			document.querySelector('.terminal').style.top = 'auto';
			document.querySelector('.terminal-body-container').style.height = '500px';
		}
	}

	requestFullScreen() {
		const isMobileOrTablet = window.matchMedia(
			'screen and (max-width: 991px)'
		).matches;
		if (!isMobileOrTablet) {
			const isInFullScreen =
				document.fullscreenElement ||
				document.webkitFullscreenElement ||
				document.mozFullScreenElement ||
				document.msFullscreenElement;
			const docElm = document.documentElement;
			if (!isInFullScreen) {
				document.querySelector('.terminal').style.height =
					window.screen.height - 25 + 'px';
				document.querySelector('.terminal').style.width =
					window.screen.width + 'px';
				document.querySelector('.terminal').style.top = '0';
				document.querySelector('.terminal-body-container').style.height =
					window.screen.height - 25 + 'px';
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
				document.querySelector('.terminal').style.height = '524px';
				document.querySelector('.terminal').style.width = '818px';
				document.querySelector('.terminal').style.top = 'auto';
				document.querySelector('.terminal-body-container').style.height =
					'500px';
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
	}

	render() {
		return (
			<div
				className="terminal-toolbar"
				onDoubleClick={() => this.requestFullScreen()}
			>
				<div className="toolbar-buttons">
					<button
						className="toolbar-button toolbar-button--exit"
						onClick={() => {
							alert('You shall not exit!');
						}}
					>
						&#10005;
					</button>
					<button className="toolbar-button">&#9472;</button>
					<button
						className="toolbar-button"
						onClick={() => this.requestFullScreen()}
					>
						&#9723;
					</button>
				</div>
				<p className="toolbar-user">
					{this.user_name}@{this.computer_name}:{this.pwd}
				</p>
			</div>
		);
	}
}

export default Toolbar;
