const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
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

async function iniciarBot() {
    console.log('Iniciando conexion con WhatsApp...');
    const { state, saveCreds } = await useMultiFileAuthState('./session_auth');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        console.log('Pidiendo codigo para:', NUMERO_TELEFONO);
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(NUMERO_TELEFONO);
                console.log('\n====================================');
                console.log('⚡ TU CODIGO DE VINCULACION ES:', code);
                console.log('====================================\n');
            } catch (err) {
                console.log('Error pidiendo codigo:', err?.message || err);
            }
        }, 5000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`[WS] Desconectado: ${statusCode}. Reconectando...`);
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
