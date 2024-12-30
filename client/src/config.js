// Socket.IO server configuration
export const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://192.168.86.59:3001';

const config = {
  serverUrl: SERVER_URL,
  socketOptions: {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    forceNew: true,
    withCredentials: true,
    extraHeaders: {
      'Access-Control-Allow-Credentials': 'true'
    }
  }
};

export default config;
