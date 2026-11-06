import http from 'node:http';
import { handleApiRequest } from './routes/api-router.ts';

const PORT = Number(process.env.PORT) || 4000;

const server = http.createServer((req, res) => {
  handleApiRequest(req, res);
});

server.listen(PORT, () => {
  console.log(`💍 wedding-api backend listening on http://localhost:${PORT}`);
});
