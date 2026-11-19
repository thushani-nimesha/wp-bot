import { default as makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SETTINGS_FILE = 'settings.json';
const IMAGE_FILE = 'welcome.jpg';

// Default Business Config
const defaultSettings = {
    botEnabled: true,
    businessName: "Apex Store & Solutions",
    hotline: "+94 7X XXX XXXX",
    email: "support@apexstore.com",
    bankDetails: "🏦 Bank: Commercial Bank\n👤 Account Name: Apex Store\n🔢 Account Number: 800123456789\n📍 Branch: Colombo Main",
    deliveryInfo: "• Colombo Area: 24 - 48 Hours (LKR 350)\n• Islandwide: 2 - 3 Working Days (LKR 450)\n• Cash on Delivery (COD) Available!",
    products: [
        "Premium Item A - LKR 3,500 (High quality edition)",
        "Pro Pack B - LKR 5,200 (Full accessories included)",
        "Starter Kit C - LKR 1,800 (Entry level pack)"
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

// Build Customer Main Menu
function buildMainMenu(settings) {
    return `👋 *Welcome to ${settings.businessName}!*

Thank you for reaching out to us. How can we assist you today?

Please reply with the *number* or *keyword* of your choice:

1️⃣ 🛍️ *Products* (or reply *1*)
2️⃣ 💳 *Bank Details* (or reply *2*)
3️⃣ 🚚 *Delivery Info* (or reply *3*)
4️⃣ 📍 *Contact Us* (or reply *4*)
5️⃣ 💬 *Agent Support* (or reply *5*)

_Example: Reply with *1* or *products*_`;
}

// Build Customer Products List
function buildProductsList(settings) {
    if (!settings.products || settings.products.length === 0) {
        return `🛍️ *OUR PRODUCTS & SERVICES*\n\n_No products listed at the moment. Please contact our hotline!_\n\n🔙 Reply *menu* to return.`;
    }
    const formatted = settings.products.map((p, i) => `${i + 1}. ${p}`).join('\n\n');
    return `🛍️ *OUR PRODUCTS & SERVICES*\n\n${formatted}\n\n📦 *How to Order:*\nPlease reply with Item Name, Full Name, Delivery Address & Contact Number.\n\n🔙 Reply *menu* to return.`;
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
            console.log('\n👑 Super WhatsApp Business Bot is ONLINE 24/7!\n');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Anti-Ban Human Emulation Reply
    async function safeReply(from, text, quotedMsg) {
        await sock.sendPresenceUpdate('composing', from);
        await sleep(1200); // Realistic 1.2s typing pause
        await sock.sendPresenceUpdate('paused', from);
        await sock.sendMessage(from, { text }, { quoted: quotedMsg });
    }

    // Send Welcome Message with Image
    async function sendWelcome(from, text, quotedMsg) {
        await sock.sendPresenceUpdate('composing', from);
        await sleep(1500);
        await sock.sendPresenceUpdate('paused', from);

        if (fs.existsSync(IMAGE_FILE)) {
            await sock.sendMessage(from, {
                image: fs.readFileSync(IMAGE_FILE),
                caption: text
            }, { quoted: quotedMsg });
        } else {
            await sock.sendMessage(from, { text }, { quoted: quotedMsg });
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
            // 🛡️ ADMIN MODE ("Message Yourself" Only)
            // ==========================================
            if (isFromMe) {
                // Set Image by sending Photo with caption .setimage
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
                        await sock.sendMessage(from, { text: '❌ Failed to save image. Please try again.' });
                    }
                    continue;
                }

                // Admin Help / Dashboard
                if (textLower === '.help' || textLower === '.admin') {
                    const adminHelp = 
`👑 *SUPER BOT ADMIN DASHBOARD* 👑
_Manage your business entirely from WhatsApp!_

🖼️ *Welcome Image:*
• Send any photo with caption *.setimage*

🏪 *Store Identity:*
• *.setname <Name>* - Update Store/Business Name
• *.setphone <Number>* - Update Hotline Number
• *.setemail <Email>* - Update Support Email

🛍️ *Product Management:*
• *.addproduct <Name - Price - Details>* - Add new item
• *.delproduct <Number>* - Delete product by index (e.g. .delproduct 1)
• *.listproducts* - View all currently active products

💳 *Payment & Delivery:*
• *.setbank <Details>* - Update Bank Account info
• *.setdelivery <Info>* - Update Shipping rates & time

⚙️ *System Control:*
• *.bot on* / *.bot off* - Turn Bot Auto-Replies ON/OFF
• *.preview* - Preview customer welcome screen
• *.stats* - Check RAM, Uptime & Server status`;
                    await sock.sendMessage(from, { text: adminHelp });
                    continue;
                }

                // Bot On / Off
                if (textLower === '.bot on') {
                    settings.botEnabled = true;
                    saveSettings(settings);
                    await sock.sendMessage(from, { text: '✅ *Bot Auto-Reply is now ON!*' });
                    continue;
                }
                if (textLower === '.bot off') {
                    settings.botEnabled = false;
                    saveSettings(settings);
                    await sock.sendMessage(from, { text: '🛑 *Bot Auto-Reply is now OFF (Muted)!*' });
                    continue;
                }

                // Set Name
                if (textLower.startsWith('.setname ')) {
                    const val = text.slice(9).trim();
                    if (val) {
                        settings.businessName = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `✅ Business Name updated to: *${val}*` });
                    }
                    continue;
                }

                // Set Phone
                if (textLower.startsWith('.setphone ')) {
                    const val = text.slice(10).trim();
                    if (val) {
                        settings.hotline = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `✅ Hotline updated to: *${val}*` });
                    }
                    continue;
                }

                // Set Email
                if (textLower.startsWith('.setemail ')) {
                    const val = text.slice(10).trim();
                    if (val) {
                        settings.email = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `✅ Email updated to: *${val}*` });
                    }
                    continue;
                }

                // Add Product
                if (textLower.startsWith('.addproduct ')) {
                    const productStr = text.slice(12).trim();
                    if (productStr) {
                        if (!settings.products) settings.products = [];
                        settings.products.push(productStr);
                        saveSettings(settings);
                        await sock.sendMessage(from, { 
                            text: `✅ *Product Added Successfully!*\n\n📦 *Item:* ${productStr}\n📊 *Total Products:* ${settings.products.length}` 
                        });
                    }
                    continue;
                }

                // Delete Product
                if (textLower.startsWith('.delproduct ')) {
                    const idxStr = text.slice(12).trim();
                    const idx = parseInt(idxStr) - 1;
                    if (!isNaN(idx) && settings.products && idx >= 0 && idx < settings.products.length) {
                        const removed = settings.products.splice(idx, 1);
                        saveSettings(settings);
                        await sock.sendMessage(from, { 
                            text: `🗑️ *Product Deleted:*\n"${removed[0]}"\n\n📊 *Remaining Products:* ${settings.products.length}` 
                        });
                    } else {
                        await sock.sendMessage(from, { text: '❌ Invalid product number. Check list with *.listproducts*' });
                    }
                    continue;
                }

                // List Products (Admin view)
                if (textLower === '.listproducts') {
                    if (!settings.products || settings.products.length === 0) {
                        await sock.sendMessage(from, { text: '📦 No products added yet! Use *.addproduct* to add items.' });
                    } else {
                        const list = settings.products.map((p, i) => `*${i + 1}.* ${p}`).join('\n\n');
                        await sock.sendMessage(from, { text: `🛍️ *CURRENT PRODUCTS LIST:*\n\n${list}\n\n_To delete an item, send *.delproduct <number>*_` });
                    }
                    continue;
                }

                // Set Bank
                if (textLower.startsWith('.setbank ')) {
                    const val = text.slice(9).trim();
                    if (val) {
                        settings.bankDetails = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `✅ Bank Details updated!` });
                    }
                    continue;
                }

                // Set Delivery
                if (textLower.startsWith('.setdelivery ')) {
                    const val = text.slice(13).trim();
                    if (val) {
                        settings.deliveryInfo = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `✅ Delivery Info updated!` });
                    }
                    continue;
                }

                // Preview Customer Welcome
                if (textLower === '.preview') {
                    await sock.sendMessage(from, { text: '👁️ *Previewing Customer Welcome Message:*' });
                    await sendWelcome(from, buildMainMenu(settings), null);
                    continue;
                }

                // Stats
                if (textLower === '.stats') {
                    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                    const uptimeSec = Math.floor(process.uptime());
                    const hours = Math.floor(uptimeSec / 3600);
                    const mins = Math.floor((uptimeSec % 3600) / 60);

                    const statsMsg = 
`📊 *SYSTEM STATUS & HEALTH*
• 🟢 *Bot State:* ${settings.botEnabled ? 'Active (ON)' : 'Muted (OFF)'}
• 🏪 *Store Name:* ${settings.businessName}
• 🛍️ *Total Products:* ${settings.products?.length || 0}
• 🖼️ *Welcome Image:* ${fs.existsSync(IMAGE_FILE) ? 'Saved & Active ✅' : 'Default/None ⚠️'}
• 💾 *Memory Usage:* ${mem} MB
• ⏱️ *Uptime:* ${hours}h ${mins}m
• 🛡️ *Anti-Ban Shield:* Enabled`;
                    await sock.sendMessage(from, { text: statsMsg });
                    continue;
                }
            }

            // ==========================================
            // 👥 CUSTOMER MODE (Safe Client View)
            // ==========================================
            if (!settings.botEnabled || isFromMe) continue;

            const BANK_MSG = 
