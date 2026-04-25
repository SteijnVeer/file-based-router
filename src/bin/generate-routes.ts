import { resolve } from 'path';
import '../index.js';
import { importFile } from '../utils/path.js';
import { writeFbrFile } from '../utils/router.js';

Fbr.server.start = async () => {};

await importFile(Fbr.config.paths.buildDir, 'main.js');

const rootDir = resolve(Fbr.config.paths.buildDir, Fbr.config.router.routesDir);
const outPath = await writeFbrFile(rootDir);
Fbr.log.info(`fbr.js written → ${outPath}`);
