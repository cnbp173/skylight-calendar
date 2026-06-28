import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCalendarRouter } from './routes/calendar.js';
import { createWeatherRouter } from './routes/weather.js';
import { createAuthRouter } from './routes/auth.js';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', createAuthRouter());
app.use('/api/calendar', createCalendarRouter());
app.use('/api/weather', createWeatherRouter());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Skylight Calendar server running on http://0.0.0.0:${PORT}`);
});
