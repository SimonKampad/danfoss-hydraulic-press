import { io } from 'socket.io-client';

// Dynamically connect to port 5000 on current hostname or fallback to localhost:5000
const getBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

export const socket = io(getBackendUrl(), {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 20,
  reconnectionDelay: 500,
});
