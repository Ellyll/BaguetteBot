import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'fs';

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
      discord_channel_id TEST,
      active BOOLEAN NOT NULL
    )`);
    console.log("Database and Users table created successfully.");
  } else {
    console.log("Database and Users table already exist.");
  }

  db.close();
}

export function createUser(twitchLogin, twitchName, twitchId, streamOnlineMessage, discordChannelId, active) {
  const db = new DatabaseSync(dbFilePath);
  const stmt = db.prepare(`INSERT INTO Users (twitch_login, twitch_name, twitch_id, stream_online_message, discord_channel_id, active) VALUES (?, ?, ?, ?, ?, ?)`);
  stmt.run(twitchLogin, twitchName, twitchId, streamOnlineMessage, discordChannelId , active ? 1 : 0);
  console.log("User created successfully.");
  db.close();
}

export function getAllUsers() {
  const db = new DatabaseSync(dbFilePath);
  const stmt = db.prepare(`SELECT * FROM Users`);
  const users = stmt.all();
  db.close();
  return users;
}

// Update a user by uid
export function updateUser(uid, twitchLogin, twitchName, twitchId, streamOnlineMessage, discordChannelId, active) {
  const db = new DatabaseSync(dbFilePath);
  const stmt = db.prepare(`UPDATE Users SET twitch_login = ?, twitch_name = ?, twitch_id = ?, stream_online_message = ?, discord_channel_id = ?, active = ? WHERE uid = ?`);
  stmt.run(twitchLogin, twitchName, twitchId, streamOnlineMessage, discordChannelId, active, uid);
  console.log("User updated successfully.");
  db.close();
}

// Delete a user by uid
export function deleteUser(uid) {
  const db = new DatabaseSync(dbFilePath);
  const stmt = db.prepare(`DELETE FROM Users WHERE uid = ?`);
  stmt.run(uid);
  console.log("User deleted successfully.");
  db.close();
}

