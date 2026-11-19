import { default as makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }), // Hide verbose logs
        printQRInTerminal: false,
        auth: state
    });

    // Handle Connection Updates (QR code generation, connect, disconnect)
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n======================================================');
            console.log('📌 Scan this QR Code with your WhatsApp:');
            console.log('   (WhatsApp Settings -> Linked Devices -> Link a Device)');
            console.log('======================================================\n');
            
            // Print in terminal
            qrcodeTerminal.generate(qr, { small: true });

            // Also save as an image file so you can open and scan easily if terminal has formatting issues
            try {
                await QRCode.toFile('qr_code.png', qr);
                console.log('📸 QR Code has also been saved as an image: qr_code.png\n');
            } catch (err) {
                // ignore
            }
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('❌ Logged out from WhatsApp. Delete auth_session folder and restart to re-scan.');
            }
        } else if (connection === 'open') {
            console.log('\n🎉 ================================================');
            console.log('✅ WhatsApp Bot is Successfully Connected and Ready!');
            console.log('================================================\n');
            // Remove qr image if exists
            if (fs.existsSync('qr_code.png')) {
                fs.unlinkSync('qr_code.png');
            }
        }
    });

    // Save session credentials
    sock.ev.on('creds.update', saveCreds);

    // Listen to incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message) continue;

            const from = msg.key.remoteJid;
            
            // Extract text message content
            const messageText = 
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                msg.message.imageMessage?.caption ||
                '';

            if (!messageText) continue;

            console.log(`📩 Message received from [${from}]: ${messageText}`);

            const textLower = messageText.trim().toLowerCase();

            // Commands handling
            if (textLower === '!ping') {
                await sock.sendMessage(from, { text: '🏓 Pong! Bot is active and running smooth!' }, { quoted: msg });
            } else if (textLower === '!menu' || textLower === '!help') {
                const menu = 
`🤖 *WHATSAPP BOT MENU* 🤖

Here are the available commands:
📌 *!ping* - Check if bot is online
📌 *!time* - Get current server date and time
📌 *!echo <text>* - Repeats the text you send
📌 *!owner* - Contact bot developer
📌 *!menu* - Show this command list

💡 _More commands coming soon!_`;
                await sock.sendMessage(from, { text: menu }, { quoted: msg });
            } else if (textLower === '!time') {
                const now = new Date().toLocaleString('si-LK', { timeZone: 'Asia/Colombo' });
                await sock.sendMessage(from, { text: `⏰ Current Time in Sri Lanka: *${now}*` }, { quoted: msg });
            } else if (textLower === '!owner') {
                await sock.sendMessage(from, { text: `👤 *Bot Owner:* You!\n🚀 Built with Baileys and Node.js` }, { quoted: msg });
            } else if (textLower.startsWith('!echo ')) {
                const echoText = messageText.slice(6).trim();
                await sock.sendMessage(from, { text: echoText ? `🗣️ ${echoText}` : 'Please provide something to echo!' }, { quoted: msg });
            } else if (textLower === 'hi' || textLower === 'hello' || textLower === 'hey') {
                await sock.sendMessage(from, { 
                    text: `👋 Hello! I am your personal WhatsApp Bot.\nType *!menu* to see what I can do!` 
                }, { quoted: msg });
            }
        }
    });
}

// Start Bot
connectToWhatsApp();