`💳 *PAYMENT & BANK DETAILS*

${settings.bankDetails}

⚠️ *Important:* Once paid, please send a photo/screenshot of your receipt.

🔙 _Reply *menu* to return to the main menu._`;

            const DELIVERY_MSG = 
`🚚 *SHIPPING & DELIVERY INFORMATION*

${settings.deliveryInfo}

🔙 _Reply *menu* to return to the main menu._`;

            const CONTACT_MSG = 
`📍 *CONTACT US & BUSINESS HOURS*

📞 *Hotline:* ${settings.hotline}
📧 *Email:* ${settings.email}
⏰ *Hours:* Mon - Sat: 8:30 AM - 6:30 PM

🔙 _Reply *menu* to return to the main menu._`;

            const AGENT_MSG = 
`💬 *AGENT SUPPORT*

An agent has been notified! Our team will get back to you shortly during working hours.
For urgent inquiries, call: *${settings.hotline}*.

🔙 _Reply *menu* to return to the main menu._`;

            // Customer Navigation (Numbers + Keywords)
            if (textLower === '1' || textLower === 'products' || textLower === 'product' || textLower === 'catalog' || textLower === 'price' || textLower === 'prices') {
                await safeReply(from, buildProductsList(settings), msg);
            } else if (textLower === '2' || textLower === 'bank' || textLower === 'payment' || textLower === 'pay') {
                await safeReply(from, BANK_MSG, msg);
            } else if (textLower === '3' || textLower === 'delivery' || textLower === 'shipping') {
                await safeReply(from, DELIVERY_MSG, msg);
            } else if (textLower === '4' || textLower === 'contact' || textLower === 'location' || textLower === 'address') {
                await safeReply(from, CONTACT_MSG, msg);
            } else if (textLower === '5' || textLower === 'agent' || textLower === 'support' || textLower === 'human') {
                await safeReply(from, AGENT_MSG, msg);
            } else if (textLower === '!ping') {
                await safeReply(from, '🏓 Pong! Business Bot is 100% active on VPS.', msg);
            } else if (['hi', 'hello', 'hey', 'menu', '!menu', 'help', 'start'].includes(textLower)) {
                await sendWelcome(from, buildMainMenu(settings), msg);
            }
        }
    });
}

connectToWhatsApp();
