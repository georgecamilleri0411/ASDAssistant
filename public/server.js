const fs = require('fs');
const qrcode = require('qrcode-terminal');

const { Client } = require('whatsapp-web.js');
const SAVED_SESSION = './saved_session.json';

// Load saved session (if it exists)
let sessionData;
if(fs.existsSync(SAVED_SESSION)) {
    sessionData = require(SAVED_SESSION);
}

const client = new Client({
    session: sessionData // saved session object
})

/*
const client = new Client({
    puppeteer: {
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    }
})
*/

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
    console.log('Client is ready!');
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
//        message.to ('35679968966');
//        message.body('Test1234');
    }
});

// Send message.
contactList = client.getContacts();
contact = client.getContactById('Vanessa Camilleri');
console.log (contact.name);
//client.sendMessage("79968966", "Test ad hoc message.");

//function sendMessage (messageTo, messageBody) {
//    if (messageBody.toString().trim().length > 0) {
//        const contactList = /*await*/ client.getContacts();
//        const contact = contactList.find(({ name }) => name === messageTo);
//        const { id: { _serialized: chatId } } = contact;
//        /*await*/ client.sendMessage((chatId, messageBody.toString()));
//    }
//}

