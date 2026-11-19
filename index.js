import { default as makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SETTINGS_FILE = 'settings.json';
const IMAGE_FILE = 'welcome.jpg';

const defaultSettings = {
    botEnabled: true,
    businessName: "Apex Store & Solutions",
    hotline: "+94 7X XXX XXXX",
    email: "support@apexstore.com",
    bankDetails: "🏦 Bank: Commercial Bank\n👤 Account Name: Apex Store\n🔢 Account Number: 800123456789\n📍 Branch: Colombo Main",
    products: [
        "1. Premium Item A - LKR 3,500",
        "2. Pro Pack B - LKR 5,200",
        "3. Starter Kit C - LKR 1,800"
    ],
    deliveryInfo: "• Colombo Area: 24-48 Hours (LKR 350)\n• Islandwide: 2-3 Working Days (LKR 450)\n• Cash on Delivery (COD) Available!"
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

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('\n👑 Super WhatsApp Business Bot is ONLINE!\n');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    async function safeReply(from, text, quotedMsg) {
        await sock.sendPresenceUpdate('composing', from);
        await sleep(1000);
        await sock.sendPresenceUpdate('paused', from);
        await sock.sendMessage(from, { text }, { quoted: quotedMsg });
    }

    async function sendWelcomeWithImage(from, captionText, quotedMsg) {
        await sock.sendPresenceUpdate('composing', from);
        await sleep(1200);
        await sock.sendPresenceUpdate('paused', from);

        if (fs.existsSync(IMAGE_FILE)) {
            await sock.sendMessage(from, {
                image: fs.readFileSync(IMAGE_FILE),
                caption: captionText
            }, { quoted: quotedMsg });
        } else {
            await sock.sendMessage(from, { text: captionText }, { quoted: quotedMsg });
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
            // 🛡️ ADMIN MODE ("Message Yourself")
            // ==========================================
            if (isFromMe) {
                if (isImage && (textLower === '.setimage' || textLower === '.image')) {
                    try {
                        await sock.sendMessage(from, { text: '⏳ Downloading and saving Welcome Image...' });
                        const buffer = await downloadMediaMessage(
                            msg,
                            'buffer',
                            {},
                            { 
                                logger: pino({ level: 'silent' }),
                                reuploadRequest: sock.updateMediaMessage 
                            }
                        );
                        fs.writeFileSync(IMAGE_FILE, buffer);
                        await sock.sendMessage(from, { text: '🎉 *Success!* Welcome Image has been saved! Customers will now see this photo.' });
                    } catch (err) {
                        console.error('Error saving image:', err);
                        await sock.sendMessage(from, { text: '❌ Failed to save image.' });
                    }
                    continue;
                }

                if (textLower === '.help' || textLower === '.admin') {
                    const adminHelp = 
`👑 *SUPER BOT ADMIN DASHBOARD* 👑

🖼️ *Set Welcome Image:*
• Send any photo with caption *.setimage*

⚙️ *Settings Control:*
• *.bot on* / *.bot off* - Turn bot auto-replies ON/OFF
• *.setname <Name>* - Change Business Name
• *.setphone <Phone>* - Change Hotline Number
• *.setbank <Bank Info>* - Change Bank details
• *.setdelivery <Info>* - Change Shipping Info

📊 *System Control:*
• *.stats* - Server uptime, RAM & Bot Status`;
                    await sock.sendMessage(from, { text: adminHelp });
                    continue;
                }

                if (textLower === '.bot on') {
                    settings.botEnabled = true;
                    saveSettings(settings);
                    await sock.sendMessage(from, { text: '✅ *Bot Auto-Reply is now ON!*' });
                    continue;
                }

                if (textLower === '.bot off') {
                    settings.botEnabled = false;
                    saveSettings(settings);
                    await sock.sendMessage(from, { text: '🛑 *Bot Auto-Reply is now OFF!*' });
                    continue;
                }

                if (textLower.startsWith('.setname ')) {
                    const newName = text.slice(9).trim();
                    if (newName) {
                        settings.businessName = newName;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `✅ Business Name updated to: *${newName}*` });
                    }
                    continue;
                }

                if (textLower.startsWith('.setphone ')) {
                    const newPhone = text.slice(10).trim();
                    if (newPhone) {
                        settings.hotline = newPhone;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `✅ Hotline updated to: *${newPhone}*` });
                    }
                    continue;
                }

                if (textLower.startsWith('.setbank ')) {
                    const newBank = text.slice(9).trim();
                    if (newBank) {
                        settings.bankDetails = newBank;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `✅ Bank Details updated!` });
                    }
                    continue;
                }

                if (textLower.startsWith('.setdelivery ')) {
                    const newDelivery = text.slice(13).trim();
                    if (newDelivery) {
                        settings.deliveryInfo = newDelivery;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `✅ Delivery Info updated!` });
                    }
                    continue;
                }

                if (textLower === '.stats') {
                    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                    const uptimeSec = Math.floor(process.uptime());
                    const hours = Math.floor(uptimeSec / 3600);
                    const mins = Math.floor((uptimeSec % 3600) / 60);

                    const statsMsg = 
`📊 *SYSTEM STATUS*
• 🟢 *Status:* ${settings.botEnabled ? 'Active (ON)' : 'Muted (OFF)'}
• 🏪 *Business Name:* ${settings.businessName}
• 🖼️ *Custom Image:* ${fs.existsSync(IMAGE_FILE) ? 'Saved & Active ✅' : 'Not uploaded yet ⚠️'}
• 💾 *Memory:* ${mem} MB
• ⏱️ *Uptime:* ${hours}h ${mins}m`;
                    await sock.sendMessage(from, { text: statsMsg });
                    continue;
                }
            }

            // ==========================================
            // 👥 CUSTOMER MODE
            // ==========================================
            if (!settings.botEnabled || isFromMe) continue;

            const MAIN_MENU = 
