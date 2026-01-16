# AkwaFlow - Subscription Manager

## Setup

### Bot Setup
1. Copy `bot/service-account.example.json` to `bot/service-account.json`
2. Fill in your Firebase service account credentials
3. Create `.env` file in `bot/` directory:
TELEGRAM_BOT_TOKEN=your_bot_token
WEB_APP_URL=

### Frontend Setup
1. Install dependencies: `npm install`
2. Run dev server: `npm run dev`
3. Build for production: `npm run build`