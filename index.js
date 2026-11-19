import { default as makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage, fetchLatestBaileysVersion, jidNormalizedUser } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import readline from 'readline';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SETTINGS_FILE = 'settings.json';
const IMAGE_FILE = 'welcome.jpg';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// Localization for all 6 languages
const LOCALES = {
    si: {
        name: "Sinhala 🇱🇰",
        welcomeTitle: "👋 ආයුබෝවන් User!",
        welcomeDesc: "ඔබගේ WhatsApp Bot සාර්ථකව සම්බන්ධ විය!\n\nභාෂාව සිංහල ලෙස සකසන ලදී. 🇱🇰\nපහත විධාන මඟින් ඔබට බොට් පාලනය කළ හැක:",
        helpTitle: "👑 *සුපිරි බොට් පාලක පුවරුව* 👑",
        commands: 
`🌐 *භාෂාව වෙනස් කිරීමට:*
• *.lang* - භාෂාව මාරු කරන්න

🖼️ *Welcome ඡායාරූපය:*
• ඕනෑම photo එකක් *.setimage* ලෙස caption දමා එවන්න

🏪 *ව්‍යාපාරික තොරතුරු:*
• *.setname <නම>* - ව්‍යාපාර නාමය
• *.setphone <අංකය>* - Hotline අංකය
• *.setemail <Email>* - Email ලිපිනය

🛍️ *භාණ්ඩ කළමනාකරණය:*
• *.addproduct <භාණ්ඩය - මිල - විස්තර>* - භාණ්ඩ ඇතුළත් කිරීම
• *.delproduct <අංකය>* - භාණ්ඩ ඉවත් කිරීම (උදා: .delproduct 1)
• *.listproducts* - භාණ්ඩ ලැයිස්තුව

💳 *ගෙවීම් සහ ඩිලිවරි:*
• *.setbank <විස්තර>* - බැංකු ගිණුම් විස්තර
• *.setdelivery <විස්තර>* - ඩිලිවරි තොරතුරු

⚡ *පද්ධති පාලනය:*
• *.bot on* / *.bot off* - බොට් On / Off
• *.stats* - Server RAM සහ තත්වය`,
        convertedAlert: "✅ *භාෂාව සාර්ථකව සිංහල ලෙස සකසන ලදී!* 🇱🇰\n\nපාලක පුවරුව බැලීමට *.help* ලෙස එවන්න."
    },
    en: {
        name: "English 🇬🇧",
        welcomeTitle: "👋 Hello User!",
        welcomeDesc: "Your WhatsApp Bot has connected successfully!\n\nLanguage has been set to English. 🇬🇧\nUse the commands below to control your bot:",
        helpTitle: "👑 *SUPER BOT CONTROL PANEL* 👑",
        commands: 
`🌐 *Language Settings:*
• *.lang* - Change Language anytime

🖼️ *Welcome Image Poster:*
• Send any photo with caption *.setimage*

🏪 *Store Settings:*
• *.setname <Name>* - Change Store Name
• *.setphone <Number>* - Change Hotline Number
• *.setemail <Email>* - Change Support Email

🛍️ *Products Management:*
• *.addproduct <Item - Price - Info>* - Add new item
• *.delproduct <Number>* - Delete item (e.g. .delproduct 1)
• *.listproducts* - View all active items

💳 *Payment & Delivery:*
• *.setbank <Details>* - Update Bank details
• *.setdelivery <Info>* - Update Shipping info

⚡ *System Controls:*
• *.bot on* / *.bot off* - Bot Auto-Reply ON/OFF
• *.stats* - Server RAM & Uptime`,
        convertedAlert: "✅ *Language successfully converted to English!* 🇬🇧\n\nType *.help* to view your Control Panel."
    },
    ta: {
        name: "Tamil 🇮🇳",
        welcomeTitle: "👋 வணக்கம் User!",
        welcomeDesc: "உங்கள் வாட்ஸ்அப் பாட் வெற்றிகரமாக இணைக்கப்பட்டது!\n\nமொழி தமிழாக அமைக்கப்பட்டது. 🇮🇳",
        helpTitle: "👑 *சூப்பர் பாட் கட்டுப்பாட்டு மையம்* 👑",
        commands: 
`🌐 *மொழி:*
• *.lang* - மொழியை மாற்ற

🖼️ *முகப்புப் படம்:*
• எந்தவொரு புகைப்படத்தையும் *.setimage* என அனுப்பவும்

🏪 *கடை விவரங்கள்:*
• *.setname <பெயர்>* - கடையின் பெயரை மாற்ற
• *.setphone <எண்>* - தொலைபேசி எண்ணை மாற்ற

🛍️ *பொருட்கள்:*
• *.addproduct <பொருள் - விலை>* - புதிய பொருளை சேர்க்க
• *.delproduct <எண்>* - பொருளை நீக்க
• *.listproducts* - பொருட்களை பார்க்க

⚡ *கட்டுப்பாடுகள்:*
• *.bot on* / *.bot off* - பாட்டை இயக்க / நிறுத்த
• *.stats* - சர்வர் நிலை`,
        convertedAlert: "✅ *மொழி வெற்றிகரமாக தமிழாக மாற்றப்பட்டது!* 🇮🇳\n\nகட்டுப்பாட்டுப் பலகத்தைக் காண *.help* என அனுப்பவும்."
    },
    ko: {
        name: "Korean 🇰🇷",
        welcomeTitle: "👋 안녕하세요 User님!",
        welcomeDesc: "왓츠앱 봇이 성공적으로 연결되었습니다!\n\n언어가 한국어로 설정되었습니다. 🇰🇷",
        helpTitle: "👑 *슈퍼 봇 제어판* 👑",
        commands: 
`🌐 *언어 변경:*
• *.lang* - 언어 변경

🖼️ *환영 이미지:*
• 사진에 *.setimage* 캡션을 달아 전송

🏪 *상점 정보:*
• *.setname <이름>* - 상점 이름 변경
• *.setphone <번호>* - 전화번호 변경

🛍️ *상품 관리:*
• *.addproduct <상품명 - 가격>* - 새 상품 등록
• *.delproduct <번호>* - 상품 삭제
• *.listproducts* - 상품 목록 확인

⚡ *시스템:*
• *.bot on* / *.bot off* - 자동응답 켜기/끄기
• *.stats* - 서버 상태 확인`,
        convertedAlert: "✅ *언어가 한국어로 성공적으로 변경되었습니다!* 🇰🇷\n\n제어판을 확인하려면 *.help*를 입력하세요."
    },
    es: {
        name: "Spanish 🇪🇸",
        welcomeTitle: "👋 ¡Hola User!",
        welcomeDesc: "¡Tu Bot de WhatsApp se ha conectado con éxito!\n\nEl idioma se ha configurado en Español. 🇪🇸",
        helpTitle: "👑 *PANEL DE CONTROL DEL BOT* 👑",
        commands: 
`🌐 *Idioma:*
• *.lang* - Cambiar idioma

🖼️ *Imagen:*
• Envía una foto con *.setimage*

🏪 *Tienda:*
• *.setname <Nombre>* - Cambiar nombre
• *.setphone <Teléfono>* - Cambiar teléfono

🛍️ *Productos:*
• *.addproduct <Nombre - Precio>* - Añadir producto
• *.delproduct <Número>* - Eliminar producto
• *.listproducts* - Ver productos

⚡ *Sistema:*
• *.bot on* / *.bot off* - Encender/Apagar
• *.stats* - Estado del servidor`,
        convertedAlert: "✅ *¡Idioma cambiado con éxito a Español!* 🇪🇸\n\nEscribe *.help* para ver el Panel de Control."
    },
    fr: {
        name: "French 🇫🇷",
        welcomeTitle: "👋 Bonjour User !",
        welcomeDesc: "Votre Bot WhatsApp est connecté avec succès !\n\nLa langue a été configurée en Français. 🇫🇷",
        helpTitle: "👑 *PANNEAU DE CONTRÔLE* 👑",
        commands: 
`🌐 *Langue :*
• *.lang* - Changer la langue

🖼️ *Image :*
• Envoyez une photo avec *.setimage*

🏪 *Boutique :*
• *.setname <Nom>* - Changer le nom
• *.setphone <Numéro>* - Changer le numéro

🛍️ *Produits :*
• *.addproduct <Article - Prix>* - Ajouter un produit
• *.delproduct <Numéro>* - Supprimer un produit
• *.listproducts* - Liste des produits

⚡ *Système :*
• *.bot on* / *.bot off* - Activer/Désactiver
• *.stats* - Statut du serveur`,
        convertedAlert: "✅ *Langue configurée avec succès en Français !* 🇫🇷\n\nTapez *.help* pour voir le panneau."
    }
};

