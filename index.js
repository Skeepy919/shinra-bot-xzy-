const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Shinra xzy activo 24/7\n');
}).listen(PORT, () => {
    console.log(`[HTTP] Servidor listo en puerto ${PORT}`);
});

const NUMERO_TELEFONO = '51910745575';
let codigoPedido = false;

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session_auth');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Se solicita el código únicamente cuando WhatsApp emite el evento de handshake preliminar
        if (!sock.authState.creds.registered && !codigoPedido && qr) {
            codigoPedido = true;
            await delay(1500);
            try {
                const code = await sock.requestPairingCode(NUMERO_TELEFONO);
                console.log('\n====================================');
                console.log('⚡ TU CODIGO DE VINCULACION ES:', code);
                console.log('====================================\n');
            } catch (err) {
                console.log('[ERROR PAIRING]:', err?.message || err);
                codigoPedido = false;
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
        if (texto.toLowerCase() === '.menu' || texto.toLowerCase() === '.ping') {
            await sock.sendMessage(m.key.remoteJid, { text: '⚡ *Shinra xzy esta en linea 24/7*' });
        }
    });
}

iniciarBot();
