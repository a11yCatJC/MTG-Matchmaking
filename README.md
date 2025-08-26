# MTG-Matchmaking
web app thing that keeps track of scoring during in office leagues


# MTG Tournament System

A web application for managing Magic: The Gathering tournaments across multiple office locations with Slack integration.

## Features

- 🏢 **Multi-Office Support**: Organize players by office (Chicago, New York, Tempe)
- 🎯 **Smart Matchmaking**: Random pairing within offices
- 💬 **Slack Integration**: Join queues and get notifications via Slack
- 🏆 **Prize System**: Automatic rewards for 3 wins or 3 losses per week
- 📊 **Live Leaderboards**: Real-time rankings and statistics
- 📱 **Responsive UI**: Works on desktop and mobile

## Quick Start

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
npm install
```

2. Create a `.env` file with your Slack credentials:
```env
PORT=3000
SLACK_BOT_TOKEN=your_slack_bot_token_here
SLACK_SIGNING_SECRET=your_slack_signing_secret_here
SLACK_APP_TOKEN=your_slack_app_token_here
```

3. Start the backend server:
```bash
npm start
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
npm install
```

2. Start the frontend server:
```bash
npm start
```

3. Open your browser to `http://localhost:8080`

### Slack Bot Setup

1. Create a new Slack app at https://api.slack.com/apps
2. Add the following bot scopes:
   - `chat:write`
   - `commands`
   - `users:read`
3. Create slash commands:
   - `/mtg` with request URL: `http://your-server.com/api/slack/commands`
4. Install the app to your workspace
5. Copy the tokens to your `.env` file

## API Endpoints

### Players
- `GET /api/players` - Get all players
- `GET /api/players/office/:office` - Get players by office
- `POST /api/players` - Add new player
- `GET /api/players/leaderboard/:office?` - Get leaderboard

### Matches
- `POST /api/matches/queue/join` - Join matchmaking queue
- `POST /api/matches/queue/leave` - Leave queue
- `POST /api/matches/:matchId/report` - Report match result

### Slack
- `POST /api/slack/commands` - Handle slash commands

## Slack Commands

- `/mtg join` - Join matchmaking queue
- `/mtg leave` - Leave queue
- `/mtg stats` - View your statistics
- `/mtg leaderboard` - See office rankings

## Database Schema

The app uses SQLite with the following tables:
- `players` - Player information and office assignments
- `matches` - Match results and history
- `matchmaking_queue` - Current queue status
- `prizes` - Prize tracking

## Development

### Adding New Features

1. Backend routes go in `/backend/routes/`
2. Database methods go in `/backend/database.js`
3. Frontend components go in `/frontend/`

### Testing

The app includes sample data for testing. You can:
1. Add players through the web interface
2. Test Slack commands (requires Slack setup)
3. View leaderboards and statistics

## Production Deployment

1. Set up a production database (PostgreSQL recommended)
2. Configure environment variables
3. Set up HTTPS for Slack webhook security
4. Deploy to your preferred platform (Heroku, AWS, etc.)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
```

## Setup Instructions

1. **Create the project structure** as shown above
2. **Install dependencies**:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Set up Slack Bot** (optional for testing):
   - Go to https://api.slack.com/apps
   - Create a new app
   - Add bot scopes and slash commands
   - Copy tokens to `.env` file

4. **Run the application**:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm start
   
   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

5. **Access the app**: Open http://localhost:8080

## Key Features Implemented

✅ **Multi-office player management**
✅ **Responsive web interface**
✅ **SQLite database with sample data**
✅ **RESTful API**
✅ **Leaderboard system**
✅ **Basic Slack integration structure**
✅ **Prize system framework**
✅ **Matchmaking queue system**

The app is fully functional with a beautiful UI and can be extended with additional features like real-time updates, more sophisticated matchmaking, and enhanced Slack integration.
