// Import the modules that this app depends on
const fs = require('fs');

// HTTP Stuff
const http = require('http');
const portNum = 8881 //process.env.PORT || 8881;

var mysql = require('mysql');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

/* ****************
 * WhatsApp stuff *
*******************/

const qrcode = require('qrcode-terminal');
const { Client, LegacySessionAuth } = require('whatsapp-web.js');
const SAVED_SESSION = './saved_session.json';

//Set up express to serve static files from the public folder
app.use (express.static ('public'));

// WhatsApp status flags
let readyState = false;
let messageSent = false;

// Load WhatsApp saved session (if it exists)
let sessionData;
if(fs.existsSync(SAVED_SESSION))
{
    sessionData = require(SAVED_SESSION);
}

// Set up WhatsApp client
const client = new Client({
    authStrategy: new LegacySessionAuth({
        session: sessionData // saved session object
    })
});

// Save WhatsApp session
client.on ('authenticated', (session) => {
    sessionData = session;
    fs.writeFile (SAVED_SESSION, JSON.stringify(session), (err) => {
        if (err) {
            console.error(err);
        }
    });
});

// Generate QR code to authenticate this device to the WhatsApp account, if required
client.on ('qr', qr => {
    qrcode.generate(qr, {small: true});
});

/* *************
 * Email stuff *
****************/

var nodeMailer = require('nodemailer');

//Launch app
//HTTP
http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('Hello World!');
    res.end();
}).listen(portNum);
//app.listen (portNum);

//HTTPS
/*
const https = require('https');
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

https.createServer(options, function (req, res) {
    res.writeHead(200);
    console.log ("working ...");
    res.end("working ...");
}).listen(8881);
*/

// ------------------------------------------------------------------------------------------------
//Set up the application to handle GET requests in relation to WhatsApp messaging
app.get('/sendWAMessage', function(request, response)
{

    // Initialise the WhatsApp client
    client.initialize().then(r => function ()
    {
        console.log("client.initialize() - Promise Resolved");
    }).catch(function ()
    {
        console.log("client.initialize() - Promise Rejected");
    });

    messageSent = false;

    var waNumber = request.query['waNumber'] || '';
    var waText = request.query['waText'] || '';

    // Display message when authenticated
    client.on ('ready', () => {
        readyState = true;
        if (!messageSent)
        {
            sendMessage (waNumber, waText);
        }
    });

    client.destroy().then(r => function ()
    {
        console.log("client.destroy() - Promise Resolved");
    }).catch(function ()
    {
        console.log("client.destroy() - Promise Rejected");
    });

});

// ------------------------------------------------------------------------------------------------

// Send message
function sendMessage (messageTo, messageBody)
{
    let chatID;
    if (readyState && messageBody.toString().trim().length > 0)
    {
        chatID = messageTo.toString().trim() + "@c.us";
        client.sendMessage(chatID, messageBody.toString()).then(r => function ()
        {
            console.log("client.sendMessage(" + chatID + ", " + messageBody.toString() + " - Promise Resolved");
        }).catch(function ()
        {
            console.log("client.sendMessage(" + chatID + ", " + messageBody.toString() + " - Promise Rejected");
        });
        console.log("Message sent to " + chatID + " (" + messageBody + ").");
        messageSent = true;
    }
}

// ------------------------------------------------------------------------------------------------
//Set up the application to handle GET requests sent in relation to email messaging
app.get('/sendEmailMessage', function(request, response)
{

    const emailService = 'gmail';
    const emailUser = 'ASDAssistantAlertEngine@gmail.com';
    const emailPwd = 'M00691035';

    var eTo = request.query['eTo'] || '';
    var eSubject = request.query['eSubject'] || '';
    var eBody = request.query['eBody'] || '';

    var emailTransporter = nodeMailer.createTransport ({
        // service: 'gmail',
        service: emailService,
        auth: {
            //user: 'ASDAssistantAlertEngine@gmail.com',
            //pass: 'M00691035'
            user: emailUser,
            pass: emailPwd
        }
    });

    var emailMessage = {
        from: emailUser,
        to: eTo,
        subject: eSubject,
        text: eBody
    };

    emailTransporter.sendMail (emailMessage, function (error, info) {
        if (error) {
            console.log (error);
            console.log ('To: ' + eTo);
            console.log ('Subject: ' + eSubject);
            console.log ('Body: ' + eBody);
        } else {
            console.log ('Email sent: ' + info.response);
        }
    });

});

// ------------------------------------------------------------------------------------------------
//Set up the application to handle GET requests sent in relation to logging sensor data
app.get('/LogSensorDataOLD', function(request, response)
{

    var SensorID = request.query['SensorID'] || '';
    var SensorValue = request.query['SensorValue'] || '';
    var SensorTS = request.query['SensorTS'] || '';

    logSensorDataOLD (SensorID, SensorValue, SensorTS, function (err, result)
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
            console.log ("Sensor data inserted at ID: [" + result + "]", result);

            response.status(200);
            response.setHeader('Content-type', 'text/html');
            return response.send(result);
        }
    });

});

