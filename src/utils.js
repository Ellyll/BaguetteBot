import 'dotenv/config';
import logger from './logger.js';

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
    },
    ...options
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    logger.error(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    logger.error(err);
  }
}

export async function UninstallGlobalCommands(appId) {
    // API endpoint to overwrite global commands
    const endpoint = `applications/${appId}/commands`;

    try {
        let response = await DiscordRequest(endpoint, { method: 'GET' });
        if (response.ok) {
            let commands = await response.json();

            for (let command of commands) {
                logger.info(`Deleting: ${command.name}`);
                await DiscordRequest(`${endpoint}/${command.id}`, {method: 'DELETE'});
            }
        } else {
            logger.error('Unable to get list of commands: %s', response);
        }
    } catch (err) {
        logger.error(err);
    }
}


// Get my (i.e. the bot's) guilds (aka Discord servers)
export async function GetMyGuilds() {
  const endpoint = `users/@me/guilds`;

  try {
    const response = await DiscordRequest(endpoint, { method: 'GET' });
    if (response.ok) {
      const guilds = await response.json();
      return guilds;
    } else {
      logger.error('Unable to get list of guilds: %s', response);
    }
  } catch (err) {
      logger.error(err);
  }
}


// Get a Discord server's (guild's) channels
export async function GetGuildChannels(guildId) {
  const endpoint = `guilds/${guildId}/channels`;

  try {
    const response = await DiscordRequest(endpoint, { method: 'GET' });
    if (response.ok) {
      const channels = await response.json();
      return channels;
    } else {
      logger.error('Unable to get list of channels for guildId %s: %s', guildId, response);
    }
  } catch (err) {
      logger.error(err);
  }
}



// Simple method that returns a random emoji from list
export function getRandomEmoji() {
  const emojiList = ['😭','😄','😌','🤓','😎','😤','🤖','😶‍🌫️','🌏','📸','💿','👋','🌊','✨'];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
