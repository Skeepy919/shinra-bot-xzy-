const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

// Servidor HTTP simple para mantener Render activo 24/7 sin que detenga la instancia
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Shinra xzy activo 24/7\n');
}).listen(PORT, () => {
    console.log(`[HTTP] Servidor activo en puerto ${PORT}`);
});

const NUMERO_TELEFONO = '51910745575';
let pairingSolicitado = false;

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session_auth');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        // Configuración oficial para pairing code
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    // Evento oficial: en cuanto Baileys genera el ticket preliminar de sesión (qr), solicitamos el pairing code
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !sock.authState.creds.registered && !pairingSolicitado) {
            pairingSolicitado = true;
            try {
                await delay(1500);
                const code = await sock.requestPairingCode(NUMERO_TELEFONO);
                console.log('\n====================================');
                console.log('⚡ TU CODIGO DE VINCULACION ES:', code);
                console.log('====================================\n');
            } catch (err) {
                console.log('[ERROR PAIRING]:', err?.message || err);
                pairingSolicitado = false;
            }
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`[WS] Desconectado (${statusCode}). Reconectando...`);
            if (statusCode !== DisconnectReason.loggedOut) {
                setTimeout(iniciarBot, 3000);
            }
        } else if (connection === 'open') {
            console.log('\n====================================');
            console.log('✅ Shinra xzy conectado con exito a WhatsApp');
            console.log('====================================\n');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const texto = m.message.conversation || m.message.extendedTextMessage?.text || '';
        const remitente = m.key.remoteJid;

        if (texto.toLowerCase() === '.menu' || texto.toLowerCase() === '.ping') {
            await sock.sendMessage(remitente, { text: '⚡ *Shinra xzy esta activo 24/7*' });
        }
    });
}

iniciarBot();