const defaultSettings = {
    botEnabled: true,
    userLang: null,
    awaitingLangChoice: true,
    businessName: "Apex Store & Solutions",
    hotline: "+94 7X XXX XXXX",
    email: "support@apexstore.com",
    bankDetails: "🏦 Bank: Commercial Bank\n👤 Account Name: Apex Store\n🔢 Account Number: 800123456789\n📍 Branch: Colombo Main",
    deliveryInfo: "• Local / Metro: 24 - 48 Hours\n• Islandwide: 2 - 3 Days\n• Cash on Delivery Available!",
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

const INITIAL_LANGUAGE_PROMPT = 
`👋 *Hello User!*
*Please select your language to continue:*

1️⃣ 🇱🇰 Sinhala (සිංහල)
2️⃣ 🇬🇧 English
3️⃣ 🇮🇳 Tamil (தமிழ்)
4️⃣ 🇰🇷 Korean (한국어)
5️⃣ 🇪🇸 Spanish (Español)
6️⃣ 🇫🇷 French (Français)

👉 _Reply with the number (e.g. 1 or 2)_`;

let pairingInterval = null;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');
    const { version } = await fetchLatestBaileysVersion();

    // FIXED: Pure state.keys without cache wrapper to prevent Bad MAC error
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
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
                console.log('⏱️ (Valid for 60 seconds - will auto-refresh if expired)');
                console.log('======================================================');
                console.log('📌 WhatsApp -> Linked Devices -> Link a Device');
                console.log('📌 Tap "Link with phone number instead" at the bottom');
                console.log('📌 Enter the code above!\n');
            } catch (err) {
                // Ignore transient errors
            }
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
            console.log('\n🎉 ================================================');
            console.log('✅ WhatsApp Bot is Successfully Connected and Ready!');
            console.log('================================================\n');

            // Send startup prompt to Message Yourself
            setTimeout(async () => {
                try {
                    const normalizedJid = jidNormalizedUser(sock.user.id);
                    const settings = getSettings();
                    settings.awaitingLangChoice = true;
                    saveSettings(settings);

                    await sock.sendMessage(normalizedJid, { text: INITIAL_LANGUAGE_PROMPT });
                    console.log('📬 Language Prompt delivered to Message Yourself!');
                } catch (err) {
                    console.error('Error sending startup prompt:', err);
                }
            }, 3000);
        }
    });

    sock.ev.on('creds.update', saveCreds);

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
            // 🛡️ MESSAGE YOURSELF (USER / ADMIN SIDE)
            // ==========================================
            if (isFromMe) {
                const langMap = { '1': 'si', '2': 'en', '3': 'ta', '4': 'ko', '5': 'es', '6': 'fr' };

                if (settings.awaitingLangChoice && langMap[textLower]) {
                    settings.userLang = langMap[textLower];
                    settings.awaitingLangChoice = false;
                    saveSettings(settings);

                    const chosen = LOCALES[settings.userLang];
                    const convertedMessage = 
`${chosen.welcomeTitle}
${chosen.welcomeDesc}

${chosen.helpTitle}
${chosen.commands}`;

                    await sock.sendMessage(from, { text: convertedMessage });
                    continue;
                }

                if (textLower === '.lang' || textLower === '.language') {
                    settings.awaitingLangChoice = true;
                    saveSettings(settings);
                    await sock.sendMessage(from, { text: INITIAL_LANGUAGE_PROMPT });
                    continue;
                }

                const currentLocale = LOCALES[settings.userLang] || LOCALES.en;

                if (textLower === '.help' || textLower === '.menu') {
                    const helpMsg = 
`${currentLocale.helpTitle}
${currentLocale.commands}`;
                    await sock.sendMessage(from, { text: helpMsg });
                    continue;
                }

                if (isImage && (textLower === '.setimage' || textLower === '.image')) {
                    try {
                        const buffer = await downloadMediaMessage(
                            msg,
                            'buffer',
                            {},
                            { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
                        );
                        fs.writeFileSync(IMAGE_FILE, buffer);
                        await sock.sendMessage(from, { text: '🎉 Welcome Image has been saved!' });
                    } catch (err) {
                        await sock.sendMessage(from, { text: '❌ Failed to save image.' });
                    }
                    continue;
                }

                if (textLower === '.bot on') {
                    settings.botEnabled = true;
                    saveSettings(settings);
                    await sock.sendMessage(from, { text: '✅ Bot Auto-Reply is now ON!' });
                    continue;
                }
                if (textLower === '.bot off') {
                    settings.botEnabled = false;
                    saveSettings(settings);
                    await sock.sendMessage(from, { text: '🛑 Bot Auto-Reply is now OFF!' });
                    continue;
                }

                if (textLower.startsWith('.setname ')) {
                    settings.businessName = text.slice(9).trim();
                    saveSettings(settings);
                    await sock.sendMessage(from, { text: `✅ Name updated to: *${settings.businessName}*` });
                    continue;
                }

                if (textLower.startsWith('.addproduct ')) {
                    const item = text.slice(12).trim();
                    if (!settings.products) settings.products = [];
                    settings.products.push(item);
                    saveSettings(settings);
                    await sock.sendMessage(from, { text: `✅ Added: ${item}` });
                    continue;
                }

                if (textLower === '.listproducts') {
                    const list = (settings.products || []).map((p, i) => `${i + 1}. ${p}`).join('\n');
                    await sock.sendMessage(from, { text: `🛍️ *PRODUCTS:*\n\n${list}` });
                    continue;
                }

                if (textLower === '.stats') {
                    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                    await sock.sendMessage(from, { text: `📊 RAM: ${mem} MB | Lang: ${currentLocale.name}` });
                    continue;
                }
            }
        }
    });
}

connectToWhatsApp();
