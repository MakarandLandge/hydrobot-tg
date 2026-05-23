require("dotenv").config();
const http = require("http");
http.createServer((req, res) => res.end("HydroBot is running!")).listen(process.env.PORT || 3000);

const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const fs = require("fs");

// ─── Data Storage ───────────────────────────────────────────────
const DATA_FILE = "./data.json";

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getUser(chatId) {
  const data = loadData();
  if (!data[chatId]) {
    data[chatId] = {
      dailyGoal: 2500,         // ml
      intake: 0,
      reminderInterval: 2,    // hours
      reminderActive: false,
      lastReset: new Date().toDateString(),
    };
    saveData(data);
  }
  // Reset daily intake if new day
  const user = data[chatId];
  if (user.lastReset !== new Date().toDateString()) {
    user.intake = 0;
    user.lastReset = new Date().toDateString();
    saveData(data);
  }
  return data[chatId];
}

function updateUser(chatId, updates) {
  const data = loadData();
  data[chatId] = { ...getUser(chatId), ...updates };
  saveData(data);
}

// ─── Motivational Messages ───────────────────────────────────────
const motivational = [
  "💧 Water is the driving force of all nature. Stay hydrated!",
  "🌊 Every sip counts! Your body is 60% water — keep it topped up.",
  "⚡ Dehydration kills focus. Drink up and stay sharp!",
  "🌿 A glass of water now = more energy, better mood, clearer skin.",
  "🏃 Athletes know it: hydration is performance. Be an athlete today.",
  "💪 Your brain needs water to think clearly. Give it what it needs!",
  "🌸 Drinking water regularly can prevent headaches. Cheers to no pain!",
  "🔥 Feeling tired? It might be dehydration. Drink a glass right now!",
];

function getMotivation() {
  return motivational[Math.floor(Math.random() * motivational.length)];
}

// ─── Progress Bar ────────────────────────────────────────────────
function progressBar(intake, goal) {
  const percent = Math.min(Math.round((intake / goal) * 100), 100);
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  const bar = "🟦".repeat(filled) + "⬜".repeat(empty);
  return `${bar} ${percent}%`;
}

// ─── Active Reminder Jobs ────────────────────────────────────────
const reminderJobs = {}; // chatId -> cron job

function startReminder(chatId) {
  const user = getUser(chatId);
  const interval = user.reminderInterval;

  if (reminderJobs[chatId]) {
    reminderJobs[chatId].stop();
  }

  // Cron: every N hours
  const cronExpr = `0 */${interval} * * *`;

  reminderJobs[chatId] = cron.schedule(cronExpr, () => {
    const u = getUser(chatId);
    const remaining = Math.max(u.dailyGoal - u.intake, 0);
    const msg =
      `⏰ *Hydration Reminder!*\n\n` +
      `${getMotivation()}\n\n` +
      `📊 Today's Progress:\n` +
      `${progressBar(u.intake, u.dailyGoal)}\n` +
      `💧 Intake: ${u.intake}ml / ${u.dailyGoal}ml\n` +
      `🎯 Still need: ${remaining}ml\n\n` +
      `Log your water: /log100, /log250, /log500`;

    bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
  });

  updateUser(chatId, { reminderActive: true });
}

function stopReminder(chatId) {
  if (reminderJobs[chatId]) {
    reminderJobs[chatId].stop();
    delete reminderJobs[chatId];
  }
  updateUser(chatId, { reminderActive: false });
}

