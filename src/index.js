import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './scenes/Home/';
import * as serviceWorker from './serviceWorker';

window.isTouchDevice = () =>
  navigator.maxTouchPoints || 'ontouchstart' in document.documentElement;

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
