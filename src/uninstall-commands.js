import 'dotenv/config';

import {InstallGlobalCommands, UninstallGlobalCommands} from './utils.js';

UninstallGlobalCommands(process.env.APP_ID);