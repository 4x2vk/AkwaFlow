# 🌊 AkwaFlow

> *Because tracking subscriptions shouldn't be a subscription to stress*

Hey there! 👋 This is **AkwaFlow** — my take on a subscription management app that actually makes sense. You know that feeling when you're paying for Netflix, Spotify, YouTube Premium, and like 10 other services, but you have no idea how much you're actually spending? Yeah, me too. So I built this.


<div align="center">
  <video src="https://github.com/user-attachments/assets/f56be828-ffd7-40b4-805e-a19738458982" width="49%" controls></video>
  <video src="https://github.com/user-attachments/assets/3a2c2131-4a41-44f6-b37b-f1814abf2b1e" width="49%" controls></video>
</div>

---

## ✨ What's This About?

AkwaFlow helps you keep track of all your subscriptions in one place. It's not just another boring expense tracker — it's got some cool features that make it actually useful:

- 📊 **Beautiful Analytics** — See your spending patterns with clean charts and graphs
- 🎨 **Smart Categories** — Organize your subscriptions however makes sense to you
- 🤖 **Telegram Bot** — Manage everything right from Telegram (because who opens apps anymore?)
- 🎯 **Auto Icons** — Automatically fetches service logos (Netflix, Spotify, etc.) so your list looks pretty
- 💰 **Multi-Currency** — Supports RUB, USD, WON, KZT and more
- 📱 **Mobile-First** — Works great on your phone, tablet, or desktop

---

## 🚀 Quick Start

### Prerequisites

You'll need:
- Node.js (v18 or higher)
- A Firebase project
- A Telegram bot token (if you want the bot feature)

---

## 🔒 Privacy

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

# Run bot self-checks
npm run selftest
npm run selftest:dialog
```

---

## 🎯 Features Deep Dive

### Dashboard
Your main hub. See all subscriptions at a glance, check monthly/yearly totals, and see when your next payment is due. Clean, simple, no clutter.

### Analytics
This is where it gets interesting. Beautiful charts showing:
- Monthly spending breakdown
- Category distribution (pie charts, because who doesn't love pie charts?)
- Year-over-year trends

The charts are responsive, look great on mobile, and actually make sense (unlike some analytics dashboards I've seen).

### Categories
Organize your subscriptions however you want. Create custom categories with your own colors. Want a "Streaming" category? Done. "Productivity Tools"? Sure. "Stuff I Probably Don't Need"? Go for it.

### Auto Icons
One of my favorite features. When you add a subscription, the app automatically tries to find the service's logo. Type "Netflix" and boom — Netflix logo appears. It uses Clearbit and Google's favicon APIs, so it works for most popular services.

### Telegram Bot Parsing Notes
The bot uses rule-based parsing for Telegram messages. It now handles a wider range of natural phrasing without switching to a full LLM flow:

- Inline categories such as `Расход 5000₩ такси сегодня категория Транспорт`
- Voice-like short phrases such as `Netflix 10000₩ 12 числа` or `Кофе 6000вон сегодня`
- Ambiguous money phrases by asking a short follow-up: `расход`, `доход` or `подписка`
- Interrupting a follow-up with a new intent like `мои расходы` or `мои подписки`

Current limitation: when a message contains only an amount and a title but no clear type, the bot may ask one extra clarifying question before saving.

---

## 🛠️ Tech Stack

I built this with modern tools because life's too short for legacy code:

- **React 19** — Latest and greatest
- **Vite** — Fast builds, hot reload, you know the drill
- **Firebase** — Real-time database, authentication, hosting
- **Tailwind CSS** — Because writing CSS manually is so 2010
- **Recharts** — Beautiful, responsive charts
- **Telegram Bot API** — For the bot integration
- **Lucide Icons** — Clean, consistent icons

---

## 📁 Project Structure

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

## 🎨 Design Philosophy

I wanted this to feel modern but not trendy. Dark theme by default (because my eyes), smooth animations, and a focus on readability. No unnecessary complexity — just what you need, when you need it.

---

## 🤝 Contributing

Found a bug? Have an idea? Feel free to open an issue or submit a PR. I'm always open to suggestions and improvements.

## 🚢 Release Automation

This repository uses `semantic-release` with GitHub Actions.

- Every push to `master` runs the release workflow in `.github/workflows/release.yml`
- `main` is also supported if the default branch is renamed later
- A successful release updates `package.json`, `package-lock.json`, and `CHANGELOG.md`
- The workflow then creates a git tag and a GitHub Release automatically

### Commit Format

Release versioning is based on Conventional Commits:

- `fix: ...` -> patch release
- `feat: ...` -> minor release
- `feat!: ...` or a `BREAKING CHANGE:` footer -> major release

Examples:

```text
fix: correct monthly totals rounding
feat: add recurring payment filters
feat!: replace legacy category ids
```

### Local Dry Run

Run a local verification before merging to the release branch:

```bash
git checkout master
git pull
npm install
$env:GITHUB_TOKEN="<github-token>"
npm run release:dry-run
```

Notes:

- `semantic-release` needs `GITHUB_TOKEN` even for a realistic dry run
- The GitHub Action uses Node.js 22
- Only commits that follow Conventional Commits are considered for automatic version bumps

---

## 📝 License

This project is open source and available under the MIT License.

---

## 🙏 Acknowledgments

- Icons powered by [Clearbit Logo API](https://clearbit.com/logo) and Google Favicon API
- Charts by [Recharts](https://recharts.org/)
- Icons by [Lucide](https://lucide.dev/)

---

## 💭 Final Thoughts

I built this because I needed it. Simple as that. If you find it useful, great! If you have suggestions, even better. If you just want to see how it works, feel free to poke around the code.

Happy tracking!

---

*P.S. — The name "AkwaFlow" doesn't mean anything special. I just liked how it sounded. Sometimes that's enough.*
