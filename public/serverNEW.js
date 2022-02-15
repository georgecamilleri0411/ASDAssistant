// Path to store the saved WhatsApp authenticated session
const SAVED_SESSION = './saved_session.json';

//Import the modules that this app depends on
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const mysql = require('mysql');
const { Client } = require('whatsapp-web.js');

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

//Set up the application to handle GET requests sent when student identifies themself
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
            console.log ("Student exists?: <" + studentNumber + ">, <" + studentName + ">", data);

            response.status(200);
            response.setHeader('Content-type', 'text/html');
            return response.send(data);
        }
    });

});

// ------------------------------------------------------------------------------------------------

/*
Sends a message via WhatsApp
 */
function sendWAMessage (waNumber, waText, callback)
{

    waNumber = waNumber.toString().replaceAll(' ','');
    waText = waText.toString();
    if (waNumber.toString().substring(0,1) === '+')
    {
        waNumber = waNumber.toString().substring(1);
    }

    sendMessage(waNumber, waText);

    // No error
    //callback(null, false);
    // Error
    //callback(null,true)

}

// ------------------------------------------------------------------------------------------------

// Send message.
function sendMessage (messageTo, messageBody) {
    if (messageBody.toString().trim().length > 0) {
        const chatID = messageTo + "@c.us";
        client.sendMessage(chatID, messageBody.toString());
    }
}

// Load saved session (if it exists)
let sessionData;

function init()
{
    if (fs.existsSync(SAVED_SESSION))
    {
        sessionData = require(SAVED_SESSION);
    }

    var client = new Client
    (
        {
            session: sessionData // saved session object
        }
    )

}

// Save session
client.on ('authenticated', (session) => {
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
    sendMessage("35679968966","Hello from the other room!");
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

// Send message.
function sendMessage (messageTo, messageBody) {
    if (messageBody.toString().trim().length > 0) {
        const chatID = messageTo + "@c.us";
        client.sendMessage(chatID, messageBody.toString());
    }
}