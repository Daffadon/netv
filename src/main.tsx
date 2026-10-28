import { createRoot } from 'react-dom/client';
import '@cloudflare/kumo/styles/standalone';
import './app.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');

createRoot(root).render(<App />);
