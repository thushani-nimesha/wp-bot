import { default as makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage, fetchLatestBaileysVersion, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import readline from 'readline';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SETTINGS_FILE = 'settings.json';
const IMAGE_FILE = 'welcome.jpg';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

const defaultSettings = {
    botEnabled: true,
    businessName: "Apex Store & Solutions",
    hotline: "+94 7X XXX XXXX",
    email: "support@apexstore.com",
    bankDetails: "🏦 Bank: Commercial Bank\n👤 Account Name: Apex Store\n🔢 Account Number: 800123456789\n📍 Branch: Colombo Main",
    deliveryInfo: "• Local: 24 - 48 Hours\n• Islandwide: 2 - 3 Days\n• Cash on Delivery Available!",
    products: [
        "Premium Item A - LKR 3,500",
        "Pro Pack B - LKR 5,200",
        "Starter Kit C - LKR 1,800"
    ]
};

function getSettings() {
    if (!fs.existsSync(SETTINGS_FILE)) {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
        return defaultSettings;
    }
    try {
        return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    } catch {
        return defaultSettings;
    }
}

function saveSettings(settings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

let pairingInterval = null;

async function connectToWhatsApp() {
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

    if (!sock.authState.creds.registered) {
        console.log('\n======================================================');
        console.log('📱 WhatsApp Pairing Code Setup');
        console.log('======================================================\n');
        
        const phoneNumber = await question('👉 Enter your WhatsApp Number (with country code, e.g. 94771234567): ');
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

        const requestAndPrintCode = async () => {
            if (sock.authState.creds.registered) {
                if (pairingInterval) clearInterval(pairingInterval);
                return;
            }
            try {
                const code = await sock.requestPairingCode(cleanNumber);
                console.log('\n======================================================');
                console.log(`🔥 YOUR PAIRING CODE IS:  ${code?.match(/.{1,4}/g)?.join('-') || code}`);
                console.log('======================================================\n');
            } catch (err) {}
        };

        setTimeout(requestAndPrintCode, 3000);
        pairingInterval = setInterval(requestAndPrintCode, 55000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            if (pairingInterval) clearInterval(pairingInterval);
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            if (pairingInterval) clearInterval(pairingInterval);
            console.log('\n🎉 WhatsApp Bot is ONLINE and Ready in Message Yourself!\n');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // 🔥 THE FIX: Relay message directly to bypass "Waiting for this message" in Message Yourself
    async function replyToSelf(jid, text) {
        try {
            const msg = generateWAMessageFromContent(
                jid,
                proto.Message.fromObject({
                    extendedTextMessage: {
                        text: text
                    }
                }),
                { userJid: sock.user.id }
            );

            await sock.relayMessage(jid, msg.message, {
                messageId: msg.key.id
            });
        } catch (err) {
            // Fallback to standard send if relay fails
            await sock.sendMessage(jid, { text });
        }
    }

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message) continue;

            const from = msg.key.remoteJid;
            const isFromMe = msg.key.fromMe;
            
            const messageText = 
                msg.message.conversation || 
                msg.message.extendedTextMessage?.text || 
                msg.message.imageMessage?.caption ||
                '';

            const text = messageText.trim();
            const textLower = text.toLowerCase();
            const isImage = !!msg.message.imageMessage;

            if (from === 'status@broadcast') continue;

            let settings = getSettings();

            // ==========================================
            // 🛡️ MESSAGE YOURSELF (ADMIN CONTROL)
            // ==========================================
            if (isFromMe) {
                // Help Menu
                if (textLower === '.help' || textLower === '.admin' || textLower === '.menu') {
                    const helpText = 
`👑 *SUPER BOT ADMIN CONTROL* 👑

🖼️ *Welcome Poster:*
• Send any photo with caption *.setimage*

🏪 *Store Settings:*
• *.setname <Name>* - Change Store Name
• *.setphone <Number>* - Change Hotline
• *.setemail <Email>* - Change Email

🛍️ *Products:*
• *.addproduct <Item - Price - Info>* - Add product
• *.delproduct <Number>* - Delete product (e.g. .delproduct 1)
• *.listproducts* - View all products

💳 *Payment & Delivery:*
• *.setbank <Details>* - Update Bank Details
• *.setdelivery <Info>* - Update Delivery Info

⚡ *Controls:*
• *.bot on* / *.bot off* - Turn Bot ON/OFF
• *.stats* - Server RAM & Uptime`;
                    await replyToSelf(from, helpText);
                    continue;
                }

                // Stats
                if (textLower === '.stats') {
                    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                    const uptimeSec = Math.floor(process.uptime());
                    const hours = Math.floor(uptimeSec / 3600);
                    const mins = Math.floor((uptimeSec % 3600) / 60);

                    const statsText = 
`📊 *SYSTEM STATUS*
• 🟢 *Bot:* ${settings.botEnabled ? 'Active (ON)' : 'Muted (OFF)'}
• 🏪 *Store:* ${settings.businessName}
• 🛍️ *Products:* ${settings.products?.length || 0}
• 🖼️ *Poster:* ${fs.existsSync(IMAGE_FILE) ? 'Saved ✅' : 'None ⚠️'}
• 💾 *Memory:* ${mem} MB
• ⏱️ *Uptime:* ${hours}h ${mins}m`;
                    await replyToSelf(from, statsText);
                    continue;
                }

                // Set Image
                if (isImage && (textLower === '.setimage' || textLower === '.image')) {
                    try {
                        const buffer = await downloadMediaMessage(
                            msg,
                            'buffer',
                            {},
                            { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
                        );
                        fs.writeFileSync(IMAGE_FILE, buffer);
                        await replyToSelf(from, '🎉 *Success!* Welcome Image has been saved!');
                    } catch (err) {
                        await replyToSelf(from, '❌ Failed to save image.');
                    }
                    continue;
                }

                // Bot On / Off
                if (textLower === '.bot on') {
                    settings.botEnabled = true;
                    saveSettings(settings);
                    await replyToSelf(from, '✅ Bot Auto-Reply is now ON!');
                    continue;
                }
                if (textLower === '.bot off') {
                    settings.botEnabled = false;
                    saveSettings(settings);
                    await replyToSelf(from, '🛑 Bot Auto-Reply is now OFF!');
                    continue;
                }

                // Set Name
                if (textLower.startsWith('.setname ')) {
                    settings.businessName = text.slice(9).trim();
                    saveSettings(settings);
                    await replyToSelf(from, `✅ Name updated to: *${settings.businessName}*`);
                    continue;
                }

                // Set Phone
                if (textLower.startsWith('.setphone ')) {
                    settings.hotline = text.slice(10).trim();
                    saveSettings(settings);
                    await replyToSelf(from, `✅ Hotline updated to: *${settings.hotline}*`);
                    continue;
                }

                // Set Email
                if (textLower.startsWith('.setemail ')) {
                    settings.email = text.slice(10).trim();
                    saveSettings(settings);
                    await replyToSelf(from, `✅ Email updated to: *${settings.email}*`);
                    continue;
                }

                // Add Product
                if (textLower.startsWith('.addproduct ')) {
                    const item = text.slice(12).trim();
                    if (!settings.products) settings.products = [];
                    settings.products.push(item);
                    saveSettings(settings);
                    await replyToSelf(from, `✅ *Product Added!*\n${item}\nTotal: ${settings.products.length}`);
                    continue;
                }

                // Del Product
                if (textLower.startsWith('.delproduct ')) {
                    const idx = parseInt(text.slice(12).trim()) - 1;
                    if (!isNaN(idx) && settings.products && idx >= 0 && idx < settings.products.length) {
                        const removed = settings.products.splice(idx, 1);
                        saveSettings(settings);
                        await replyToSelf(from, `🗑️ Deleted: "${removed[0]}"`);
                    } else {
                        await replyToSelf(from, '❌ Invalid number. Use *.listproducts*');
                    }
                    continue;
                }

                // List Products
                if (textLower === '.listproducts') {
                    const list = (settings.products || []).map((p, i) => `${i + 1}. ${p}`).join('\n');
                    await replyToSelf(from, `🛍️ *PRODUCTS LIST:*\n\n${list || 'No products added yet!'}`);
                    continue;
                }

                // Set Bank
                if (textLower.startsWith('.setbank ')) {
                    settings.bankDetails = text.slice(9).trim();
                    saveSettings(settings);
                    await replyToSelf(from, '✅ Bank Details updated!');
                    continue;
                }

                // Set Delivery
                if (textLower.startsWith('.setdelivery ')) {
                    settings.deliveryInfo = text.slice(13).trim();
                    saveSettings(settings);
                    await replyToSelf(from, '✅ Delivery Info updated!');
                    continue;
                }
            }
        }
    });
}

connectToWhatsApp();