// ------------------------------------------------------------------------------------------------
// Log sensor data in the MySQL Database
function logSensorDataOLD (SensorID, SensorValue, SensorTS, callback) {

    //Create a connection object
    var conn = mysql.createConnection({
        host: "localhost",
        user: "ASDuser",
        password: "letmein",
        database: "ASD",
        multipleStatements: true
    });

    //Open the connection
    conn.connect (
        function(err) {
            if (err) throw err;
            if (err) console.log (err); // Testing purposes
        }
    );

    let sql = "SET @result = 0;CALL insertSensorReading(" + SensorID + ", '" + SensorValue + "', '" + SensorTS + "', @result); SELECT @result";
    console.log (sql);

    conn.query (sql, function (err, result) {

        if (err) {
            callback (err, false);
            throw err;
            console.log (err); // Testing purposes
        } else {
            console.log (JSON.stringify(result));
            callback(null,result);
        }
    });

    conn.end();

}

// ------------------------------------------------------------------------------------------------
//Set up the application to handle GET requests sent in relation to logging sensor data
app.get('/LogSensorData', function(request, response)
{

    var UserID = request.query['UserID'] || '';
    var SensorType = request.query['SensorType'] || '';
    var SensorValue = request.query['SensorValue'] || '';
    var SensorTS = request.query['SensorTS'] || '';

    logSensorData (UserID, SensorType, SensorValue, SensorTS, function (err, result)
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
            console.log ("Sensor data inserted at ID: [" + result + "]", result);

            response.status(200);
            response.setHeader('Content-type', 'text/html');
            return response.send(result);
        }
    });

});

// ------------------------------------------------------------------------------------------------
// Log sensor data in the MySQL Database
function logSensorData (UserID, SensorType, SensorValue, SensorTS, callback) {

    //Create a connection object
    var conn = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "eric!!cantona7",
        database: "ASD",
        multipleStatements: true
    });

    //Open the connection
    conn.connect (
        function(err) {
            if (err) throw err;
            if (err) console.log (err); // Testing purposes
        }
    );

    let sql = "SET @result = 0;CALL insertSensorReadingNEW(" + UserID + ", '" + SensorType + "', '" + SensorValue + "', '" + SensorTS + "', @result); SELECT @result";
    console.log (sql);

    conn.query (sql, function (err, result) {

        if (err) {
            callback (err, false);
            throw err;
            console.log (err); // Testing purposes
        } else {
            console.log (JSON.stringify(result));
            callback(null,result);
        }
    });

    conn.end();

}
// ------------------------------------------------------------------------------------------------
//Set up the application to handle GET requests sent in relation to TEST
app.get('/Test', function(request, response)
{

    var UserID = request.query['UserID'] || '';

    Test (UserID, function (err, result)
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
            console.log (result);

            response.status(200);
            response.setHeader('Content-type', 'text/html');
            response.setHeader('Access-Control-Allow-Origin', '192.168.4.37'); // Smartphone IP
            response.setHeader('Access-Control-Allow-Origin', '192.168.4.90'); // Smartwatch IP
            response.setHeader('Access-Control-Allow-Methods', '*');
            response.setHeader('Access-Control-Allow-Headers', '*');

            return response.send(result);
        }
    });

});

// ------------------------------------------------------------------------------------------------
// Log sensor data in the MySQL Database
function Test (UserID, callback) {

    //Create a connection object

    // MySQL server on Azure
    var conn = mysql.createConnection({
        host: "asddataserver.mysql.database.azure.com",
        user: "asduser@asddataserver",
        password: "Eric!!Cantona7",
        database: "asd",
        port: 3306
    });

    /*
    // MySQL server on localhost
    var conn = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "eric!!cantona7",
        database: "ASD",
        multipleStatements: true
    });
     */

    //Open the connection
    conn.connect (
        function(err) {
            //if (err) throw err;
            if (err) console.log (err); // Testing purposes
        }
    );

    let sql = "SELECT Details FROM User WHERE U_UniqueID = ?";

    /*
    conn.query (sql, [UserID], function (err, result) {

        if (err) {
            callback (err, false);
            throw err;
            console.log (err); // Testing purposes
        } else {
            console.log (JSON.stringify(result));
            callback(result,true);
        }
    });
    */

    conn.query (sql, [UserID], function (err, result) {

        if (err) {
            console.log (err); // Testing purposes
            callback (err, false);
        } else {
            //console.log (JSON.stringify(result));
            callback (null, result);
        }
    });

    conn.end();

}

// ------------------------------------------------------------------------------------------------
