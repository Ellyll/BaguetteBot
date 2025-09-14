import 'dotenv/config';

import {InstallGlobalCommands, UninstallGlobalCommands} from './discord-utils.js';

UninstallGlobalCommands(process.env.APP_ID);
