import io from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  if (socket) return socket;

  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  
  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', () => console.log('Socket disconnected'));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
