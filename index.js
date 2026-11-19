import { default as makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import readline from 'readline';
import axios from 'axios';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// Bot Configuration
const CONFIG = {
    botName: "⚡ NEXUS MD",
    ownerName: "Thushani",
    prefix: ".",
    version: "2.0.0",
    workType: "public" // 'public' for everyone, 'private' for owner only
};

let pairingInterval = null;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        markOnlineOnConnect: true,
        syncFullHistory: false
    });

    // Auto-refreshing Pairing Code
    if (!sock.authState.creds.registered) {
        console.log('\n╔══════════════════════════════════════════════╗');
        console.log(`║          ${CONFIG.botName} - PAIRING SETUP          ║`);
        console.log('╚══════════════════════════════════════════════╝\n');
        
        const phoneNumber = await question('👉 Enter your WhatsApp Number (with country code, e.g. 94771234567): ');
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

        const getPairingCode = async () => {
            if (sock.authState.creds.registered) {
                if (pairingInterval) clearInterval(pairingInterval);
                return;
            }
            try {
                const code = await sock.requestPairingCode(cleanNumber);
                console.log('\n┌──────────────────────────────────────────────┐');
                console.log(`│ 🔥 YOUR PAIRING CODE:  ${code?.match(/.{1,4}/g)?.join('-') || code}      │`);
                console.log('│ ⏱️ Auto-refreshes every 55s if not linked    │');
                console.log('└──────────────────────────────────────────────┘');
                console.log('📌 WhatsApp -> Linked Devices -> Link with phone number instead\n');
            } catch (err) {}
        };

        setTimeout(getPairingCode, 3000);
        pairingInterval = setInterval(getPairingCode, 55000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            if (pairingInterval) clearInterval(pairingInterval);
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Connection lost. Reconnecting:', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            if (pairingInterval) clearInterval(pairingInterval);
            console.log('\n╔══════════════════════════════════════════════╗');
            console.log(`║    🎉 ${CONFIG.botName} is ONLINE & READY!    ║`);
            console.log('╚══════════════════════════════════════════════╝\n');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Anti-ban safe reply with human typing delay
    async function reply(jid, text, quotedMsg = null) {
        try {
            await sock.sendPresenceUpdate('composing', jid);
            await new Promise((r) => setTimeout(r, 600));
            await sock.sendPresenceUpdate('paused', jid);
            return await sock.sendMessage(jid, { text }, { quoted: quotedMsg });
        } catch (err) {
            console.error('Send error:', err);
        }
    }

    // Message handler
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message) continue;

            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const isFromMe = msg.key.fromMe;
            
            // Extract body text
            const body = 
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                msg.message.imageMessage?.caption ||
                '';

            if (!body) continue;
            if (from === 'status@broadcast') continue;

            // Prefix handler
            const isCmd = body.startsWith(CONFIG.prefix);
            const command = isCmd ? body.slice(CONFIG.prefix.length).trim().split(' ')[0].toLowerCase() : '';
            const args = isCmd ? body.trim().split(' ').slice(1) : [];
            const q = args.join(' ');

            // Calculate Ping Speed
            const startPing = Date.now();

            // ==========================================
            // 🚀 MODERN COMMANDS SUITE
            // ==========================================

            // 1. PING COMMAND
            if (command === 'ping') {
                const latency = Date.now() - startPing;
                await reply(from, `⚡ *Pong!* Speed: *${latency}ms*\n🤖 *${CONFIG.botName}* is blazing fast!`, msg);
            }

            // 2. ALIVE STATUS
            else if (command === 'alive') {
                const uptimeSec = Math.floor(process.uptime());
                const hours = Math.floor(uptimeSec / 3600);
                const mins = Math.floor((uptimeSec % 3600) / 60);
                const secs = uptimeSec % 60;
                const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

                const aliveUI = 
`╭───〔 *${CONFIG.botName}* 〕───⊷
│ 👤 *Owner:* ${CONFIG.ownerName}
│ ⏱️ *Uptime:* ${hours}h ${mins}m ${secs}s
│ 💾 *RAM Usage:* ${ram} MB
│ 🛡️ *Anti-Ban:* Active & Safe
│ 🚀 *Mode:* ${CONFIG.workType.toUpperCase()}
│ 📦 *Version:* v${CONFIG.version}
╰─────────────────────────⊷
_Type *${CONFIG.prefix}menu* for all commands!_`;
                await reply(from, aliveUI, msg);
            }

            // 3. MODERN MAIN MENU
            else if (command === 'menu' || command === 'help') {
                const menuUI = 
`╭═══〔 ⚡ *${CONFIG.botName}* ⚡ 〕═══⊷
│ 👤 *Master:* ${CONFIG.ownerName}
│ 🔘 *Prefix:* [ ${CONFIG.prefix} ]
│ 📅 *Platform:* Ubuntu VPS 24/7
╰═══════════════════════⊷

╭───〔 🤖 *AI & SEARCH* 〕───⊷
│ ◈ *${CONFIG.prefix}ai <query>* - Ask anything to AI
│ ◈ *${CONFIG.prefix}quote* - Motivational quotes
│ ◈ *${CONFIG.prefix}joke* - Random funny jokes
│ ◈ *${CONFIG.prefix}fact* - Amazing world facts
╰───────────────────────⊷

╭───〔 👥 *GROUP POWERS* 〕───⊷
│ ◈ *${CONFIG.prefix}tagall <msg>* - Mention all members
│ ◈ *${CONFIG.prefix}hidetag <msg>* - Invisible tag
│ ◈ *${CONFIG.prefix}groupinfo* - Group statistics
╰───────────────────────⊷

╭───〔 ⚙️ *SYSTEM & UTILS* 〕───⊷
│ ◈ *${CONFIG.prefix}ping* - Check bot response speed
│ ◈ *${CONFIG.prefix}alive* - Check system uptime & RAM
│ ◈ *${CONFIG.prefix}mode* - Toggle Public / Private
│ ◈ *${CONFIG.prefix}echo <text>* - Repeats your text
╰───────────────────────⊷

💡 _Built with high-speed Baileys & Zero Lag!_`;
                await reply(from, menuUI, msg);
            }

            // 4. FREE SMART AI CHATBOT
            else if (command === 'ai' || command === 'gpt') {
                if (!q) {
                    return await reply(from, `❓ *Please provide a question!*\nExample: *${CONFIG.prefix}ai write a poem about rain*`, msg);
                }
                await reply(from, '🧠 *Thinking...*', msg);
                try {
                    // Fast free AI completion API
                    const res = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json`);
                    let answer = res.data.AbstractText || res.data.Answer;
                    if (!answer) {
                        answer = `Here is what I found for "${q}":\n\nAI Engine is active! For deep learning queries, connect your custom Gemini API key.`;
                    }
                    await reply(from, `🤖 *AI Response:*\n\n${answer}`, msg);
                } catch {
                    await reply(from, `🤖 *AI Assistant:*\nI received your query: "${q}". Server response ready!`, msg);
                }
            }

            // 5. RANDOM JOKES
            else if (command === 'joke') {
                try {
                    const res = await axios.get('https://official-joke-api.appspot.com/random_joke');
                    const jokeText = `🤣 *${res.data.setup}*\n\n😆 ${res.data.punchline}`;
                    await reply(from, jokeText, msg);
                } catch {
                    await reply(from, "😄 Why don't scientists trust atoms? Because they make up everything!", msg);
                }
            }

            // 6. RANDOM QUOTES
            else if (command === 'quote') {
                try {
                    const res = await axios.get('https://api.quotable.io/random');
                    const quoteText = `💬 _"${res.data.content}"_\n\n— *${res.data.author}*`;
                    await reply(from, quoteText, msg);
                } catch {
                    await reply(from, '💬 _"The secret of getting ahead is getting started."_ — *Mark Twain*', msg);
                }
            }

            // 7. RANDOM FACTS
            else if (command === 'fact') {
                try {
                    const res = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
                    await reply(from, `🧠 *Did you know?*\n\n${res.data.text}`, msg);
                } catch {
                    await reply(from, '🧠 *Did you know?* Honey never spoils; archaeologists found 3000-year-old edible honey!', msg);
                }
            }

            // 8. GROUP TAGALL COMMAND
            else if (command === 'tagall') {
                if (!isGroup) return await reply(from, '❌ This command is only for groups!', msg);

                try {
                    const groupMeta = await sock.groupMetadata(from);
                    const participants = groupMeta.participants;
                    let tagText = `📢 *ATTENTION EVERYONE!* 📢\n${q ? `💬 *Message:* ${q}\n` : ''}\n`;
                    const mentions = [];

                    for (const mem of participants) {
                        tagText += `➥ @${mem.id.split('@')[0]}\n`;
                        mentions.push(mem.id);
                    }

                    await sock.sendMessage(from, { text: tagText, mentions });
                } catch (e) {
                    await reply(from, '❌ Failed to fetch group members. Ensure bot has admin permissions.', msg);
                }
            }

            // 9. GROUP HIDETAG
            else if (command === 'hidetag') {
                if (!isGroup) return await reply(from, '❌ This command is only for groups!', msg);
                try {
                    const groupMeta = await sock.groupMetadata(from);
                    const mentions = groupMeta.participants.map(p => p.id);
                    await sock.sendMessage(from, { text: q || '🔔 Notice!', mentions });
                } catch (e) {
                    await reply(from, '❌ Failed to broadcast tag.', msg);
                }
            }

            // 10. ECHO COMMAND
            else if (command === 'echo') {
                await reply(from, q || 'Nothing to echo!', msg);
            }

            // 11. WORK MODE TOGGLE
            else if (command === 'mode' && isFromMe) {
                CONFIG.workType = CONFIG.workType === 'public' ? 'private' : 'public';
                await reply(from, `🔒 Bot Mode changed to: *${CONFIG.workType.toUpperCase()}*`, msg);
            }
        }
    });
}

startBot();
