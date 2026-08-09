const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

function validateInitData(initData) {
  if (process.env.NODE_ENV !== 'production' && (!initData || initData.startsWith('mock'))) {
    return { isValid: true, user: { id: 123456789 } };
  }
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  if (!hash) return { isValid: false };
  urlParams.delete('hash');
  const paramsList = [];
  urlParams.forEach((value, key) => {
    paramsList.push(`${key}=${value}`);
  });
  paramsList.sort();
  const dataCheckString = paramsList.join('\n');
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return { isValid: false };
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (calculatedHash === hash) {
    const userStr = urlParams.get('user');
    if (userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        return { isValid: true, user };
      } catch (e) {
        return { isValid: false };
      }
    }
  }
  return { isValid: false };
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Connect to DB for betting validation
const db = new Database(path.join(process.cwd(), 'data', 'game.db'));
db.pragma('journal_mode = WAL');

// Fake player names
const FAKE_PLAYERS = [
  { name: 'Alex_pro' },
  { name: 'CryptoKing' },
  { name: 'Luna_moon' },
  { name: 'BetMaster' },
  { name: 'NightOwl' },
  { name: 'StarDust' },
  { name: 'PhantomX' },
  { name: 'DiamondH' },
  { name: 'RocketMan' },
  { name: 'ShadowFX' },
];

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // --- TELEGRAM BOT BROADCAST LOGIC ---
  const TelegramBot = require('node-telegram-bot-api');
  const botToken = process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.trim() : undefined;
  const ADMIN_ID = process.env.ADMIN_ID ? process.env.ADMIN_ID.trim() : null;
  
  if (botToken) {
    const bot = new TelegramBot(botToken, { polling: true });
    let broadcastDraft = null;
    
    // Ensure no conflicting webhooks
    bot.deleteWebHook().catch(e => console.error('Failed to delete webhook:', e));

    bot.on('polling_error', (error) => {
      console.error('--- BOT POLLING ERROR ---', error.code, error.message);
    });

    bot.on('message', (msg) => {
      console.log('--- BOT MESSAGE RECEIVED ---');
      console.log('From:', msg.chat.id, 'Text:', msg.text);
      console.log('Admin ID is:', ADMIN_ID);
      
      if (msg.chat.id.toString() !== ADMIN_ID) {
        console.log('Ignored: not admin');
        return;
      }
      
      try {
        // Ensure table exists just in case
        db.exec('CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT)');
        const stateRow = db.prepare("SELECT value FROM state WHERE key = 'admin_broadcast_state'").get();
        console.log('Current DB state:', stateRow);
        
        if (stateRow && stateRow.value === 'WAITING') {
          console.log('State is WAITING, processing broadcast content...');
        broadcastDraft = {
          text: msg.text || msg.caption || '',
          photoId: msg.photo ? msg.photo[msg.photo.length - 1].file_id : null
        };
        
        db.prepare("UPDATE state SET value = 'CONFIRMING' WHERE key = 'admin_broadcast_state'").run();
        
        const replyOptions = {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Да, отправить всем', callback_data: 'broadcast_yes' }],
              [{ text: 'Нет, отмена', callback_data: 'broadcast_no' }]
            ]
          }
        };
        
        bot.sendMessage(ADMIN_ID, 'Отправить всем пользователям?', replyOptions)
          .then(() => console.log('Sent confirmation buttons to admin'))
          .catch(e => console.error('Failed to send confirmation buttons:', e));
      } else {
        console.log('Ignored: state is not WAITING');
      }
    } catch (e) {
      console.error('Error in bot message handler:', e);
    }
  });

  bot.on('callback_query', async (query) => {
    if (query.message.chat.id.toString() !== ADMIN_ID) return;
    
    try {
      const stateRow = db.prepare("SELECT value FROM state WHERE key = 'admin_broadcast_state'").get();
      if (stateRow && stateRow.value === 'CONFIRMING') {
        if (query.data === 'broadcast_yes' && broadcastDraft) {
          bot.answerCallbackQuery(query.id, { text: 'Рассылка запущена!' });
          bot.editMessageText('Рассылка запущена!', { chat_id: ADMIN_ID, message_id: query.message.message_id });
          
          const users = db.prepare('SELECT telegram_id FROM users').all();
          let sent = 0;
          
          for (let i = 0; i < users.length; i++) {
            const u = users[i];
            try {
              if (broadcastDraft.photoId) {
                await bot.sendPhoto(u.telegram_id, broadcastDraft.photoId, { caption: broadcastDraft.text });
              } else if (broadcastDraft.text) {
                await bot.sendMessage(u.telegram_id, broadcastDraft.text);
              }
              sent++;
            } catch (e) {
              console.error('Failed to send to', u.telegram_id);
            }
            await new Promise(r => setTimeout(r, 50));
          }
          
          bot.sendMessage(ADMIN_ID, `Рассылка завершена! Доставлено: ${sent} пользователям.`);
          
        } else if (query.data === 'broadcast_no') {
          bot.answerCallbackQuery(query.id, { text: 'Рассылка отменена.' });
          bot.editMessageText('Рассылка отменена.', { chat_id: ADMIN_ID, message_id: query.message.message_id });
        }
        
        db.prepare("UPDATE state SET value = 'IDLE' WHERE key = 'admin_broadcast_state'").run();
        broadcastDraft = null;
      } else {
        bot.answerCallbackQuery(query.id, { text: 'Нет активной рассылки.' });
      }
      } catch (e) {
        console.error('Error in callback_query handler:', e);
      }
    });
  } else {
    console.warn('TELEGRAM_BOT_TOKEN is not set. Bot polling will not start.');
  }
  // ------------------------------------


  // Game State
  let phase = 'waiting';
  let multiplier = 1.0;
  let crashPoint = 0;
  let countdown = 5;
  let history = [2.41, 1.48, 1.76, 2.13, 1.65, 1.93];
  let bets = [];

  const genCrashPoint = () => {
    const r = Math.random();
    if (r < 0.6) return 1.0 + Math.random() * 1.0;
    if (r < 0.85) return 2.0 + Math.random() * 3.0;
    return 5.0 + Math.random() * 15.0;
  };

  const broadcastState = () => {
    io.emit('gameState', { phase, multiplier, crashPoint, countdown, history, bets });
  };

  const startGameLoop = () => {
    phase = 'waiting';
    countdown = 5;
    multiplier = 1.0;
    bets = [];
    
    // Pre-populate some bots instantly so the session feels alive from the start
    const numInitialBots = Math.floor(5 + Math.random() * 8); // 5 to 12 bots
    for (let i = 0; i < numInitialBots; i++) {
      const bot = FAKE_PLAYERS[Math.floor(Math.random() * FAKE_PLAYERS.length)];
      if (!bets.find(b => b.name === bot.name)) {
        bets.push({
          name: bot.name,
          bet: Math.floor(10 + Math.random() * 500),
          cashout: null,
          multiplier: null,
          isBot: true
        });
      }
    }
    
    broadcastState();

    const botInterval = setInterval(() => {
      if (Math.random() > 0.4) {
        const bot = FAKE_PLAYERS[Math.floor(Math.random() * FAKE_PLAYERS.length)];
        if (!bets.find(b => b.name === bot.name)) {
          bets.push({
            name: bot.name,
            bet: Math.floor(10 + Math.random() * 500),
            cashout: null,
            multiplier: null,
            isBot: true
          });
          broadcastState();
        }
      }
    }, 400);

    const countdownInterval = setInterval(() => {
      countdown -= 1;
      broadcastState();
      
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        clearInterval(botInterval);
        startRunningPhase();
      }
    }, 1000);
  };

  const startRunningPhase = () => {
    phase = 'running';
    crashPoint = genCrashPoint();
    multiplier = 1.0;
    
    bets.forEach(b => {
      if (b.isBot) b.targetCashout = 1.1 + Math.random() * 3.0;
    });

    broadcastState();

    let startTime = Date.now();
    
    const runInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      multiplier = Math.pow(1.15, elapsed / 1000);

      let changed = false;
      bets.forEach(b => {
        if (b.isBot && !b.cashout && multiplier >= b.targetCashout && b.targetCashout < crashPoint) {
          b.cashout = Math.floor(b.bet * multiplier);
          b.multiplier = parseFloat(multiplier.toFixed(2));
          changed = true;
        }
      });

      if (changed) broadcastState();

      if (multiplier >= crashPoint) {
        clearInterval(runInterval);
        multiplier = crashPoint;
        phase = 'crashed';
        
        bets.forEach(b => {
          if (!b.cashout) {
            b.multiplier = 0;
            b.cashout = 0;
          }
        });
        
        history.unshift(parseFloat(crashPoint.toFixed(2)));
        if (history.length > 20) history.pop();
        
        broadcastState();
        
        setTimeout(() => {
          startGameLoop();
        }, 2000);
      } else {
        io.emit('multiplierUpdate', { multiplier });
      }
    }, 100);
  };

  io.use((socket, next) => {
    const initData = socket.handshake.auth.initData;
    const authResult = validateInitData(initData);
    if (!authResult.isValid || !authResult.user) {
      return next(new Error('Authentication error'));
    }
    socket.telegram_id = authResult.user.id.toString();
    next();
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id, 'User:', socket.telegram_id);
    
    socket.emit('gameState', { phase, multiplier, crashPoint, countdown, history, bets });

    socket.on('placeBet', (data) => {
      if (phase === 'waiting' && socket.telegram_id) {
        // Validate user in DB
        const user = db.prepare('SELECT balance FROM users WHERE telegram_id = ?').get(socket.telegram_id);
        if (user && user.balance >= data.amount) {
          // Deduct from DB
          db.prepare('UPDATE users SET balance = balance - ? WHERE telegram_id = ?').run(data.amount, socket.telegram_id);
          db.prepare('INSERT INTO transactions (telegram_id, type, amount, currency) VALUES (?, ?, ?, ?)').run(socket.telegram_id, 'bet', data.amount, 'USDT');
          
          bets.push({
            id: socket.id,
            telegram_id: socket.telegram_id,
            name: data.name,
            bet: data.amount,
            cashout: null,
            multiplier: null,
            isBot: false
          });
          broadcastState();
        }
      }
    });

    socket.on('cashOut', () => {
      if (phase === 'running') {
        const bet = bets.find(b => b.id === socket.id);
        if (bet && !bet.cashout && bet.telegram_id) {
          bet.cashout = Math.floor(bet.bet * multiplier);
          bet.multiplier = parseFloat(multiplier.toFixed(2));
          
          // Add winnings to DB
          db.prepare('UPDATE users SET balance = balance + ? WHERE telegram_id = ?').run(bet.cashout, bet.telegram_id);
          db.prepare('INSERT INTO transactions (telegram_id, type, amount, currency) VALUES (?, ?, ?, ?)').run(bet.telegram_id, 'win', bet.cashout, 'USDT');
          
          socket.emit('cashedOut', { cashout: bet.cashout, multiplier: bet.multiplier });
          broadcastState();
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  startGameLoop();

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
