import 'dotenv/config';
import express from 'express';
import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import {
  GetAccessToken,
  GetEventSubscriptions,
  GetUsersFromLogins,
  CreateEventSubscription,
  DeleteEventSubscription,
  TwitchRequest
} from './twitch-utils.js';
const { createHmac, timingSafeEqual } = await import('node:crypto');
const { readFileSync } = await import('fs');
import { createUser, getAllUsers, updateUser, deleteUser, initialiseDatabase } from './user-storage.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// To keep track of our active games
const activeGames = {};

// Twitch: Notification request headers
const TWITCH_MESSAGE_ID = 'Twitch-Eventsub-Message-Id'.toLowerCase();
const TWITCH_MESSAGE_TIMESTAMP = 'Twitch-Eventsub-Message-Timestamp'.toLowerCase();
const TWITCH_MESSAGE_SIGNATURE = 'Twitch-Eventsub-Message-Signature'.toLowerCase();
const MESSAGE_TYPE = 'Twitch-Eventsub-Message-Type'.toLowerCase();

// Twitch: Notification message types
const MESSAGE_TYPE_VERIFICATION = 'webhook_callback_verification';
const MESSAGE_TYPE_NOTIFICATION = 'notification';
const MESSAGE_TYPE_REVOCATION = 'revocation';

// Twitch: Subscription event types
const TWITCH_EVENT_TYPE_STREAM_ONLINE = 'stream.online';

// Twitch: Prepend this string to the HMAC that's created from the message
const HMAC_PREFIX = 'sha256=';

let twitchAccessToken = null;

app.use(express.raw({ // Need raw message body for signature verification
    type: 'application/json'
}));


/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, type and data
  const { id, type, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              // Fetches a random emoji to send from a helper function
              content: `Hello world! ${getRandomEmoji()}`
            }
          ]
        },
      });
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.get('/test-send-message', async (_req, res) => {
    // Send a message to the discord channel saying hello world
    let response = await DiscordRequest(`channels/${process.env.CHANNEL_ID}/messages`, {
        method: 'POST',
        body: {
            content: 'Hello world!'
        }
    });

    if (!response.ok) {
        console.error('Unable to send message', response);
        return res.status(500).json({ error: 'Unable to send message' });
    }

    res.json({ ok: true });
});

app.post('/twitch-callback', async (req, res) => {
    console.log('Callback received');
    let secret = getSecret();
    let message = getHmacMessage(req);
    let hmac = HMAC_PREFIX + getHmac(secret, message);  // Signature to compare

    if (true === verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
        console.log("signatures match");

        // Get JSON object from body, so you can process the message.
        let notification = JSON.parse(req.body);
        
        if (MESSAGE_TYPE_NOTIFICATION === req.headers[MESSAGE_TYPE]) {

            console.log(`Event type: ${notification.subscription.type}`);
            console.log(JSON.stringify(notification.event, null, 4));

            if (TWITCH_EVENT_TYPE_STREAM_ONLINE === notification.subscription.type) {
              // Post message to Discord
              // Send a message to the discord channel saying hello world
              let user_name = notification.event.broadcaster_user_name;
              let user_login = notification.event.broadcaster_user_login;
              let url = `https://twitch.tv/${user_login}`;
              let message = `The wonderful ${user_name} has gone live, let's go see what they're up to! ${url}`;
              let response = await DiscordRequest(`channels/${process.env.CHANNEL_ID}/messages`, {
                  method: 'POST',
                  body: {
                      content: message
                  }
                });
            }
            
            res.sendStatus(204);
        }
        else if (MESSAGE_TYPE_VERIFICATION === req.headers[MESSAGE_TYPE]) {
            res.set('Content-Type', 'text/plain').status(200).send(notification.challenge);
        }
        else if (MESSAGE_TYPE_REVOCATION === req.headers[MESSAGE_TYPE]) {
            res.sendStatus(204);

            console.log(`${notification.subscription.type} notifications revoked!`);
            console.log(`reason: ${notification.subscription.status}`);
            console.log(`condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`);
        }
        else {
            res.sendStatus(204);
            console.log(`Unknown message type: ${req.headers[MESSAGE_TYPE]}`);
        }
    }
    else {
        console.log('403');    // Signatures didn't match.
        res.sendStatus(403);
    }
})

app.get('/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
});

app.listen(PORT, async () => {
  console.log('Listening on port', PORT);
  initialiseDatabase();

  twitchAccessToken = await GetAccessToken();
  let subscriptionsResponse = await GetEventSubscriptions(twitchAccessToken);
  let subscriptions = subscriptionsResponse.data.filter(sub => sub.type === 'stream.online');
  console.log('subscriptionsResponse', subscriptionsResponse);

  let userIds = getAllUsers().map(user => user.twitch_id);
 
  // go through subs - delete where user id isn't in list
  const subsToDelete =
    subscriptions.filter(sub => sub.status !== 'enabled' || !userIds.some(uId => uId === sub.condition.broadcaster_user_id));
  console.log('subsToDelete', subsToDelete);
  subsToDelete.forEach(async sub => {
    await DeleteEventSubscription(twitchAccessToken, sub.id);
  });

  // go through users - create sub where sub doesn't exist
  const userIdsForSubsToCreate =
    userIds.filter(uId => !subscriptions.some(sub => sub.status === 'enabled' && sub.condition.broadcaster_user_id === uId));
  console.log('userIdsForSubsToCreate', userIdsForSubsToCreate);
  userIdsForSubsToCreate.forEach(async uId => {
    await CreateEventSubscription(twitchAccessToken, 'stream.online', { broadcaster_user_id: uId } );
    console.log(`Created sub for user_id: ${uId}`);
  });
});

// Twitch: get secret
function getSecret() {
    // This is the secret you pass when you subscribed to the event.
    return process.env.TWITCH_CALLBACK_SECRET;
}

// Twitch: Build the message used to get the HMAC.
function getHmacMessage(request) {
    return (request.headers[TWITCH_MESSAGE_ID] + 
        request.headers[TWITCH_MESSAGE_TIMESTAMP] + 
        request.body);
}

// Twitch: Get the HMAC.
function getHmac(secret, message) {
    return createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

// Twitch: Verify whether our hash matches the hash that Twitch passed in the header.
function verifyMessage(hmac, verifySignature) {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(verifySignature));
}
