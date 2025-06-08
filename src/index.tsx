import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import * as serviceWorker from './serviceWorker.js';

declare global {
	interface Window {
		isTouchDevice: () => boolean;
	}
}

window.isTouchDevice = () =>
	Boolean(navigator.maxTouchPoints) ||
	'ontouchstart' in document.documentElement;

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

const root = createRoot(container);
root.render(<App />);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
