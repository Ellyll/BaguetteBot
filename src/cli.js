import * as twitch from './twitch-utils.js';
import { GetMyGuilds, GetGuildChannels } from './discord-utils.js';
import { createUser, getAllUsers, getUserByTwitchId, getUserByTwitchLogin, updateUser, deleteUser, initialiseDatabase } from './user-storage.js';
import Table from 'cli-table3';
import { Command } from 'commander';
import readline from 'readline';
import * as userService from './user-service.js';

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
      process.exit(1);
    }

    // Try get user from twitch
    let twitchAccessToken = await GetAccessToken();
    let twitchUser = undefined;
    twitchUser = await twitch.GetUserFromLogin(twitchAccessToken, searchLogin);
    if (twitchUser === undefined) {
      console.error(`User ${searchLogin} not found on Twitch`);
      process.exit(1);
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
        process.exit(1);
      }
      channelId = channel.id;
      channelName = channel.name;
    }

    createUser(twitchUser.login, twitchUser.display_name, twitchUser.id, message, channelId, true);
    console.log(`User ${searchLogin} added.`);
    const user = getUserByTwitchLogin(twitchUser.login);

    await twitch.CreateEventSubscription(twitchAccessToken, 'stream.online', { broadcaster_user_id: twitchUser.id } );
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


program
  .command('edit')
  .description('Edit an existing user')
  .argument('<login>', 'Twitch login of user to edit')
  .option('-m, --message <message>', 'custom stream online message')
  .option('-c, --channel <message>', 'custom discord channel name or ID')
  .action(async (login, options) => {
    if (options.message === undefined && options.channel === undefined) {
      console.error('--message or --channel must be given');
      process.exit(1);
    }

    const searchLogin = login.startsWith('@') ? login.substring(1) : login;

    // Check user exists
    const user = getUserByTwitchLogin(searchLogin);
    if (user === undefined) {
      console.error(`User ${searchLogin} does not exist`);
      process.exit(1);
    }

    // Try get user from twitch
    let twitchAccessToken = await twitch.GetAccessToken();
    let twitchUser = undefined;
    twitchUser = await twitch.GetUserFromLogin(twitchAccessToken, searchLogin);
    if (twitchUser === undefined) {
      console.error(`User ${searchLogin} not found on Twitch`);
      process.exit(1);
    }

    // Message needs to be same if it's not supplied, if it's an empty string we set it to null to clear it
    const message = options.message === undefined ? user.stream_online_message : (options.message === '' ? null : options.message);

    // if channel not specified, get current channel if specified in db, otherwise we set channelId to null
    // if channel specified, try to get the channel, if successfull set channelId and channelName, otherwise error
    let channelId = null;
    let channelName = null;
    if ((!user.discord_channel_id && options.channel === undefined) || options.channel === '' ) {
      channelId = null;
      channelName = null;
    } else {
      let searchChannel;
      if (user.discord_channel_id && !options.channel)
        searchChannel = user.discord_channel_id;
      else
        searchChannel = options.channel.startsWith('#') ? options.channel.substring(1) : options.channel;
      
      const guilds = await GetMyGuilds();
      // Assume first guild is the one we want - will need to change stuff if we need to support more than one discord
      const guildId = guilds[0].id;
      const channels = await GetGuildChannels(guildId);

      const channel = channels.find(channel => channel.id === searchChannel || channel.name === searchChannel);
      if (channel === undefined) {
        console.error(`Channel ${searchChannel} not found on Discord`);
        process.exit(1);
      }
      channelId = channel.id;
      channelName = channel.name;
    }

    updateUser(user.uid, twitchUser.login, twitchUser.display_name, twitchUser.id, message, channelId, user.active);
    console.log(`User ${searchLogin} updated.`);
    const updatedUser = getUserByTwitchLogin(twitchUser.login);

    displayUser(updatedUser);
  });


program
  .command('disable <login>')
  .description('Disable a user')
  .action((login) => {
    const searchLogin = login.startsWith('@') ? login.substring(1) : login;

    // Check user exists
    const user = getUserByTwitchLogin(searchLogin);
    if (user === undefined) {
      console.error(`User ${searchLogin} does not exist`);
      process.exit(1);
    }

    if (!user.active) {
      console.warn(`User ${searchLogin} is already disabled`);
      return;
    }

    updateUser(user.uid, user.twitch_login, user.twitch_name, user.twitch_id, user.stream_online_message, user.discord_channel_id, false);
    console.log(`User ${searchLogin} has been disabled.`);
  });


program
  .command('enable <login>')
  .description('Enable a user')
  .action((login) => {
    const searchLogin = login.startsWith('@') ? login.substring(1) : login;

    // Check user exists
    const user = getUserByTwitchLogin(searchLogin);
    if (user === undefined) {
      console.error(`User ${searchLogin} does not exist`);
      process.exit(1);
    }

    if (user.active) {
      console.warn(`User ${searchLogin} is already enabled`);
      return;
    }

    updateUser(user.uid, user.twitch_login, user.twitch_name, user.twitch_id, user.stream_online_message, user.discord_channel_id, true);
    console.log(`User ${searchLogin} has been enabled.`);
  });


program
  .command('delete <login>')
  .description('Delete a user')
  .option('-y, --yes', 'don\'t ask for confirmation')
  .action((login, options) => {
    const searchLogin = login.startsWith('@') ? login.substring(1) : login;

    // Check user exists
    const user = getUserByTwitchLogin(searchLogin);
    if (user === undefined) {
      console.error(`User ${searchLogin} does not exist`);
      process.exit(1);
    }

    // Ask for confirmation if -y or --yes is not given
    if (!options.yes) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(`Are you sure you want to delete user ${searchLogin}? (yes/no) `, (answer) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          deleteUser(user.uid);
          console.log(`User ${searchLogin} has been deleted.`);
        } else {
          console.log('User deletion canceled.');
        }
        rl.close();
      });
    } else {
      // Proceed with deletion if -y or --yes is given
      deleteUser(user.uid);
      // TODO: delete any event subscriptions
      console.log(`User ${searchLogin} has been deleted.`);
    }
  });


program
  .command('update-users')
  .description('Update users from Twitch')
  .action(async () => {
    let twitchAccessToken = await twitch.GetAccessToken();
    userService.UpdateUsersFromTwitch(twitchAccessToken);
    console.log(`Users updated from Twitch.`);
  });


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

