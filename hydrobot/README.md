# 💧 HydroBot — Telegram Water Reminder Bot

A Telegram bot that reminds you to drink water, tracks your daily intake, and keeps you motivated — no commands needed, fully beginner-friendly!

---

## ✨ Features

- 🧮 **Weight-based goal calculation** — enter your weight, bot sets your ideal daily intake
- ⏰ **Periodic reminders** — get notified every 1–4 hours to drink water
- 💧 **Quick-tap keyboard** — log water with one tap (100ml, 250ml, 500ml)
- 📊 **Progress bar** — visual daily intake tracking
- 💬 **Motivational messages** — random hydration quotes
- 🔄 **Auto daily reset** — intake resets every midnight

---

## 🚀 Local Setup

### 1. Clone the repo
```bash
git clone https://github.com/your-username/hydrobot.git
cd hydrobot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Add your Bot Token
Create a `.env` file and add:
```
BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
```

### 4. Run the bot
```bash
npm start
```

---

## ☁️ Deploy on Render (Free, 24/7)

1. Push code to GitHub (`.env` is gitignored ✅)
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repo
4. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `node bot.js`
5. Add environment variable: `BOT_TOKEN = your_token`
6. Click **Deploy!**

> ⚠️ Free tier may spin down after inactivity. Upgrade to $7/month for always-on hosting.

---

## 📱 Available Commands

| Command | Description |
|---------|-------------|
| `/start` | Setup wizard (weight → goal → interval) |
| `/status` | Today's hydration progress |
| `/log100` | Log 100ml |
| `/log250` | Log 250ml |
| `/log500` | Log 500ml |
| `/logcustom` | Log a custom amount |
| `/startreminder` | Start periodic reminders |
| `/stopreminder` | Stop reminders |
| `/setgoal` | Set daily water goal manually |
| `/setinterval` | Change reminder frequency |
| `/reset` | Reset today's intake |
| `/motivate` | Get a motivational message |

---

## 💾 Data Storage

User data is saved locally in `data.json` (auto-created, gitignored). Each user stores:
- Daily water intake (resets every day)
- Daily goal (calculated from weight, default 2500ml)
- Reminder interval and active status

---

## 📦 Dependencies

- `node-telegram-bot-api` — Telegram Bot API wrapper
- `node-cron` — Cron job scheduler for reminders
- `dotenv` — Environment variable management