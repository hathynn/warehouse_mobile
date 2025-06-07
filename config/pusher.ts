// src/config/pusher.ts
import Pusher from 'pusher-js';
import api from '@/config/api';

// You may want to load these from env vars in production
const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER;
/**
 * Create a Pusher client configured for authenticated private channels
 * Uses the same API instance as the rest of the application to handle authentication
 */
export function createPusherClient() {
  console.log("PUSHER_KEY", PUSHER_KEY);
  console.log("PUSHER_CLUSTER", PUSHER_CLUSTER);
  return new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    // Enable authenticated private channels
    authorizer: (channel) => {
      return {
        authorize: (socketId, callback) => {
          // Use the same API instance that handles token refresh
          api.post('/pusher/auth', {
            socket_id: socketId,
            channel_name: channel.name
          })
          .then(response => {
            // Forward the auth token to Pusher
            const auth = response.data.content.auth;
            const parsedAuth = JSON.parse(auth);
            callback(null, { auth: parsedAuth.auth });
          })
          .catch(error => {
            callback(new Error(`Couldn't authenticate Pusher for ${channel.name}`), { auth: '' });
          });
        }
      };
    }
  });
}
