
<div align="left">
  <img src="public/akwaflow-logo.png" alt="AkwaFlow Logo" width="120" />
</div>

# AkwaFlow

![Status](https://img.shields.io/badge/status-live-success?style=flat-square)
![Version](https://img.shields.io/badge/version-1.2.0-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

> Because tracking subscriptions shouldn't be a subscription to stress

Hey there! This is **AkwaFlow** — my take on a subscription management app that actually makes sense. You know that feeling when you're paying for Netflix, Spotify, YouTube Premium, and like 10 other services, but you have no idea how much you're actually spending? Yeah, me too. So I built this.

<div align="center">
  <video src="https://github.com/user-attachments/assets/f56be828-ffd7-40b4-805e-a19738458982" width="49%" controls></video>
  <video src="https://github.com/user-attachments/assets/3a2c2131-4a41-44f6-b37b-f1814abf2b1e" width="49%" controls></video>
</div>

---

## What's This About?

AkwaFlow helps you keep track of all your subscriptions and expenses in one place. It's not just another boring expense tracker — it's got some cool features that make it actually useful:

- **Beautiful Analytics** — See your spending patterns with clean charts and graphs
- **Expense Tracking** — Track one-time expenses alongside your subscriptions
- **Smart Categories** — Organize your subscriptions and expenses however makes sense to you
- **Telegram Bot** — Manage everything right from Telegram (because who opens apps anymore?)
- **Smart Icons** — Automatically fetches service logos (Netflix, Spotify, etc.) or uses clean letter icons
- **Multi-Currency** — Supports RUB, USD, WON, KZT and more
- **Mobile-First** — Works great on your phone, tablet, or desktop

---

## Quick Start

### Prerequisites

You'll need:
- Node.js (v18 or higher)
- A Firebase project
- A Telegram bot token (if you want the bot feature)

---

## Privacy

See [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md).

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd AkwaFlow

# Install dependencies
npm install

# Set up the bot (optional)
cd bot
npm install
```

### Configuration

#### Frontend Setup

1. Create a Firebase project and get your config
2. Set up environment variables (create `.env` file locally):
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
3. Set up Firestore rules (check `firestore.rules`)

#### Bot Setup (Optional)

1. Copy `bot/service-account.example.json` to `bot/service-account.json`
2. Fill in your Firebase service account credentials
3. Create a `.env` file in the `bot/` directory:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
WEB_APP_URL=https://your-app-url.com
```

### Running Locally

```bash
# Start the dev server
npm run dev

# Build for production
npm run build

# Run the bot (in bot/ directory)
cd bot
node index.js
```

---

## Features

### Dashboard

Your main hub for managing subscriptions. You get three summary cards showing your monthly subscription total, how many subscriptions you have, and when the next payment is due. Below that, a clean list of all your subscriptions with their icons, billing cycles, and costs.

I designed the cards to be simple but not boring — rounded corners, subtle decorative circles inside, and smooth hover effects. Purple theme for subscriptions because it feels premium.

### Expenses

Added this feature because sometimes you need to track one-time expenses, not just recurring subscriptions. You can track expenses by category (same categories as subscriptions), add dates, and see monthly totals.

The design matches the subscriptions page — same rounded cards, but with orange theme to differentiate from subscriptions. Three summary cards show this month's expenses, total count, and previous month for comparison.

### Analytics

This is where things get interesting. You get six summary cards (three for monthly, three for yearly) showing subscriptions, expenses, and totals. Below that, pie charts break down your spending by category for both subscriptions and expenses. And there's a bar chart comparing subscriptions vs expenses month by month.

All charts are responsive and look good on mobile. I used Recharts because it's simple and works well with React.

### Categories

You can organize everything however you want. Create custom categories with your own colors. Each category shows how many subscriptions it has and the total cost. When you create a subscription or expense, you just pick the category from a dropdown.

I kept the category management simple — just a name and a color. No complicated hierarchies or tags. Sometimes simple is better.

### Icons

The icon system works like this: when you add a subscription or expense, the app tries to find a logo for that service. If it's a popular service like Netflix or Spotify, you'll get the actual logo. If not, it just shows the first letter of the name in a colored circle.

I removed the external API calls for icons because they were giving ugly or unclear results. Now it's either a good logo or a clean letter — nothing in between.

---

## Tech Stack

I built this with modern tools because life's too short for legacy code:

<div align="center">

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-12.8.0-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.18-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-3.6.0-FF6B6B?style=for-the-badge&logo=chart-dot&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram_Bot_API-0.67.0-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)
![Lucide](https://img.shields.io/badge/Lucide_Icons-0.562.0-FF6B6B?style=for-the-badge&logo=eye&logoColor=white)

</div>

---

## Project Structure

```
AkwaFlow/
├── src/
│   ├── components/      # React components
│   │   ├── features/    # Feature-specific components
│   │   ├── layout/      # Layout components
│   │   └── ui/          # Reusable UI components
│   ├── context/         # React Context providers
│   ├── pages/           # Page components
│   ├── services/        # API services, Firebase, icon fetching
│   └── lib/             # Utilities
├── bot/                 # Telegram bot
└── public/              # Static assets
```

---

## Design

I wanted this to feel modern but not trendy. Dark theme by default (because my eyes), smooth animations, and a focus on readability.

The latest update added rounded cards with subtle decorative circles inside — not blurred, just clean semi-transparent circles that add depth without being distracting. Purple for subscriptions, orange for expenses. It's a simple color scheme but it works.

No unnecessary complexity. Just what you need, when you need it, presented in a way that doesn't hurt your eyes.

---

## Contributing

Found a bug? Have an idea? Feel free to open an issue or submit a PR. I'm always open to suggestions and improvements.

---

## License

This project is open source and available under the MIT License.

---

## Acknowledgments

- Icons powered by Clearbit Logo API and Google Favicon API
- Charts by Recharts
- Icons by Lucide

---

## Changelog

### v1.1.0

Added expense tracking feature. You can now track one-time expenses alongside subscriptions, with the same category system and multi-currency support.

Redesigned the UI with rounded cards and decorative circular elements inside. Purple theme for subscriptions, orange for expenses. Updated icons — changed expenses icon from wallet to receipt for better clarity.

Improved the icon system to handle Cyrillic names better. Enhanced analytics to show separate tracking for subscriptions and expenses.

### v1.0.0

Initial release with subscription management, category system, basic analytics, and Telegram bot integration.

---

*I built this because I needed it. Simple as that. If you find it useful, great! If you have suggestions, even better. If you just want to see how it works, feel free to poke around the code.*
