import { getAllUsers, updateUser } from './user-storage.js';
import { GetUsersFromIds } from './twitch-utils.js';
import logger from './logger.js';


export async function UpdateUsersFromTwitch(twitchAccessToken) {

  try {
    // Users from database
    const users = getAllUsers();
    const userIds = users.map(user => user.twitch_id);

    // Users from Twitch
    const twitchUsers = (await GetUsersFromIds(twitchAccessToken, userIds)).data;

    // Get an array of db users to update
    const usersToUpdate = []
    users.forEach(dbUser => {
      const twitchUser = twitchUsers.find(tUser => tUser.id === dbUser.twitch_id);
      if (twitchUser === undefined) {
        logger.info(`User not found in Twitch: uid: ${dbUser.uid}, twitch_id: ${dbUser.twitch_id}, twitch_login: ${dbUser.twitch_login}`);
        // set user active to false
        dbUser.active = false;
        usersToUpdate.push(dbUser);
      } else if (dbUser.twitch_login !== twitchUser.login ||
            dbUser.twitch_name !== twitchUser.display_name ||
            dbUser.active === 0) { // user was inactive (vanished from Twitch) but came back
        logger.info(`User details different from Twitch: uid: ${dbUser.uid}, twitch_id: ${dbUser.twitch_id}, twitch_login: ${dbUser.twitch_login}, twitch_name: ${dbUser.twitch_name}, active: ${dbUser.active}`);
        logger.info(`User details different from Twitch: login: ${twitchUser.login}, display_name: ${twitchUser.display_name}`);
        dbUser.twitch_login = twitchUser.login;
        dbUser.twitch_name = twitchUser.display_name;
        dbUser.active = true;
        usersToUpdate.push(dbUser);
      }
    });

    usersToUpdate.forEach(user => {
      logger.info(`Updating user uid: ${user.uid}, twitch_id: ${user.twitch_id}, twitch_login: ${user.twitch_login}`);
      updateUser(user.uid, user.twitch_login, user.twitch_name, user.twitch_id, user.stream_online_message, user.discord_channel_id, user.active);
    });
  }
  catch (error) {
    logger.error('Error updating users from Twitch: %s', error);
  }
}
