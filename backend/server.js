const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const playersRouter = require('./routes/players');
const matchesRouter = require('./routes/matches');
const slackRouter = require('./routes/slack');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('../frontend'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/players', playersRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/slack', slackRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MTG Tournament API is running' });
});

app.listen(PORT, () => {
  console.log(`🧙‍♂️ MTG Tournament Server running on port ${PORT}`);
});