`👋 *Welcome to ${settings.businessName}!*

Thank you for contacting us. How can we assist you today?

Please reply with the *number* of your choice:

1️⃣ 🛍️ *Product Catalog & Pricing*
2️⃣ 💳 *Bank & Payment Details*
3️⃣ 🚚 *Shipping & Delivery Info*
4️⃣ 📍 *Contact Us & Location*
5️⃣ 💬 *Speak with an Agent*

_Example: Reply with *1* or *2*_`;

            const PRODUCTS_LIST = 
`🛍️ *OUR PRODUCTS & SERVICES*

${settings.products.join('\n')}

📦 *How to Order:*
Please reply with Item Name, Your Full Name, Address and Contact Number.

🔙 _Reply *menu* to return to the main menu._`;

            const BANK_DETAILS = 
`💳 *PAYMENT & BANK DETAILS*

${settings.bankDetails}

⚠️ *Important:* Once paid, please send a photo/screenshot of your receipt.

🔙 _Reply *menu* to return to the main menu._`;

            const DELIVERY_INFO = 
`🚚 *SHIPPING & DELIVERY INFORMATION*

${settings.deliveryInfo}

🔙 _Reply *menu* to return to the main menu._`;

            const CONTACT_INFO = 
`📍 *CONTACT US & BUSINESS HOURS*

📞 *Hotline:* ${settings.hotline}
📧 *Email:* ${settings.email}
⏰ *Hours:* Mon - Sat: 8:30 AM - 6:30 PM

🔙 _Reply *menu* to return to the main menu._`;

            const AGENT_REPLY = 
`💬 *AGENT SUPPORT*

An agent has been notified! We will get back to you shortly.
Urgent inquiries: *${settings.hotline}*.

🔙 _Reply *menu* to return to the main menu._`;

            if (textLower === '1') {
                await safeReply(from, PRODUCTS_LIST, msg);
            } else if (textLower === '2') {
                await safeReply(from, BANK_DETAILS, msg);
            } else if (textLower === '3') {
                await safeReply(from, DELIVERY_INFO, msg);
            } else if (textLower === '4') {
                await safeReply(from, CONTACT_INFO, msg);
            } else if (textLower === '5') {
                await safeReply(from, AGENT_REPLY, msg);
            } else if (textLower === '!ping') {
                await safeReply(from, '🏓 Pong! Bot is active on VPS.', msg);
            } else if (['hi', 'hello', 'hey', 'menu', '!menu', 'help', 'start'].includes(textLower)) {
                await sendWelcomeWithImage(from, MAIN_MENU, msg);
            }
        }
    });
}

connectToWhatsApp();
