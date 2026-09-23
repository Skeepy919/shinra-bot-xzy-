const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

// 1. Servidor web para mantener Render activo 24/7
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Shinra xzy activo 24/7\n');
}).listen(PORT, () => {
    console.log(`[HTTP] Servidor en puerto ${PORT}`);
});

const NUMERO_TELEFONO = '51910745575';
let codigoSolicitado = false;

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session_auth');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: Browsers.ubuntu('Chrome')
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Disparo oficial: se ejecuta SOLO cuando WhatsApp ya tiene el canal listo
        if (qr && !sock.authState.creds.registered && !codigoSolicitado) {
            codigoSolicitado = true;
            try {
                await delay(2000);
                const code = await sock.requestPairingCode(NUMERO_TELEFONO);
                console.log('\n====================================');
                console.log('⚡ TU CODIGO DE VINCULACION ES:', code);
                console.log('====================================\n');
            } catch (err) {
                console.log('Error obteniendo pairing code:', err?.message || err);
                codigoSolicitado = false;
            }
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const reconectar = statusCode !== DisconnectReason.loggedOut;
            console.log(`[WS] Desconectado (status: ${statusCode}). Reconectando: ${reconectar}`);
            if (reconectar) {
                setTimeout(iniciarBot, 4000);
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
            await sock.sendMessage(remitente, { text: '⚡ *Shinra xzy esta en linea y funcionando 24/7*' });
        }
    });
}

iniciarBot();