// ─── Commands ────────────────────────────────────────────────────

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "there";

  bot.sendMessage(chatId, `👋 Hey *${name}*! Welcome to *💧 HydroBot!*\n\nLet's set you up in 2 quick steps!`, { parse_mode: "Markdown" });

  // Step 1: Ask weight
  setTimeout(() => {
    bot.sendMessage(chatId, "⚖️ What's your weight in kg? (I'll calculate your ideal daily water intake)");

    bot.once("message", (res1) => {
      if (res1.chat.id !== chatId) return;
      const weight = parseFloat(res1.text);

      if (isNaN(weight) || weight < 20 || weight > 300) {
        bot.sendMessage(chatId, "❌ Please enter a valid weight (e.g. 70)");
        return;
      }

      const goal = Math.round(weight * 35); // 35ml per kg
      updateUser(chatId, { dailyGoal: goal });

      bot.sendMessage(chatId, `✅ Got it! For *${weight}kg*, your daily goal is *${goal}ml* (~${(goal/1000).toFixed(1)}L)\n\n`, { parse_mode: "Markdown" });

      // Step 2: Ask reminder interval with buttons
      setTimeout(() => {
        bot.sendMessage(chatId, "⏰ How often should I remind you to drink water?", {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Every 1 hour", callback_data: "interval_1" },
                { text: "Every 2 hours", callback_data: "interval_2" },
              ],
              [
                { text: "Every 3 hours", callback_data: "interval_3" },
                { text: "Every 4 hours", callback_data: "interval_4" },
              ],
            ],
          },
        });
      }, 500);
    });
  }, 500);
});

// after start msg - callback handler
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;

  if (query.data.startsWith("interval_")) {
    const hours = parseInt(query.data.split("_")[1]);
    updateUser(chatId, { reminderInterval: hours });
    startReminder(chatId);

    bot.answerCallbackQuery(query.id);
    bot.sendMessage(
      chatId,
      `🎉 *All set!* I'll remind you every *${hours} hour(s)*.\n\n` +
      `💧 Tap below anytime to log water quickly!`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [
            ["💧 100ml", "💧 250ml", "💧 500ml"],
            ["📊 Status", "💬 Motivate", "🔄 Reset"],
          ],
          resize_keyboard: true,
        },
      }
    );
  }
});

// after callback handler
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text) return;

  const map = {
    "💧 100ml": "/log100",
    "💧 250ml": "/log250",
    "💧 500ml": "/log500",
    "📊 Status": "/status",
    "💬 Motivate": "/motivate",
    "🔄 Reset": "/reset",
  };

  if (map[text]) {
    bot.processUpdate({
      update_id: msg.update_id + 1,
      message: { ...msg, text: map[text] },
    });
  }
});

// /status
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const user = getUser(chatId);
  const remaining = Math.max(user.dailyGoal - user.intake, 0);
  const status = user.reminderActive ? "🟢 Active" : "🔴 Inactive";

  bot.sendMessage(
    chatId,
    `📊 *Today's Hydration Status*\n\n` +
    `${progressBar(user.intake, user.dailyGoal)}\n\n` +
    `💧 Intake: *${user.intake}ml*\n` +
    `🎯 Daily Goal: *${user.dailyGoal}ml*\n` +
    `⏳ Remaining: *${remaining}ml*\n` +
    `⏰ Reminders: ${status}\n` +
    `🔔 Interval: Every *${user.reminderInterval}h*`,
    { parse_mode: "Markdown" }
  );
});

// /log100, /log250, /log500
[100, 250, 500].forEach((amount) => {
  bot.onText(new RegExp(`\\/log${amount}`), (msg) => {
    const chatId = msg.chat.id;
    const user = getUser(chatId);
    const newIntake = user.intake + amount;
    updateUser(chatId, { intake: newIntake });

    const remaining = Math.max(user.dailyGoal - newIntake, 0);
    const goalReached = newIntake >= user.dailyGoal;

    let reply =
      `✅ Logged *${amount}ml!*\n\n` +
      `${progressBar(newIntake, user.dailyGoal)}\n\n` +
      `💧 Total today: *${newIntake}ml* / ${user.dailyGoal}ml`;

    if (goalReached) {
      reply += `\n\n🎉 *Amazing! You've hit your daily goal!* Keep it up!`;
    } else {
      reply += `\n⏳ *${remaining}ml* more to reach your goal!`;
    }

    bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  });
});

