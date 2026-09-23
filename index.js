const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

// Servidor web para Render 24/7
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Shinra xzy en linea 24/7\n');
}).listen(PORT, () => {
    console.log(`Servidor web activo en el puerto ${PORT}`);
});

const NUMERO_TELEFONO = '51910745575';

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session_auth');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexion cerrada. Reconectando...', shouldReconnect);
            if (shouldReconnect) {
                setTimeout(iniciarBot, 5000);
            }
        } else if (connection === 'open') {
            console.log('\n====================================');
            console.log('✅ Shinra xzy conectado con exito');
            console.log('====================================\n');
        }
    });

    // Solicita el código de 8 dígitos después de que el socket inicialice
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(NUMERO_TELEFONO);
                console.log('\n====================================');
                console.log('⚡ TU CODIGO DE VINCULACION ES:', code);
                console.log('====================================\n');
            } catch (err) {
                console.log('Error al pedir el codigo:', err?.message || err);
            }
        }, 10000); // 10 segundos de espera para conexión limpia
    }

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const texto = m.message.conversation || m.message.extendedTextMessage?.text || '';
        const remitente = m.key.remoteJid;

        if (texto.toLowerCase() === '.menu' || texto.toLowerCase() === '.ping') {
            await sock.sendMessage(remitente, { text: '⚡ *Shinra xzy esta activo y en linea 24/7*' });
        }
    });
}

iniciarBot();
