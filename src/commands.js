import 'dotenv/config';
import * as discord from './discord-utils.js';


// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [TEST_COMMAND];

discord.InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
