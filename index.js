import { default as makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SETTINGS_FILE = 'settings.json';
const IMAGE_FILE = 'welcome.jpg';

// Multi-Language Localization Dictionaries
const LANGUAGES = {
    en: {
        name: "English",
        flag: "🇬🇧",
        welcomeTitle: "Welcome to",
        welcomeSub: "How can we assist you today?\nPlease reply with the number or keyword of your choice:",
        menu1: "🛍️ Products (or reply 1)",
        menu2: "💳 Bank Details (or reply 2)",
        menu3: "🚚 Delivery Info (or reply 3)",
        menu4: "📍 Contact Us (or reply 4)",
        menu5: "💬 Agent Support (or reply 5)",
        orderPrompt: "📦 How to Order:\nPlease reply with Item Name, Full Name, Delivery Address & Contact Number.",
        returnMenu: "🔙 Reply menu to return.",
        bankReceiptPrompt: "⚠️ Important: Once paid, please send a photo/screenshot of your receipt.",
        agentNotified: "💬 An agent has been notified! Our team will get back to you shortly during working hours.",
        urgentCall: "For urgent inquiries, call:",
        adminTitle: "👑 SUPER BOT ADMIN DASHBOARD 👑",
        adminConnected: "🎉 WHATSAPP BOT CONNECTED SUCCESSFULLY! 🎉",
        adminLangSet: "✅ Language successfully set to: English 🇬🇧"
    },
    si: {
        name: "Sinhala",
        flag: "🇱🇰",
        welcomeTitle: "සාදරයෙන් පිළිගනිමු",
        welcomeSub: "ඔබට අවශ්‍ය සේවාව සඳහා අදාළ අංකය හෝ වචනය reply කරන්න:",
        menu1: "🛍️ භාණ්ඩ හා සේවා (හෝ 1)",
        menu2: "💳 බැංකු විස්තර (හෝ 2)",
        menu3: "🚚 ඩිලිවරි විස්තර (හෝ 3)",
        menu4: "📍 අපව අමතන්න (හෝ 4)",
        menu5: "💬 සහායකයෙකු සම්බන්ධ කරගැනීම (හෝ 5)",
        orderPrompt: "📦 ඇණවුම් කිරීමට:\nඅවශ්‍ය භාණ්ඩයේ නම, ඔබගේ නම, ලිපිනය සහ දුරකථන අංකය එවන්න.",
        returnMenu: "🔙 මුල් පිටුවට යාමට menu ලෙස එවන්න.",
        bankReceiptPrompt: "⚠️ වැදගත්: මුදල් තැන්පත් කළ පසු රිසිට්පතේ ඡායාරූපයක් එවන්න.",
        agentNotified: "💬 අපගේ නියෝජිතයෙකුට දැනුම් දෙන ලදී! සේවා කාලය තුළ හැකි ඉක්මනින් සම්බන්ධ වනු ඇත.",
        urgentCall: "හදිසි විමසීම් සඳහා අමතන්න:",
        adminTitle: "👑 සුපිරි බොට් ඇඩ්මින් පාලක පුවරුව 👑",
        adminConnected: "🎉 වට්ස්ඇප් බොට් සාර්ථකව සම්බන්ධ විය! 🎉",
        adminLangSet: "✅ භාෂාව සාර්ථකව සිංහල ලෙස සකසන ලදී! 🇱🇰"
    },
    ta: {
        name: "Tamil",
        flag: "🇮🇳",
        welcomeTitle: "நல்வரவு",
        welcomeSub: "இன்று நாங்கள் உங்களுக்கு எவ்வாறு உதவ முடியும்?\nவிரும்பிய எண் அல்லது சொல்லை அனுப்பவும்:",
        menu1: "🛍️ பொருட்கள் (அல்லது 1)",
        menu2: "💳 வங்கி விவரங்கள் (அல்லது 2)",
        menu3: "🚚 டெலிவரி தகவல் (அல்லது 3)",
        menu4: "📍 தொடர்பு கொள்ள (அல்லது 4)",
        menu5: "💬 வாடிக்கையாளர் சேவை (அல்லது 5)",
        orderPrompt: "📦 ஆர்டர் செய்ய:\nபொருளின் பெயர், உங்கள் பெயர், முகவரி மற்றும் தொலைபேசி எண்ணை அனுப்பவும்.",
        returnMenu: "🔙 முதன்மை மெனுவுக்கு செல்ல menu என தட்டச்சு செய்யவும்.",
        bankReceiptPrompt: "⚠️ முக்கியம்: பணம் செலுத்திய பின் ரசீதை அனுப்பவும்.",
        agentNotified: "💬 எங்கள் பிரதிநிதிக்கு தெரிவிக்கப்பட்டது! விரைவில் உங்களைத் தொடர்புகொள்வார்கள்.",
        urgentCall: "அவசர தொடர்புக்கு:",
        adminTitle: "👑 நிர்வாக கட்டுப்பாட்டு மையம் 👑",
        adminConnected: "🎉 வாட்ஸ்அப் பாட் வெற்றிகரமாக இணைக்கப்பட்டது! 🎉",
        adminLangSet: "✅ மொழி வெற்றிகரமாக தமிழாக மாற்றப்பட்டது! 🇮🇳"
    },
    ko: {
        name: "Korean",
        flag: "🇰🇷",
        welcomeTitle: "환영합니다",
        welcomeSub: "무엇을 도와드릴까요?\n원하시는 번호나 단어를 답장해 주세요:",
        menu1: "🛍️ 상품 목록 (또는 1)",
        menu2: "💳 계좌 안내 (또는 2)",
        menu3: "🚚 배송 안내 (또는 3)",
        menu4: "📍 문의처 및 위치 (또는 4)",
        menu5: "💬 상담원 연결 (또는 5)",
        orderPrompt: "📦 주문 방법:\n상품명, 성함, 배송지 주소 및 연락처를 남겨주세요.",
        returnMenu: "🔙 메뉴로 돌아가려면 menu를 입력하세요.",
        bankReceiptPrompt: "⚠️ 중요: 입금 후 입금 영수증 사진을 보내주세요.",
        agentNotified: "💬 상담원에게 알림이 전송되었습니다! 영업시간 내에 답변드리겠습니다.",
        urgentCall: "긴급 문의 전화:",
        adminTitle: "👑 슈퍼 봇 관리자 대시보드 👑",
        adminConnected: "🎉 왓츠앱 봇이 성공적으로 연결되었습니다! 🎉",
        adminLangSet: "✅ 언어가 한국어로 설정되었습니다! 🇰🇷"
    },
    es: {
        name: "Spanish",
        flag: "🇪🇸",
        welcomeTitle: "Bienvenido a",
        welcomeSub: "¿Cómo podemos ayudarte hoy?\nResponde con el número o palabra de tu elección:",
        menu1: "🛍️ Productos (o responde 1)",
        menu2: "💳 Datos Bancarios (o responde 2)",
        menu3: "🚚 Envíos y Entrega (o responde 3)",
        menu4: "📍 Contáctanos (o responde 4)",
        menu5: "💬 Atención al Cliente (o responde 5)",
        orderPrompt: "📦 Cómo ordenar:\nEnvía el nombre del producto, tu nombre completo, dirección y teléfono.",
        returnMenu: "🔙 Responde menu para volver.",
        bankReceiptPrompt: "⚠️ Importante: Una vez pagado, envía el comprobante de pago.",
        agentNotified: "💬 ¡Un agente ha sido notificado! Nos pondremos en contacto pronto.",
        urgentCall: "Para consultas urgentes:",
        adminTitle: "👑 PANEL DE CONTROL DEL BOT 👑",
        adminConnected: "🎉 ¡BOT DE WHATSAPP CONECTADO CON ÉXITO! 🎉",
        adminLangSet: "✅ ¡Idioma configurado en Español! 🇪🇸"
    },
    fr: {
        name: "French",
        flag: "🇫🇷",
        welcomeTitle: "Bienvenue chez",
        welcomeSub: "Comment pouvons-nous vous aider aujourd'hui ?\nVeuillez répondre avec le numéro ou mot-clé :",
        menu1: "🛍️ Produits (ou répondez 1)",
        menu2: "💳 Coordonnées Bancaires (ou 2)",
        menu3: "🚚 Livraison & Expédition (ou 3)",
        menu4: "📍 Contactez-nous (ou 4)",
        menu5: "💬 Service Client (ou 5)",
        orderPrompt: "📦 Comment commander :\nEnvoyez le nom du produit, nom complet, adresse et téléphone.",
        returnMenu: "🔙 Répondez menu pour revenir.",
        bankReceiptPrompt: "⚠️ Important : Après paiement, veuillez envoyer une photo du reçu.",
        agentNotified: "💬 Un agent a été informé ! Nous vous répondrons sous peu.",
        urgentCall: "Pour toute urgence :",
        adminTitle: "👑 TABLEAU DE BORD ADMIN 👑",
        adminConnected: "🎉 BOT WHATSAPP CONNECTÉ AVEC SUCCÈS ! 🎉",
        adminLangSet: "✅ Langue configurée en Français ! 🇫🇷"
    }
};

const defaultSettings = {
    botEnabled: true,
    language: "en", // default language
    awaitingLangChoice: false,
    businessName: "Apex Store & Solutions",
    hotline: "+94 7X XXX XXXX",
    email: "support@apexstore.com",
    bankDetails: "🏦 Bank: Commercial Bank\n👤 Account Name: Apex Store\n🔢 Account Number: 800123456789\n📍 Branch: Colombo Main",
    deliveryInfo: "• Local / Metro: 24 - 48 Hours\n• Islandwide / Nationwide: 2 - 3 Days\n• Cash on Delivery (COD) Available!",
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

function buildMainMenu(settings) {
    const l = LANGUAGES[settings.language] || LANGUAGES.en;
    return `👋 *${l.welcomeTitle} ${settings.businessName}!*

${l.welcomeSub}

1️⃣ ${l.menu1}
2️⃣ ${l.menu2}
3️⃣ ${l.menu3}
4️⃣ ${l.menu4}
5️⃣ ${l.menu5}

_Example: Reply *1*_`;
}

function buildProductsList(settings) {
    const l = LANGUAGES[settings.language] || LANGUAGES.en;
    if (!settings.products || settings.products.length === 0) {
        return `🛍️ *PRODUCTS*\n\n_No products listed at the moment._\n\n${l.returnMenu}`;
    }
    const formatted = settings.products.map((p, i) => `${i + 1}. ${p}`).join('\n\n');
    return `🛍️ *PRODUCTS & SERVICES*\n\n${formatted}\n\n${l.orderPrompt}\n\n${l.returnMenu}`;
}

const LANG_CHOICE_MSG = 
`🌐 *CHOOSE BOT LANGUAGE / භාෂාව තෝරන්න:*

Please select the language you want your Bot to use:
කරුණාකර ඔබට අවශ්‍ය භාෂාවේ අංකය Reply කරන්න:

1️⃣ 🇱🇰 *Sinhala* (සිංහල)
2️⃣ 🇬🇧 *English*
3️⃣ 🇮🇳 *Tamil* (தமிழ்)
4️⃣ 🇰🇷 *Korean* (한국어)
5️⃣ 🇪🇸 *Spanish* (Español)
6️⃣ 🇫🇷 *French* (Français)

👉 _Reply with the number (e.g. 1 or 2)_`;

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
            console.log('\n👑 Super Multilingual WhatsApp Business Bot is ONLINE!\n');

            try {
                const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const settings = getSettings();
                settings.awaitingLangChoice = true;
                saveSettings(settings);

                const notifyMsg = 
`🎉 *WHATSAPP BOT CONNECTED SUCCESSFULLY!* 🎉

🟢 *Status:* Online & Active 24/7 on VPS
🛡️ *Anti-Ban Shield:* Enabled
🏪 *Business:* ${settings.businessName}

════════════════════════════
${LANG_CHOICE_MSG}
════════════════════════════

💡 _You can also change language anytime using *.lang*_`;

                await sock.sendMessage(myJid, { text: notifyMsg });
            } catch (err) {
                console.error('Failed to send admin startup alert:', err);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    async function safeReply(from, text, quotedMsg) {
        await sock.sendPresenceUpdate('composing', from);
        await sleep(1200);
        await sock.sendPresenceUpdate('paused', from);
        await sock.sendMessage(from, { text }, { quoted: quotedMsg });
    }

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
            const l = LANGUAGES[settings.language] || LANGUAGES.en;

            // ==========================================
            // 🛡️ ADMIN MODE ("Message Yourself" Only)
            // ==========================================
            if (isFromMe) {
                // Language Selection Handler
                const langMap = { '1': 'si', '2': 'en', '3': 'ta', '4': 'ko', '5': 'es', '6': 'fr' };
                if (settings.awaitingLangChoice && langMap[textLower]) {
                    settings.language = langMap[textLower];
                    settings.awaitingLangChoice = false;
                    saveSettings(settings);
                    const selected = LANGUAGES[settings.language];
                    await sock.sendMessage(from, { 
                        text: `${selected.adminLangSet}\n\n👉 Type *.help* to view your Admin Dashboard in ${selected.name}!` 
                    });
                    continue;
                }

                // Manual .lang command
                if (textLower === '.lang' || textLower === '.language') {
                    settings.awaitingLangChoice = true;
                    saveSettings(settings);
                    await sock.sendMessage(from, { text: LANG_CHOICE_MSG });
                    continue;
                }

                // Set Image
                if (isImage && (textLower === '.setimage' || textLower === '.image')) {
                    try {
                        await sock.sendMessage(from, { text: '⏳ Downloading and saving Welcome Image...' });
                        const buffer = await downloadMediaMessage(
                            msg,
                            'buffer',
                            {},
                            { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
                        );
                        fs.writeFileSync(IMAGE_FILE, buffer);
                        await sock.sendMessage(from, { text: '🎉 *Success!* Welcome Image has been saved!' });
                    } catch (err) {
                        await sock.sendMessage(from, { text: '❌ Failed to save image. Please try again.' });
                    }
                    continue;
                }

                // Admin Help / Dashboard
                if (textLower === '.help' || textLower === '.admin') {
                    const adminHelp = 
`${l.adminTitle}
🌐 *Current Language:* ${l.name} ${l.flag}

⚙️ *Language Control:*
• *.lang* - Switch language (Sinhala, English, Tamil, Korean, Spanish, French)

🖼️ *Welcome Image:*
• Send any photo with caption *.setimage*

🏪 *Store Identity:*
• *.setname <Name>* - Update Store Name
• *.setphone <Number>* - Update Hotline
• *.setemail <Email>* - Update Email

🛍️ *Product Management:*
• *.addproduct <Item - Price - Info>* - Add new product
• *.delproduct <Number>* - Delete product (e.g. .delproduct 1)
• *.listproducts* - List active products

💳 *Payment & Delivery:*
• *.setbank <Details>* - Update Bank Details
• *.setdelivery <Info>* - Update Delivery Info

⚙️ *System Control:*
• *.bot on* / *.bot off* - Turn Bot ON/OFF
• *.preview* - Preview customer welcome screen
• *.stats* - Server RAM & Uptime`;
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
                    const val = text.slice(9).trim();
                    if (val) {
                        settings.businessName = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `✅ Business Name updated to: *${val}*` });
                    }
                    continue;
                }

                if (textLower.startsWith('.setphone ')) {
                    const val = text.slice(10).trim();
                    if (val) {
                        settings.hotline = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `✅ Hotline updated to: *${val}*` });
                    }
                    continue;
                }

                if (textLower.startsWith('.setemail ')) {
                    const val = text.slice(10).trim();
                    if (val) {
                        settings.email = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `✅ Email updated to: *${val}*` });
                    }
                    continue;
                }

                if (textLower.startsWith('.addproduct ')) {
                    const productStr = text.slice(12).trim();
                    if (productStr) {
                        if (!settings.products) settings.products = [];
                        settings.products.push(productStr);
                        saveSettings(settings);
                        await sock.sendMessage(from, { 
                            text: `✅ *Product Added!*\n\n📦 ${productStr}\n📊 Total: ${settings.products.length}` 
                        });
                    }
                    continue;
                }

                if (textLower.startsWith('.delproduct ')) {
                    const idx = parseInt(text.slice(12).trim()) - 1;
                    if (!isNaN(idx) && settings.products && idx >= 0 && idx < settings.products.length) {
                        const removed = settings.products.splice(idx, 1);
                        saveSettings(settings);
                        await sock.sendMessage(from, { 
                            text: `🗑️ Deleted: "${removed[0]}"\n📊 Remaining: ${settings.products.length}` 
                        });
                    } else {
                        await sock.sendMessage(from, { text: '❌ Invalid number. Use *.listproducts*' });
                    }
                    continue;
                }

                if (textLower === '.listproducts') {
                    if (!settings.products || settings.products.length === 0) {
                        await sock.sendMessage(from, { text: '📦 No products added yet! Use *.addproduct*' });
                    } else {
                        const list = settings.products.map((p, i) => `*${i + 1}.* ${p}`).join('\n\n');
                        await sock.sendMessage(from, { text: `🛍️ *PRODUCTS LIST:*\n\n${list}\n\n_To delete, send *.delproduct <num>*_` });
                    }
                    continue;
                }

                if (textLower.startsWith('.setbank ')) {
                    const val = text.slice(9).trim();
                    if (val) {
                        settings.bankDetails = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `✅ Bank Details updated!` });
                    }
                    continue;
                }

                if (textLower.startsWith('.setdelivery ')) {
                    const val = text.slice(13).trim();
                    if (val) {
                        settings.deliveryInfo = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `✅ Delivery Info updated!` });
                    }
                    continue;
                }

                if (textLower === '.preview') {
                    await sock.sendMessage(from, { text: `👁️ *Previewing Customer Welcome (${l.name}):*` });
                    await sendWelcome(from, buildMainMenu(settings), null);
                    continue;
                }

                if (textLower === '.stats') {
                    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                    const uptimeSec = Math.floor(process.uptime());
                    const hours = Math.floor(uptimeSec / 3600);
                    const mins = Math.floor((uptimeSec % 3600) / 60);

                    const statsMsg = 
`📊 *SYSTEM STATUS*
• 🟢 *State:* ${settings.botEnabled ? 'Active (ON)' : 'Muted (OFF)'}
• 🌐 *Language:* ${l.name} ${l.flag}
• 🏪 *Store:* ${settings.businessName}
• 🛍️ *Products:* ${settings.products?.length || 0}
• 🖼️ *Poster:* ${fs.existsSync(IMAGE_FILE) ? 'Active ✅' : 'Default ⚠️'}
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

            const BANK_MSG = 
`💳 *BANK & PAYMENT DETAILS*

${settings.bankDetails}

${l.bankReceiptPrompt}

${l.returnMenu}`;

            const DELIVERY_MSG = 
`🚚 *SHIPPING & DELIVERY*

${settings.deliveryInfo}

${l.returnMenu}`;

            const CONTACT_MSG = 
`📍 *CONTACT US*

📞 *Hotline:* ${settings.hotline}
📧 *Email:* ${settings.email}

${l.returnMenu}`;

            const AGENT_MSG = 
`${l.agentNotified}
${l.urgentCall} *${settings.hotline}*

${l.returnMenu}`;

            if (['1', 'products', 'product', 'catalog', 'price', 'prices'].includes(textLower)) {
                await safeReply(from, buildProductsList(settings), msg);
            } else if (['2', 'bank', 'payment', 'pay'].includes(textLower)) {
                await safeReply(from, BANK_MSG, msg);
            } else if (['3', 'delivery', 'shipping'].includes(textLower)) {
                await safeReply(from, DELIVERY_MSG, msg);
            } else if (['4', 'contact', 'location', 'address'].includes(textLower)) {
                await safeReply(from, CONTACT_MSG, msg);
            } else if (['5', 'agent', 'support', 'human'].includes(textLower)) {
                await safeReply(from, AGENT_MSG, msg);
            } else if (textLower === '!ping') {
                await safeReply(from, '🏓 Pong! Business Bot is active 24/7 on VPS.', msg);
            } else if (['hi', 'hello', 'hey', 'menu', '!menu', 'help', 'start'].includes(textLower)) {
                await sendWelcome(from, buildMainMenu(settings), msg);
            }
        }
    });
}

connectToWhatsApp();
