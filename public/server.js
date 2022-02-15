const fs = require('fs');
const qrcode = require('qrcode-terminal');

const { Client } = require('whatsapp-web.js');
const SAVED_SESSION = './saved_session.json';

let readyState = false;

// Load saved session (if it exists)
let sessionData;
if(fs.existsSync(SAVED_SESSION)) {
    sessionData = require(SAVED_SESSION);
}

const client = new Client({
    session: sessionData // saved session object
})


// Save session
client.on('authenticated', (session) => {
    sessionData = session;
    fs.writeFile(SAVED_SESSION, JSON.stringify(session), (err) => {
        if (err) {
            console.error(err);
        }
    });
});

// Generate QR code to authenticate this device
client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

// Display message when authenticated
client.on('ready', () => {
    readyState = true;
    console.log('Client is ready!');
    sendMessage("35679968966","Aloha!");
});

client.initialize();

// Listen for messages
client.on('message', message => {
    console.log(message.body);
});

// Reply to message
client.on('message', message => {
    if(message.body === '!ping') {
        message.reply('pong');
    }
});

// Send message
function sendMessage (messageTo, messageBody)
{
    if (messageBody.toString().trim().length > 0) {
        chatID = messageTo.toString().trim() + "@c.us";
        client.sendMessage(chatID, messageBody.toString());
    }
}