// /logcustom
bot.onText(/\/logcustom/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "💧 How many ml did you drink? (e.g. type `350`)", {
    parse_mode: "Markdown",
  });

  bot.once("message", (response) => {
    if (response.chat.id !== chatId) return;
    const amount = parseInt(response.text);
    if (isNaN(amount) || amount <= 0) {
      bot.sendMessage(chatId, "❌ Invalid amount. Please enter a positive number.");
      return;
    }
    const user = getUser(chatId);
    const newIntake = user.intake + amount;
    updateUser(chatId, { intake: newIntake });
    const remaining = Math.max(user.dailyGoal - newIntake, 0);
    bot.sendMessage(
      chatId,
      `✅ Logged *${amount}ml!*\n\n` +
      `${progressBar(newIntake, user.dailyGoal)}\n\n` +
      `💧 Total: *${newIntake}ml* / ${user.dailyGoal}ml\n` +
      `⏳ Remaining: *${remaining}ml*`,
      { parse_mode: "Markdown" }
    );
  });
});

// /startreminder
bot.onText(/\/startreminder/, (msg) => {
  const chatId = msg.chat.id;
  const user = getUser(chatId);
  startReminder(chatId);
  bot.sendMessage(
    chatId,
    `✅ *Reminders started!*\n\nI'll remind you every *${user.reminderInterval} hour(s)*.\nUse /stopreminder to stop.`,
    { parse_mode: "Markdown" }
  );
});

// /stopreminder
bot.onText(/\/stopreminder/, (msg) => {
  const chatId = msg.chat.id;
  stopReminder(chatId);
  bot.sendMessage(chatId, "🛑 *Reminders stopped.*\n\nUse /startreminder to turn them back on.", {
    parse_mode: "Markdown",
  });
});

// /setgoal
bot.onText(/\/setgoal/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "🎯 Enter your daily water goal in ml (e.g. `2500` for 2.5L):", {
    parse_mode: "Markdown",
  });

  bot.once("message", (response) => {
    if (response.chat.id !== chatId) return;
    const goal = parseInt(response.text);
    if (isNaN(goal) || goal < 500) {
      bot.sendMessage(chatId, "❌ Please enter a valid goal (minimum 500ml).");
      return;
    }
    updateUser(chatId, { dailyGoal: goal });
    bot.sendMessage(chatId, `✅ Daily goal set to *${goal}ml*! 💪`, { parse_mode: "Markdown" });
  });
});

// /setinterval
bot.onText(/\/setinterval/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "⏱ How often should I remind you? Enter hours (e.g. `1`, `2`, or `3`):", {
    parse_mode: "Markdown",
  });

  bot.once("message", (response) => {
    if (response.chat.id !== chatId) return;
    const hours = parseInt(response.text);
    if (isNaN(hours) || hours < 1 || hours > 12) {
      bot.sendMessage(chatId, "❌ Please enter a value between 1 and 12 hours.");
      return;
    }
    updateUser(chatId, { reminderInterval: hours });
    const user = getUser(chatId);
    if (user.reminderActive) {
      startReminder(chatId); // restart with new interval
      bot.sendMessage(chatId, `✅ Interval updated to every *${hours}h*. Reminder restarted!`, {
        parse_mode: "Markdown",
      });
    } else {
      bot.sendMessage(chatId, `✅ Interval set to every *${hours}h*. Use /startreminder to activate.`, {
        parse_mode: "Markdown",
      });
    }
  });
});

// /reset
bot.onText(/\/reset/, (msg) => {
  const chatId = msg.chat.id;
  updateUser(chatId, { intake: 0 });
  bot.sendMessage(chatId, "🔄 *Today's intake has been reset to 0ml.*\nFresh start! 💧", {
    parse_mode: "Markdown",
  });
});

// /motivate
bot.onText(/\/motivate/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, getMotivation());
});

console.log("💧 HydroBot is running...");
