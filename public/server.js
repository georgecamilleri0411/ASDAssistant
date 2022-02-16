const fs = require('fs');
const qrcode = require('qrcode-terminal');

const { Client } = require('whatsapp-web.js');
const SAVED_SESSION = './saved_session.json';

var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

//Set up express to serve static files from the public folder
app.use (express.static ('public'));

//Start listening on port 8100
app.listen (8881);

// ------------------------------------------------------------------------------------------------

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
client.on ('authenticated', (session) => {
    sessionData = session;
    fs.writeFile (SAVED_SESSION, JSON.stringify(session), (err) => {
        if (err) {
            console.error(err);
        }
    });
});

// Generate QR code to authenticate this device, if required
client.on ('qr', qr => {
    qrcode.generate(qr, {small: true});
});

// Display message when authenticated
client.on ('ready', () => {
    readyState = true;
    console.log('Client is ready!');
});

client.initialize();

// Listen for messages
client.on ('message', message => {
    console.log(message.body);
});

// Reply to message
client.on ('message', message => {
    if(message.body === '!ping') {
        message.reply('pong');
    }
});

// Send message
function sendMessage (messageTo, messageBody)
{
    if (readyState && messageBody.toString().trim().length > 0) {
        chatID = messageTo.toString().trim() + "@c.us";
        client.sendMessage(chatID, messageBody.toString());
        console.log ("Message sent to " + chatID + " (" + messageBody + ").");
    }
}

// ------------------------------------------------------------------------------------------------

//Set up the application to handle GET requests
app.get('/sendWAMessage', function(request, response) {

    var waNumber = request.query['waNumber'] || '';
    var waText = request.query['waText'] || '';

    sendWAMessage (waNumber, waText, function (err, data)
    {
        if (err)
        {
            console.log ("Error: ", err);

            response.status(200);
            response.setHeader('Content-type', 'text/html');
            return response.send(false);
        }
        else
        {
            sendMessage(waNumber, waText);

            response.status(200);
            response.setHeader('Content-type', 'text/html');
            return response.send(data);
        }
    });

});