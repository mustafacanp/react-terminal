import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';

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
