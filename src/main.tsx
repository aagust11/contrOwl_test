import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import PeerApp from './peer/PeerApp';
import './index.css';

const demo = new URLSearchParams(location.search).get('demo') === '1';
createRoot(document.getElementById('root')!).render(demo ? <App /> : <PeerApp />);

