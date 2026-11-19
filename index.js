import { default as makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SETTINGS_FILE = 'settings.json';
const IMAGE_FILE = 'welcome.jpg';

// Dedicated ADMIN Multilingual Translations
const ADMIN_LANGUAGES = {
    en: {
        name: "English 🇬🇧",
        connectedAlert: "🎉 *WHATSAPP BOT CONNECTED SUCCESSFULLY!* 🎉\n\n🟢 *Status:* Online & Active 24/7 on VPS\n🛡️ *Security:* Anti-Ban Shield Active",
        selectLangPrompt: "🌐 *ADMIN LANGUAGE SELECTION:*\nPlease choose your preferred language for the Admin Control Panel:\n\n1️⃣ 🇱🇰 Sinhala\n2️⃣ 🇬🇧 English\n3️⃣ 🇮🇳 Tamil\n4️⃣ 🇰🇷 Korean\n5️⃣ 🇪🇸 Spanish\n6️⃣ 🇫🇷 French\n\n👉 _Reply with the number (e.g. 1 or 2)_",
        langUpdated: "✅ *Admin Language set to English!* 🇬🇧\n\nType *.help* to view your Admin Control Dashboard.",
        helpTitle: "👑 *SUPER BOT ADMIN CONTROL PANEL* 👑",
        helpLang: "🌐 *Admin Language:* English 🇬🇧",
        helpCommands: 
`⚙️ *Language Settings:*
• *.lang* - Switch Admin Language

🖼️ *Welcome Image Poster:*
• Send any photo with caption *.setimage*

🏪 *Store Settings:*
• *.setname <Name>* - Change Store Name
• *.setphone <Number>* - Change Hotline Number
• *.setemail <Email>* - Change Support Email

🛍️ *Products Management:*
• *.addproduct <Item - Price - Info>* - Add new item
• *.delproduct <Number>* - Delete product (e.g. .delproduct 1)
• *.listproducts* - View all active products

💳 *Payment & Delivery:*
• *.setbank <Details>* - Update Bank details
• *.setdelivery <Info>* - Update Shipping info

⚡ *System Controls:*
• *.bot on* / *.bot off* - Turn Bot Auto-Replies ON/OFF
• *.stats* - Server RAM & Bot Health
• *.preview* - Preview customer menu`,
        botOn: "✅ *Bot Auto-Reply is now ACTIVE (ON)!*",
        botOff: "🛑 *Bot Auto-Reply is now MUTED (OFF)!*",
        nameUpdated: "✅ Store Name updated to:",
        phoneUpdated: "✅ Hotline updated to:",
        emailUpdated: "✅ Email updated to:",
        bankUpdated: "✅ Bank Details updated successfully!",
        deliveryUpdated: "✅ Delivery Info updated successfully!",
        productAdded: "✅ *Product Added Successfully!*",
        productDeleted: "🗑️ *Product Deleted Successfully!*",
        noProducts: "📦 No products added yet! Use *.addproduct* to add.",
        imgSaving: "⏳ Saving image to VPS storage...",
        imgSaved: "🎉 *Welcome Image saved successfully!*",
        imgFailed: "❌ Failed to save image. Please try again."
    },
    si: {
        name: "Sinhala 🇱🇰",
        connectedAlert: "🎉 *වට්ස්ඇප් බොට් සාර්ථකව සම්බන්ධ විය!* 🎉\n\n🟢 *තත්වය:* VPS මත 24/7 ක්‍රියාත්මකයි\n🛡️ *ආරක්ෂාව:* Anti-Ban පද්ධතිය සක්‍රීයයි",
        selectLangPrompt: "🌐 *ඇඩ්මින් භාෂාව තෝරාගැනීම:*\nකරුණාකර ඔබගේ Admin පාලක පුවරුව සඳහා කැමති භාෂාවේ අංකය තෝරන්න:\n\n1️⃣ 🇱🇰 Sinhala (සිංහල)\n2️⃣ 🇬🇧 English\n3️⃣ 🇮🇳 Tamil (தமிழ்)\n4️⃣ 🇰🇷 Korean (한국어)\n5️⃣ 🇪🇸 Spanish (Español)\n6️⃣ 🇫🇷 French (Français)\n\n👉 _අදාළ අංකය reply කරන්න (උදා: 1 හෝ 2)_",
        langUpdated: "✅ *ඇඩ්මින් භාෂාව සිංහල ලෙස සකසන ලදී!* 🇱🇰\n\nපාලක පුවරුව බැලීමට *.help* ලෙස එවන්න.",
        helpTitle: "👑 *සුපිරි බොට් ඇඩ්මින් පාලක පුවරුව* 👑",
        helpLang: "🌐 *ඇඩ්මින් භාෂාව:* සිංහල 🇱🇰",
        helpCommands: 
`⚙️ *භාෂා සැකසුම්:*
• *.lang* - ඇඩ්මින් භාෂාව මාරු කිරීමට

🖼️ *Welcome ඡායාරූපය:*
• ඕනෑම photo එකක් *.setimage* යනුවෙන් caption එක දමා එවන්න

🏪 *ව්‍යාපාරික තොරතුරු:*
• *.setname <නම>* - ව්‍යාපාර නාමය වෙනස් කිරීමට
• *.setphone <අංකය>* - Hotline අංකය වෙනස් කිරීමට
• *.setemail <Email>* - විද්‍යුත් ලිපිනය වෙනස් කිරීමට

🛍️ *භාණ්ඩ කළමනාකරණය:*
• *.addproduct <භාණ්ඩය - මිල - විස්තර>* - අලුත් භාණ්ඩයක් ඇතුළත් කිරීමට
• *.delproduct <අංකය>* - භාණ්ඩයක් ඉවත් කිරීමට (උදා: .delproduct 1)
• *.listproducts* - දැනට ඇති සියලුම භාණ්ඩ බැලීමට

💳 *ගෙවීම් සහ ඩිලිවරි:*
• *.setbank <විස්තර>* - බැංකු ගිණුම් විස්තර යාවත්කාලීන කිරීමට
• *.setdelivery <විස්තර>* - ඩිලිවරි ගාස්තු සහ දින වෙනස් කිරීමට

⚡ *පද්ධති පාලනය:*
• *.bot on* / *.bot off* - බොට් On හෝ Off කිරීමට
• *.stats* - Server මතකය (RAM) සහ ක්‍රියාකාරී කාලය බැලීමට
• *.preview* - පාරිභෝගිකයාට පෙනෙන ආකාරය බලාගැනීමට`,
        botOn: "✅ *බොට් ස්වයංක්‍රීය පිළිතුරු පද්ධතිය ක්‍රියාත්මකයි (ON)!*",
        botOff: "🛑 *බොට් ස්වයංක්‍රීය පිළිතුරු පද්ධතිය අක්‍රීයයි (OFF)!*",
        nameUpdated: "✅ ව්‍යාපාරික නාමය යාවත්කාලීන විය:",
        phoneUpdated: "✅ Hotline අංකය යාවත්කාලීන විය:",
        emailUpdated: "✅ Email ලිපිනය යාවත්කාලීන විය:",
        bankUpdated: "✅ බැංකු ගිණුම් විස්තර සාර්ථකව යාවත්කාලීන විය!",
        deliveryUpdated: "✅ ඩිලිවරි විස්තර සාර්ථකව යාවත්කාලීන විය!",
        productAdded: "✅ *භාණ්ඩය සාර්ථකව ඇතුළත් කරන ලදී!*",
        productDeleted: "🗑️ *භාණ්ඩය සාර්ථකව ඉවත් කරන ලදී!*",
        noProducts: "📦 දැනට කිසිදු භාණ්ඩයක් ඇතුළත් කර නැත! *.addproduct* භාවිත කරන්න.",
        imgSaving: "⏳ ඡායාරූපය VPS මත save වෙමින් පවතී...",
        imgSaved: "🎉 *Welcome ඡායාරූපය සාර්ථකව Save විය!*",
        imgFailed: "❌ ඡායාරූපය Save කිරීමට නොහැකි විය. නැවත උත්සාහ කරන්න."
    },
    ta: {
        name: "Tamil 🇮🇳",
        connectedAlert: "🎉 *வாட்ஸ்அப் பாட் வெற்றிகரமாக இணைக்கப்பட்டது!* 🎉\n\n🟢 *நிலை:* VPS இல் 24/7 இயங்குகிறது\n🛡️ *பாதுகாப்பு:* Anti-Ban Shield செயலில் உள்ளது",
        selectLangPrompt: "🌐 *நிர்வாக மொழி தேர்வு:*\nநிர்வாக கட்டுப்பாட்டுப் பலகத்திற்கான மொழியைத் தேர்ந்தெடுக்கவும்:\n\n1️⃣ 🇱🇰 Sinhala\n2️⃣ 🇬🇧 English\n3️⃣ 🇮🇳 Tamil\n4️⃣ 🇰🇷 Korean\n5️⃣ 🇪🇸 Spanish\n6️⃣ 🇫🇷 French\n\n👉 _எண்ணை அனுப்பவும் (எ.கா: 3)_",
        langUpdated: "✅ *நிர்வாக மொழி தமிழாக மாற்றப்பட்டது!* 🇮🇳\n\nகட்டுப்பாட்டுப் பலகத்தைக் காண *.help* என தட்டச்சு செய்யவும்.",
        helpTitle: "👑 *சூப்பர் பாட் நிர்வாக கட்டுப்பாட்டு பலகம்* 👑",
        helpLang: "🌐 *நிர்வாக மொழி:* தமிழ் 🇮🇳",
        helpCommands: 
`⚙️ *மொழி அமைப்புகள்:*
• *.lang* - நிர்வாக மொழியை மாற்ற

🖼️ *முகப்புப் படம்:*
• எந்தவொரு புகைப்படத்தையும் *.setimage* என தலைப்பிட்டு அனுப்பவும்

🏪 *கடை விவரங்கள்:*
• *.setname <பெயர்>* - கடையின் பெயரை மாற்ற
• *.setphone <எண்>* - தொலைபேசி எண்ணை மாற்ற
• *.setemail <மின்னஞ்சல்>* - மின்னஞ்சலை மாற்ற

🛍️ *பொருட்கள் மேலாண்மை:*
• *.addproduct <பொருள் - விலை - தகவல்>* - புதிய பொருளை சேர்க்க
• *.delproduct <எண்>* - பொருளை நீக்க (எ.கா: .delproduct 1)
• *.listproducts* - அனைத்து பொருட்களையும் பார்க்க

💳 *பணம் மற்றும் டெலிவரி:*
• *.setbank <விவரங்கள்>* - வங்கி விவரங்களை மாற்ற
• *.setdelivery <தகவல்>* - டெலிவரி தகவலை மாற்ற

⚡ *கணினி கட்டுப்பாடுகள்:*
• *.bot on* / *.bot off* - பாட்டை இயக்க / நிறுத்த
• *.stats* - சர்வர் நிலை மற்றும் ரேம் விவரங்கள்
• *.preview* - வாடிக்கையாளர் மெனுவை முன்னோட்டமிட`,
        botOn: "✅ *தானியங்கி பதிலளிப்பு இயக்கப்பட்டது (ON)!*",
        botOff: "🛑 *தானியங்கி பதிலளிப்பு நிறுத்தப்பட்டது (OFF)!*",
        nameUpdated: "✅ கடையின் பெயர் மாற்றப்பட்டது:",
        phoneUpdated: "✅ தொலைபேசி எண் மாற்றப்பட்டது:",
        emailUpdated: "✅ மின்னஞ்சல் மாற்றப்பட்டது:",
        bankUpdated: "✅ வங்கி விவரங்கள் புதுப்பிக்கப்பட்டன!",
        deliveryUpdated: "✅ டெலிவரி தகவல்கள் புதுப்பிக்கப்பட்டன!",
        productAdded: "✅ *பொருள் வெற்றிகரமாக சேர்க்கப்பட்டது!*",
        productDeleted: "🗑️ *பொருள் வெற்றிகரமாக நீக்கப்பட்டது!*",
        noProducts: "📦 பொருட்கள் எதுவும் இல்லை! *.addproduct* பயன்படுத்தவும்.",
        imgSaving: "⏳ படம் சேமிக்கப்படுகிறது...",
        imgSaved: "🎉 *படம் வெற்றிகரமாக சேமிக்கப்பட்டது!*",
        imgFailed: "❌ படத்தை சேமிக்க முடியவில்லை."
    },
    ko: {
        name: "Korean 🇰🇷",
        connectedAlert: "🎉 *왓츠앱 봇이 성공적으로 연결되었습니다!* 🎉\n\n🟢 *상태:* VPS에서 24/7 온라인 작동 중\n🛡️ *보안:* 밴 방지 시스템 활성화",
        selectLangPrompt: "🌐 *관리자 언어 선택:*\n관리자 제어판에 사용할 언어를 선택하세요:\n\n1️⃣ 🇱🇰 Sinhala\n2️⃣ 🇬🇧 English\n3️⃣ 🇮🇳 Tamil\n4️⃣ 🇰🇷 Korean\n5️⃣ 🇪🇸 Spanish\n6️⃣ 🇫🇷 French\n\n👉 _번호를 답장하세요 (예: 4)_",
        langUpdated: "✅ *관리자 언어가 한국어로 설정되었습니다!* 🇰🇷\n\n대시보드를 확인하려면 *.help*를 입력하세요.",
        helpTitle: "👑 *슈퍼 봇 관리자 제어판* 👑",
        helpLang: "🌐 *관리자 언어:* 한국어 🇰🇷",
        helpCommands: 
`⚙️ *언어 설정:*
• *.lang* - 관리자 언어 변경

🖼️ *환영 포스터 이미지:*
• 사진을 첨부하고 *.setimage* 캡션으로 전송

🏪 *상점 기본 정보:*
• *.setname <이름>* - 상점 이름 변경
• *.setphone <번호>* - 고객센터 번호 변경
• *.setemail <이메일>* - 이메일 변경

🛍️ *상품 관리:*
• *.addproduct <상품명 - 가격 - 설명>* - 새 상품 등록
• *.delproduct <번호>* - 상품 삭제 (예: .delproduct 1)
• *.listproducts* - 등록된 상품 전체 목록 확인

💳 *결제 및 배송:*
• *.setbank <계좌정보>* - 입금 계좌 변경
• *.setdelivery <배송정보>* - 배송비 및 기간 변경

⚡ *시스템 제어:*
• *.bot on* / *.bot off* - 자동응답 켜기/끄기
• *.stats* - 서버 상태 및 메모리 확인
• *.preview* - 고객 화면 미리보기`,
        botOn: "✅ *자동 응답 기능이 켜졌습니다 (ON)!*",
        botOff: "🛑 *자동 응답 기능이 꺼졌습니다 (OFF)!*",
        nameUpdated: "✅ 상점 이름이 변경되었습니다:",
        phoneUpdated: "✅ 연락처가 변경되었습니다:",
        emailUpdated: "✅ 이메일이 변경되었습니다:",
        bankUpdated: "✅ 계좌 정보가 수정되었습니다!",
        deliveryUpdated: "✅ 배송 정보가 수정되었습니다!",
        productAdded: "✅ *새 상품이 성공적으로 등록되었습니다!*",
        productDeleted: "🗑️ *상품이 성공적으로 삭제되었습니다!*",
        noProducts: "📦 등록된 상품이 없습니다. *.addproduct*를 사용하세요.",
        imgSaving: "⏳ 이미지를 저장하는 중입니다...",
        imgSaved: "🎉 *환영 이미지가 성공적으로 저장되었습니다!*",
        imgFailed: "❌ 이미지 저장 실패. 다시 시도해 주세요."
    },
    es: {
        name: "Spanish 🇪🇸",
        connectedAlert: "🎉 *¡BOT DE WHATSAPP CONECTADO CON ÉXITO!* 🎉\n\n🟢 *Estado:* Online 24/7 en VPS\n🛡️ *Seguridad:* Anti-Ban Shield Activo",
        selectLangPrompt: "🌐 *SELECCIÓN DE IDIOMA DEL ADMINISTRADOR:*\nElige tu idioma para el Panel de Control:\n\n1️⃣ 🇱🇰 Sinhala\n2️⃣ 🇬🇧 English\n3️⃣ 🇮🇳 Tamil\n4️⃣ 🇰🇷 Korean\n5️⃣ 🇪🇸 Spanish\n6️⃣ 🇫🇷 French\n\n👉 _Responde con el número (ej: 5)_",
        langUpdated: "✅ *¡Idioma del Administrador configurado en Español!* 🇪🇸\n\nEscribe *.help* para ver el Panel de Control.",
        helpTitle: "👑 *PANEL DE CONTROL DEL ADMINISTRADOR* 👑",
        helpLang: "🌐 *Idioma del Administrador:* Español 🇪🇸",
        helpCommands: 
`⚙️ *Idioma:*
• *.lang* - Cambiar idioma del administrador

🖼️ *Póster de Bienvenida:*
• Envía cualquier foto con el texto *.setimage*

🏪 *Datos de la Tienda:*
• *.setname <Nombre>* - Cambiar nombre de la tienda
• *.setphone <Teléfono>* - Cambiar teléfono de contacto
• *.setemail <Email>* - Cambiar correo

🛍️ *Gestión de Productos:*
• *.addproduct <Nombre - Precio - Info>* - Añadir producto
• *.delproduct <Número>* - Eliminar producto (ej: .delproduct 1)
• *.listproducts* - Ver todos los productos activos

💳 *Pagos y Envíos:*
• *.setbank <Datos>* - Cambiar datos bancarios
• *.setdelivery <Info>* - Cambiar tarifas de envío

⚡ *Control del Sistema:*
• *.bot on* / *.bot off* - Activar/Desactivar bot
• *.stats* - Ver RAM y estado del servidor
• *.preview* - Vista previa del menú de clientes`,
        botOn: "✅ *¡El bot ahora está ACTIVO (ON)!*",
        botOff: "🛑 *¡El bot ahora está APAGADO (OFF)!*",
        nameUpdated: "✅ Nombre de la tienda actualizado a:",
        phoneUpdated: "✅ Teléfono actualizado a:",
        emailUpdated: "✅ Email actualizado a:",
        bankUpdated: "✅ ¡Datos bancarios actualizados!",
        deliveryUpdated: "✅ ¡Información de envío actualizada!",
        productAdded: "✅ *¡Producto añadido con éxito!*",
        productDeleted: "🗑️ *¡Producto eliminado con éxito!*",
        noProducts: "📦 ¡No hay productos! Usa *.addproduct*.",
        imgSaving: "⏳ Guardando imagen...",
        imgSaved: "🎉 *¡Imagen de bienvenida guardada!*",
        imgFailed: "❌ Error al guardar la imagen."
    },
    fr: {
        name: "French 🇫🇷",
        connectedAlert: "🎉 *BOT WHATSAPP CONNECTÉ AVEC SUCCÈS !* 🎉\n\n🟢 *Statut :* En ligne 24/7 sur VPS\n🛡️ *Sécurité :* Bouclier Anti-Ban Actif",
        selectLangPrompt: "🌐 *CHOIX DE LA LANGUE ADMINISTRATEUR :*\nChoisissez votre langue pour le panneau de contrôle :\n\n1️⃣ 🇱🇰 Sinhala\n2️⃣ 🇬🇧 English\n3️⃣ 🇮🇳 Tamil\n4️⃣ 🇰🇷 Korean\n5️⃣ 🇪🇸 Spanish\n6️⃣ 🇫🇷 French\n\n👉 _Répondez avec le numéro (ex : 6)_",
        langUpdated: "✅ *Langue administrateur configurée en Français !* 🇫🇷\n\nTapez *.help* pour voir le panneau d'administration.",
        helpTitle: "👑 *PANNEAU DE CONTRÔLE ADMINISTRATEUR* 👑",
        helpLang: "🌐 *Langue Administrateur :* Français 🇫🇷",
        helpCommands: 
`⚙️ *Langue :*
• *.lang* - Changer la langue admin

🖼️ *Affiche de Bienvenue :*
• Envoyez une photo avec la légende *.setimage*

🏪 *Boutique :*
• *.setname <Nom>* - Modifier le nom
• *.setphone <Tél>* - Modifier le numéro
• *.setemail <Email>* - Modifier l'email

🛍️ *Gestion des Produits :*
• *.addproduct <Article - Prix - Info>* - Ajouter un produit
• *.delproduct <Numéro>* - Supprimer un produit
• *.listproducts* - Voir tous les produits

💳 *Paiement & Livraison :*
• *.setbank <Détails>* - Modifier coordonnées bancaires
• *.setdelivery <Info>* - Modifier infos livraison

⚡ *Contrôle Système :*
• *.bot on* / *.bot off* - Activer/Désactiver le bot
• *.stats* - Statut serveur et mémoire
• *.preview* - Aperçu du menu client`,
        botOn: "✅ *Le bot est maintenant ACTIF (ON) !*",
        botOff: "🛑 *Le bot est maintenant DÉSACTIVÉ (OFF) !*",
        nameUpdated: "✅ Nom de la boutique mis à jour :",
        phoneUpdated: "✅ Téléphone mis à jour :",
        emailUpdated: "✅ Email mis à jour :",
        bankUpdated: "✅ Coordonnées bancaires mises à jour !",
        deliveryUpdated: "✅ Informations de livraison mises à jour !",
        productAdded: "✅ *Produit ajouté avec succès !*",
        productDeleted: "🗑️ *Produit supprimé avec succès !*",
        noProducts: "📦 Aucun produit trouvé. Utilisez *.addproduct*.",
        imgSaving: "⏳ Enregistrement de l'image...",
        imgSaved: "🎉 *Image de bienvenue enregistrée !*",
        imgFailed: "❌ Échec de l'enregistrement."
    }
};

const defaultSettings = {
    botEnabled: true,
    adminLang: "en",
    awaitingAdminLang: true,
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

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        generateHighQualityLinkPreview: true,
        syncFullHistory: false
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('\n👑 Super WhatsApp Bot is ONLINE 24/7 on VPS!\n');

            // Send Admin Onboarding to Message Yourself
            setTimeout(async () => {
                try {
                    const normalizedJid = jidNormalizedUser(sock.user.id);
                    const settings = getSettings();
                    settings.awaitingAdminLang = true;
                    saveSettings(settings);

                    const currentAdmin = ADMIN_LANGUAGES[settings.adminLang] || ADMIN_LANGUAGES.en;
                    const startupMessage = 
`${currentAdmin.connectedAlert}

════════════════════════════
${currentAdmin.selectLangPrompt}
════════════════════════════`;

                    // Using direct peer delivery for self-chat
                    await sock.sendMessage(normalizedJid, { text: startupMessage });
                    console.log('📬 Admin startup prompt delivered successfully!');
                } catch (err) {
                    console.error('Error sending startup alert:', err);
                }
            }, 3000); // 3-second delay to ensure Signal session is synchronized
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
            let adminL = ADMIN_LANGUAGES[settings.adminLang] || ADMIN_LANGUAGES.en;

            // ========================================================
            // 🛡️ ADMIN MODE (Focus purely on Admin Control & Language)
            // ========================================================
            if (isFromMe) {
                // Language Selection Handler
                const langMap = { '1': 'si', '2': 'en', '3': 'ta', '4': 'ko', '5': 'es', '6': 'fr' };
                if (settings.awaitingAdminLang && langMap[textLower]) {
                    settings.adminLang = langMap[textLower];
                    settings.awaitingAdminLang = false;
                    saveSettings(settings);
                    
                    const newlySelected = ADMIN_LANGUAGES[settings.adminLang];
                    await sock.sendMessage(from, { text: newlySelected.langUpdated });
                    continue;
                }

                if (textLower === '.lang' || textLower === '.language') {
                    settings.awaitingAdminLang = true;
                    saveSettings(settings);
                    await sock.sendMessage(from, { text: adminL.selectLangPrompt });
                    continue;
                }

                if (textLower === '.help' || textLower === '.admin') {
                    const dashboard = 
`${adminL.helpTitle}
${adminL.helpLang}

${adminL.helpCommands}`;
                    await sock.sendMessage(from, { text: dashboard });
                    continue;
                }

                if (isImage && (textLower === '.setimage' || textLower === '.image')) {
                    try {
                        await sock.sendMessage(from, { text: adminL.imgSaving });
                        const buffer = await downloadMediaMessage(
                            msg,
                            'buffer',
                            {},
                            { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
                        );
                        fs.writeFileSync(IMAGE_FILE, buffer);
                        await sock.sendMessage(from, { text: adminL.imgSaved });
                    } catch (err) {
                        await sock.sendMessage(from, { text: adminL.imgFailed });
                    }
                    continue;
                }

                if (textLower === '.bot on') {
                    settings.botEnabled = true;
                    saveSettings(settings);
                    await sock.sendMessage(from, { text: adminL.botOn });
                    continue;
                }
                if (textLower === '.bot off') {
                    settings.botEnabled = false;
                    saveSettings(settings);
                    await sock.sendMessage(from, { text: adminL.botOff });
                    continue;
                }

                if (textLower.startsWith('.setname ')) {
                    const val = text.slice(9).trim();
                    if (val) {
                        settings.businessName = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `${adminL.nameUpdated} *${val}*` });
                    }
                    continue;
                }

                if (textLower.startsWith('.setphone ')) {
                    const val = text.slice(10).trim();
                    if (val) {
                        settings.hotline = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `${adminL.phoneUpdated} *${val}*` });
                    }
                    continue;
                }

                if (textLower.startsWith('.setemail ')) {
                    const val = text.slice(10).trim();
                    if (val) {
                        settings.email = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: `${adminL.emailUpdated} *${val}*` });
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
                            text: `${adminL.productAdded}\n\n📦 ${productStr}\n📊 Total: ${settings.products.length}` 
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
                            text: `${adminL.productDeleted}\n"${removed[0]}"\n📊 Total: ${settings.products.length}` 
                        });
                    } else {
                        await sock.sendMessage(from, { text: '❌ Invalid index. Use *.listproducts*' });
                    }
                    continue;
                }

                if (textLower === '.listproducts') {
                    if (!settings.products || settings.products.length === 0) {
                        await sock.sendMessage(from, { text: adminL.noProducts });
                    } else {
                        const list = settings.products.map((p, i) => `*${i + 1}.* ${p}`).join('\n\n');
                        await sock.sendMessage(from, { text: `🛍️ *PRODUCTS:*\n\n${list}` });
                    }
                    continue;
                }

                if (textLower.startsWith('.setbank ')) {
                    const val = text.slice(9).trim();
                    if (val) {
                        settings.bankDetails = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: adminL.bankUpdated });
                    }
                    continue;
                }

                if (textLower.startsWith('.setdelivery ')) {
                    const val = text.slice(13).trim();
                    if (val) {
                        settings.deliveryInfo = val;
                        saveSettings(settings);
                        await sock.sendMessage(from, { text: adminL.deliveryUpdated });
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
• 🟢 *State:* ${settings.botEnabled ? 'Active (ON)' : 'Muted (OFF)'}
• 🌐 *Admin Language:* ${adminL.name}
• 🏪 *Store:* ${settings.businessName}
• 🛍️ *Products:* ${settings.products?.length || 0}
• 🖼️ *Poster:* ${fs.existsSync(IMAGE_FILE) ? 'Active ✅' : 'Default ⚠️'}
• 💾 *Memory:* ${mem} MB
• ⏱️ *Uptime:* ${hours}h ${mins}m`;
                    await sock.sendMessage(from, { text: statsMsg });
                    continue;
                }
            }
        }
    });
}

connectToWhatsApp();
