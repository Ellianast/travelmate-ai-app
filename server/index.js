import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../dist');

const destinationCatalog = [
  { name: 'Paris', country: 'France', region: 'Europe', description: 'Romantic city breaks and culinary classics.', bestFor: ['Culture', 'Food'] },
  { name: 'Kyoto', country: 'Japan', region: 'Asia', description: 'Temples, tea houses and beautiful seasonal landscapes.', bestFor: ['Culture', 'Nature'] },
  { name: 'Bali', country: 'Indonesia', region: 'Southeast Asia', description: 'Beachside relaxation and a laid-back tropical rhythm.', bestFor: ['Beach', 'Wellness'] },
  { name: 'Reykjavík', country: 'Iceland', region: 'Europe', description: 'Adventure travel with thermal pools and scenic drives.', bestFor: ['Adventure', 'Nature'] },
  { name: 'Marrakech', country: 'Morocco', region: 'Africa', description: 'Colorful souks, rooftop dining and desert day trips.', bestFor: ['Food', 'Culture'] },
  { name: 'Lisbon', country: 'Portugal', region: 'Europe', description: 'Coastal city culture, music and excellent food.', bestFor: ['Food', 'City Break'] },
];

const buildDemoTripPlan = (payload = {}) => {
  const destination = payload.destination || 'Paris';
  const travelers = Number(payload.travelers || 2);
  const budget = Number(payload.budget || 2200);
  const duration = Number(payload.duration || 5);
  const style = payload.style || 'Adventure';
  const interests = Array.isArray(payload.interests) && payload.interests.length ? payload.interests : ['Culture', 'Food'];

  return {
    title: `${destination} itinerary`,
    summary: `A ${style.toLowerCase()}-focused ${duration}-day trip for ${travelers} traveler(s), curated around ${interests.join(', ')} and a balanced ${budget > 3000 ? 'premium' : 'smart'} budget.`,
    highlights: [
      `Best local experiences in ${destination}`,
      `${interests.slice(0, 2).join(' + ')} based recommendations`,
      'Balanced pacing with free time and iconic stops',
    ],
    perfectFor: interests,
    estimatedBudget: Math.round(budget * 0.9),
    route: `${destination} • curated city and cultural route`,
  };
};

const createWeatherForecast = (city, days = 5) => {
  const base = [
    { condition: 'Sunny', high: 27, low: 19, precipitation: 10 },
    { condition: 'Partly Cloudy', high: 29, low: 20, precipitation: 20 },
    { condition: 'Warm', high: 25, low: 18, precipitation: 15 },
    { condition: 'Light Rain', high: 23, low: 17, precipitation: 45 },
    { condition: 'Clear', high: 30, low: 21, precipitation: 8 },
  ];

  return Array.from({ length: Number(days) || 5 }, (_, index) => ({
    date: `Day ${index + 1}`,
    condition: base[index % base.length].condition,
    temperature: {
      high: base[index % base.length].high + (city.length % 3),
      low: base[index % base.length].low + (city.length % 2),
    },
    precipitation: base[index % base.length].precipitation,
  }));
};

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'TravelMate AI backend is running.',
    demoMode: !process.env.OPENAI_API_KEY && !process.env.WEATHER_API_KEY,
  });
});

app.get('/api/destinations', (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  const results = !query
    ? destinationCatalog
    : destinationCatalog.filter((item) =>
        item.name.toLowerCase().includes(query) ||
        item.country.toLowerCase().includes(query) ||
        item.bestFor.some((tag) => tag.toLowerCase().includes(query)),
      );

  res.json({ destinations: results });
});

app.post('/api/trip-plan', async (req, res) => {
  const payload = req.body || {};

  if (process.env.OPENAI_API_KEY) {
    try {
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a travel planner. Return valid JSON with title, summary, highlights, perfectFor, estimatedBudget, route fields only.',
            },
            {
              role: 'user',
              content: JSON.stringify(payload),
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (aiResponse.ok) {
        const data = await aiResponse.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return res.json(JSON.parse(content));
        }
      }
    } catch (error) {
      console.warn('OpenAI API failed, falling back to demo trip planner.', error);
    }
  }

  res.json(buildDemoTripPlan(payload));
});

app.get('/api/weather', async (req, res) => {
  const city = String(req.query.city || 'Paris');
  const days = Number(req.query.days || 5);

  if (process.env.WEATHER_API_KEY) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${process.env.WEATHER_API_KEY}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const items = data.list?.slice(0, days) || [];
        const forecast = items.map((entry) => ({
          date: new Date(entry.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
          condition: entry.weather?.[0]?.main || 'Clear',
          temperature: {
            high: Math.round(entry.main.temp_max),
            low: Math.round(entry.main.temp_min),
          },
          precipitation: Math.max(0, Math.min(100, Number(entry.pop || 0) * 100)),
        }));
        return res.json({ city, days: forecast });
      }
    } catch (error) {
      console.warn('Weather API failed, falling back to demo weather.', error);
    }
  }

  res.json({ city, days: createWeatherForecast(city, days) });
});

// Serve the compiled React app from the same service in production.
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TravelMate AI backend running on http://localhost:${PORT}`);
});
