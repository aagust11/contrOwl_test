import { mkdirSync, copyFileSync } from 'node:fs';
mkdirSync('dist/administration', { recursive: true });
copyFileSync('dist/index.html', 'dist/administration/index.html');
