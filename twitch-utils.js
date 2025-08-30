import 'dotenv/config';

export async function TwitchRequest(endpoint, accessToken, options) {
  // append endpoint to root API URL
  const url = 'https://api.twitch.tv/helix/' + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': `${process.env.TWITCH_CLIENT_ID}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'BaguetteBot (https://github.com/ellyll/BaguetteBot, 1.0.0)',
    },
    ...options
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.error(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}


export async function GetAccessToken() {
    const url = 'https://id.twitch.tv/oauth2/token';
    const params = new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials'
    });

    try {
        const response = await fetch(`${url}?${params}`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const accessToken = data.access_token;
        return accessToken;
    } catch (error) {
        console.error('Error fetching access token:', error.message);
    }
}

export async function GetEventSubscriptions(accessToken) {
  const endpoint = `eventsub/subscriptions`;

  try {
    let response = await TwitchRequest(endpoint, accessToken, { method: 'GET' });
    if (response.ok) {
      let subscriptions = await response.json();
      return subscriptions;
    } else {
      console.error('Unable to get subscriptions', response);
      return null;
    }
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function GetUsersFromLogins(accessToken, userLogins) {
  const params = new URLSearchParams();
  userLogins.forEach(login => params.append('login', login));
  const endpoint = `users?${params}`;

  try {
    let response = await TwitchRequest(endpoint, accessToken, { method: 'GET' });
    if (response.ok) {
      let users = await response.json();
      return users;
    } else {
      console.error('Unable to get users from logins', response);
      return null;
    }
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function GetUsersFromIds(accessToken, userIds) {
  const params = new URLSearchParams();
  userIds.forEach(id => params.append('id', id));
  const endpoint = `users?${params}`;

  try {
    let response = await TwitchRequest(endpoint, accessToken, { method: 'GET' });
    if (response.ok) {
      let users = await response.json();
      return users;
    } else {
      console.error('Unable to get users from ids', response);
      return null;
    }
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function CreateEventSubscription(accessToken, eventType, condition) {
  const endpoint = `eventsub/subscriptions`;

  const subscription = {
    type: eventType,
    version: '1',
    condition: condition,
    transport: {
      method: 'webhook',
      callback: `${process.env.TWITCH_CALLBACK_URL}`,
      secret: `${process.env.TWITCH_CALLBACK_SECRET}`
    }
  };

  try {
    let response = await TwitchRequest(endpoint, accessToken, { method: 'POST', body: subscription });
    if (response.ok) {
      return true;
    } else {
      console.error('Unable to create subscription', response);
      return false;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
}

export async function DeleteEventSubscription(accessToken, subscription_id) {
  const endpoint = `eventsub/subscriptions?id=${subscription_id}`;

  try {
    let response = await TwitchRequest(endpoint, accessToken, { method: 'DELETE' });
    if (response.ok) {
      return true;
    } else {
      console.error('Unable to delete subscription', response);
      return false;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
}

