
import {
  GetAccessToken,
  GetEventSubscriptions,
  GetUsersFromIds,
  GetUsersFromLogins,
  GetUserFromLogin,
  CreateEventSubscription,
  DeleteEventSubscription,
  TwitchRequest
} from './twitch-utils.js';
import { GetMyGuilds, GetGuildChannels } from './utils.js';

import { createUser, getAllUsers, getUserByTwitchId, getUserByTwitchLogin, updateUser, deleteUser, initialiseDatabase } from './user-storage.js';
import Table from 'cli-table3';
import { Command } from 'commander';

const program = new Command();

program
  .name('user')
  .description('BaguetteBot User management CLI')
  .version('1.0.0');


program
  .command('add')
  .description('Add a new user')
  .argument('<login>', 'Twitch login of user to add')
  .option('-m, --message <message>', 'custom stream online message')
  .option('-c, --channel <message>', 'custom discord channel name or ID')
  .action(async (login, options) => {
    const searchLogin = login.startsWith('@') ? login.substring(1) : login;

    // Check user doesn't already exist
    if (getUserByTwitchLogin(searchLogin) !== undefined) {
      console.error(`User ${searchLogin} already exists`);
      return 1;
    }

    // Try get user from twitch
    let twitchAccessToken = await GetAccessToken();
    let twitchUser = undefined;
    twitchUser = await GetUserFromLogin(twitchAccessToken, searchLogin);
    if (twitchUser === undefined) {
      console.error(`User ${searchLogin} not found on Twitch`);
      return 1;
    }

    // Message needs to be null if it's not supplied
    const message = options.message === undefined ? null : options.message;


    // If a channel has been specified, check it exists and get its details
    let channelId = null;
    let channelName = null;
    if (options.channel !== undefined) {
      const guilds = await GetMyGuilds();
      // Assume first guild is the one we want - will need to change stuff if we need to support more than one discord
      const guildId = guilds[0].id;
      const channels = await GetGuildChannels(guildId);

      const searchChannel = options.channel.startsWith('#') ? options.channel.substring(1) : options.channel;
      const channel = channels.find(channel => channel.id === searchChannel || channel.name === searchChannel);
      if (channel === undefined) {
        console.error(`Channel ${searchChannel} not found on Discord`);
        return 1;
      }
      channelId = channel.id;
      channelName = channel.name;
    }

    createUser(twitchUser.login, twitchUser.display_name, twitchUser.id, message, channelId, true);
    console.log(`User ${searchLogin} added.`);
    const user = getUserByTwitchLogin(twitchUser.login);

    await CreateEventSubscription(twitchAccessToken, 'stream.online', { broadcaster_user_id: twitchUser.id } );
    console.log(`Created sub for user_id: ${twitchUser.id}`);

    displayUser(user);
  });


program
  .command('list')
  .description('List all users')
  .action(() => {
    console.log('Listing all users...');
    const users = getAllUsers();
    const table = new Table({
      head: [ 'Login', 'Message', 'ChannelId' ]
    });
    const usersTable = users.map(user => ([
      user.twitch_login,
      user.stream_online_message,
      user.discord_channel_id
    ]));
    console.log(usersTable);
    table.push(...usersTable);
    console.log(table.toString());
  });


program
  .command('show <login>')
  .description('Show information about a user')
  .action((login) => {
    const user = getUserByTwitchLogin(login);
    if (user) {
      console.log(`Showing information about ${login}...`);
      displayUser(user);
    } else {
      console.error(`User with login ${login} was not found!`);
    }
  });


/*
program
  .command('edit <id> <name>')
  .description('Edit an existing user')
  .action((id, name) => {
    console.log(`User ${id} updated to ${name}.`);
  });

program
  .command('disable <id>')
  .description('Disable a user')
  .action((id) => {
    console.log(`User ${id} disabled.`);
  });

program
  .command('enable <id>')
  .description('Enable a user')
  .action((id) => {
    console.log(`User ${id} enabled.`);
  });

program
  .command('delete <id>')
  .description('Delete a user')
  .action((id) => {
    console.log(`User ${id} deleted.`);
  });
*/

function displayUser(twitchUser) {
  const table = new Table();
  table.push(
    { 'Unique Id': twitchUser.uid },
    { 'Twitch Login': twitchUser.twitch_login },
    { 'Twitch Name': twitchUser.twitch_name },
    { 'Twitch Id': twitchUser.twitch_id },
    { 'Message': twitchUser.stream_online_message },
    { 'ChannelId': twitchUser.discord_channel_id },
    { 'Active': twitchUser.active },
    { 'URL': `https://twitch.tv/${twitchUser.twitch_login}` },
  );
  console.log(table.toString());
}


program.parse(process.argv);

