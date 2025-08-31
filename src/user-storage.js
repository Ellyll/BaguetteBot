import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'fs';
import logger from './logger.js';

const dbFilePath = './data/users.db';

// Create the database and Users table if it doesn't exist
export function initialiseDatabase() {
  const db = new DatabaseSync(dbFilePath);

  // Check if the Users table exists
  const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Users'`).get();

  if (!tableExists) {
    // Create Users table
    db.exec(`CREATE TABLE Users (
      uid INTEGER PRIMARY KEY AUTOINCREMENT,
      twitch_login TEXT NOT NULL,
      twitch_name TEXT NOT NULL,
      twitch_id TEXT NOT NULL,
      stream_online_message TEXT,
      discord_channel_id TEXT,
      active BOOLEAN NOT NULL
    )`);
    logger.info('Database and Users table created successfully.');
  } else {
    logger.info('Database and Users table already exist.');
  }

  db.close();
}

export function createUser(twitchLogin, twitchName, twitchId, streamOnlineMessage, discordChannelId, active) {
  const db = new DatabaseSync(dbFilePath);
  const stmt = db.prepare(`INSERT INTO Users (twitch_login, twitch_name, twitch_id, stream_online_message, discord_channel_id, active) VALUES (?, ?, ?, ?, ?, ?)`);
  stmt.run(twitchLogin, twitchName, twitchId, streamOnlineMessage, discordChannelId , active ? 1 : 0);
  logger.info(`User with twitch_login ${twitchLogin} created successfully.`);
  db.close();
}

export function getAllUsers() {
  const db = new DatabaseSync(dbFilePath);
  const stmt = db.prepare(`SELECT * FROM Users`);
  const users = stmt.all();
  db.close();
  return users;
}

export function getUserByTwitchId(twitchId) {
  const db = new DatabaseSync(dbFilePath);
  const stmt = db.prepare(`SELECT * FROM Users WHERE twitch_id = ?`);
  const user = stmt.get(twitchId);
  db.close();
  return user; // undefined if not found
}

// Update a user by uid
export function updateUser(uid, twitchLogin, twitchName, twitchId, streamOnlineMessage, discordChannelId, active) {
  const db = new DatabaseSync(dbFilePath);
  const stmt = db.prepare(`UPDATE Users SET twitch_login = ?, twitch_name = ?, twitch_id = ?, stream_online_message = ?, discord_channel_id = ?, active = ? WHERE uid = ?`);
  stmt.run(twitchLogin, twitchName, twitchId, streamOnlineMessage, discordChannelId, active ? 1 : 0, uid);
  logger.info(`User with uid ${uid} updated successfully.`);
  db.close();
}

// Delete a user by uid
export function deleteUser(uid) {
  const db = new DatabaseSync(dbFilePath);
  const stmt = db.prepare(`DELETE FROM Users WHERE uid = ?`);
  stmt.run(uid);
  logger.info(`User with uid ${uid} deleted successfully.`);
  db.close();
}

