import 'dotenv/config';

import * as discord from './discord-utils.js';

discord.UninstallGlobalCommands(process.env.APP_ID);
