import http from 'node:http';
import { createApp } from '../apps/api/dist/app.js';
import { AuthService, InMemorySessionStore, InMemoryUserRepository } from '../services/auth/dist/index.js';

const PORT = 3099;
const userRepository = new InMemoryUserRepository();
const sessionStore = new InMemorySessionStore();
const authService = new AuthService(userRepository, sessionStore);

const app = createApp({
  authService,
});

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`TEST_SERVER_LISTENING:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
