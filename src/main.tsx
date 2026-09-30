import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import LiveApp from './live/LiveApp';
import './index.css';

const demo = new URLSearchParams(location.search).get('demo') === '1';
createRoot(document.getElementById('root')!).render(demo ? <App /> : <LiveApp />);
