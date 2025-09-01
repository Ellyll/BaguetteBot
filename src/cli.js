import {
  GetAccessToken,
  GetEventSubscriptions,
  GetUsersFromIds,
  GetUsersFromLogins,
  CreateEventSubscription,
  DeleteEventSubscription,
  TwitchRequest
} from './twitch-utils.js';
import { createUser, getAllUsers, getUserByTwitchId, getUserByTwitchLogin, updateUser, deleteUser, initialiseDatabase } from './user-storage.js';
import Table from 'cli-table3';
import { Command } from 'commander';

const program = new Command();

program
  .name('user')
  .description('BaguetteBot User management CLI')
  .version('1.0.0');

/*
program
  .command('add <name>')
  .description('Add a new user')
  .action((name) => {
    console.log(`User ${name} added.`);
  });
*/

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
      const table = new Table();
      table.push(
        { 'Unique Id': user.uid },
        { 'Twitch Login': user.twitch_login },
        { 'Twitch Name': user.twitch_name },
        { 'Twitch Id': user.twitch_id },
        { 'Message': user.stream_online_message },
        { 'ChannelId': user.discord_channel_id },
        { 'Active': user.active },
        { 'URL': `https://twitch.tv/${user.twitch_login}` },
      );
      console.log(table.toString());
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

program.parse(process.argv);

