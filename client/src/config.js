// Socket.IO server configuration
const getServerUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  return process.env.REACT_APP_SERVER_URL || 'http://192.168.86.59:3001';
};

export const SERVER_URL = getServerUrl();

const config = {
  serverUrl: SERVER_URL,
  socketOptions: {
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    forceNew: true,
    withCredentials: true,
    path: '/socket.io/'
  }
};

export default config;
