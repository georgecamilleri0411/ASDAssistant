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

//Set up express to serve static files from the public folder
app.use (express.static ('public'));

/* ****************
 * WhatsApp stuff *
*******************/

const qrcode = require('qrcode-terminal');
const { Client, LegacySessionAuth } = require('whatsapp-web.js');
const SAVED_SESSION = './saved_session.json';

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

/* **********************
 * Classification stuff *
************************/
let meanDiffX = 0;
let meanDiffY = 0;
let meanDiffZ = 0;

/* ***************
 * Web app stuff *
*****************/
//Set up express to serve static files from the public folder
app.use (express.static ('public'));
app.listen (portNum, () => {
    console.log ("ASDAssist server running on port " + portNum);
});

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

    var eTo = request.query['eTo'] || '';
    var eSubject = request.query['eSubject'] || '';
    var eBody = request.query['eBody'] || '';

    sendEmailMessage(eTo, eSubject, eBody);

});

// ------------------------------------------------------------------------------------------------
// Send message
function sendEmailMessage (messageTo, messageSubject, messageBody) {

    const emailService = 'gmail';
    const emailUser = 'ASDAssistantAlertEngine@gmail.com';
    const emailPwd = 'M00691035';

    var emailTransporter = nodeMailer.createTransport ({
        // service: 'gmail',
        service: emailService,
        auth: {
            user: emailUser,
            pass: emailPwd
        }
    });

    var emailMessage = {
        from: emailUser,
        to: messageTo,
        subject: messageSubject,
        text: messageBody
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

}

// ------------------------------------------------------------------------------------------------
//Set up the application to handle GET requests sent in relation to TestHRM
app.get('/TestHRM', function(request, response)
{

    var UserID = request.query['UserID'] || '';
    var SensorTS = request.query['SensorTS'] || '';
    var SensorValue = request.query['SensorValue'] || '';

    TestHRM (UserID, SensorTS, SensorValue, function (err, result)
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
            //console.log (JSON.stringify(result));

            response.status(200);
            response.setHeader('Content-type', 'text/html');

            return response.send(result);
        }
    });

});

// ------------------------------------------------------------------------------------------------
// Log sensor data in the MySQL Database
function TestHRM (UserID, LogTimeStamp, SensorValue, callback) {

    //Create a connection object

    // MySQL server on Azure
    /*
    var conn = mysql.createConnection({
        host: "asddataserver.mysql.database.azure.com",
        user: "asduser@asddataserver",
        password: "Eric!!Cantona7",
        database: "asd",
        port: 3306
    });
    */

    // MySQL server on localhost
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
            //if (err) throw err;
            if (err) console.log (err); // Testing purposes
        }
    );

    // TEST
    //let sql = "SELECT Details FROM User WHERE U_UniqueID = ?";

    let sql = "SET @result = 0;CALL insertTestDataHRM(" + UserID + ", '" + LogTimeStamp + "', " + SensorValue + ", @result); SELECT @result";
    //console.log (sql);

    conn.query (sql, function (err, result) {

        if (err) {
            callback (err, false);
            throw err;
            console.log (err); // Testing purposes
        } else {
            //console.log (JSON.stringify(result));
            callback(null,result);
        }
    });


    conn.end();

}

// ------------------------------------------------------------------------------------------------

//Set up the application to handle GET requests sent in relation to TestACCEL
app.get('/TestACCEL', function(request, response)
{
    var UserID = request.query['UserID'] || '';
    var SensorTS = request.query['SensorTS'] || '';
    //var SensorTSMS = request.query['SensorTSMS'] || '';
    var SensorValueX = request.query['SensorX'] || '';
    var SensorValueY = request.query['SensorY'] || '';
    var SensorValueZ = request.query['SensorZ'] || '';

    TestACCEL (UserID, SensorTS, SensorValueX, SensorValueY, SensorValueZ, function (err, result)
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
            //console.log (result);

            response.status(200);
            response.setHeader('Content-type', 'text/html');

            return response.send(result);
        }
    });

});

// ------------------------------------------------------------------------------------------------
// Log sensor data in the MySQL Database
function TestACCEL (UserID, LogTimeStamp, SensorX, SensorY, SensorZ, callback) {

    //Create a connection object

    // MySQL server on Azure
    /*
    var conn = mysql.createConnection({
        host: "asddataserver.mysql.database.azure.com",
        user: "asduser@asddataserver",
        password: "Eric!!Cantona7",
        database: "asd",
        port: 3306
    });
    */

    // MySQL server on localhost
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
            //if (err) throw err;
            if (err) console.log (err); // Testing purposes
        }
    );

    let sql = "SET @result = 0;CALL insertTestDataACCEL(" + UserID + ", '" + LogTimeStamp + "', " + SensorX + ", " + SensorY + ", " + SensorZ + ", @result); SELECT @result";

    conn.query (sql, function (err, result) {

        if (err) {
            callback (err, false);
            throw err;
            console.log (err); // Testing purposes
        } else {
            //console.log (JSON.stringify(result));
            callback(null,result);
        }
    });

    conn.end();

}

// ------------------------------------------------------------------------------------------------
//Set up the application to handle GET requests sent in relation to ClassifyUserData
app.get('/ClassifyUserData', function(request, response)
{

    var UserID = request.query['UserID'] || '';

    classifyUserData (UserID, function (err, result)
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
            response.status(200);
            response.setHeader('Content-type', 'text/html');

            //console.log(JSON.stringify(result));
            return response.send(result);

        }
    });

});

// ------------------------------------------------------------------------------------------------
// Classify user data for this user
function classifyUserData (UserID, callback) {

    //Create a connection object
    // MySQL server on localhost
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

    //let sql = "SELECT classifyUserData(" + UserID + ")";
    let sql = "set @result = 0; CALL sp_classifyUserData(" + UserID + ", @result);SELECT @result;"

    conn.query (sql, function (err, result) {

        if (err) throw err;
        if (err) console.log (err);

        if (err) {
            callback (err, false);
        } else {
            if (JSON.stringify(result).length < 2) {
                callback(null, false);
            } else {
                var smm = JSON.stringify(result);
                if (smm.includes(":1}]])") == false) {
                    console.log ("Classification has predicted no SMM.");
                }
                else
                {
                    console.log ("Classification has predicted SMM!");
                }
                callback(null, result);
            }
        }
    });

    conn.end();

}

// ------------------------------------------------------------------------------------------------
//Set up the application to handle GET requests sent in relation to SendAlarmEmailAddress
app.get('/SendAlarmEmail', function(request, response)
{

    var UserID = request.query['UserID'] || '';

    getContactEmailAddress (UserID, function (err, result)
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
            response.status(200);
            response.setHeader('Content-type', 'text/html');

            if (JSON.stringify(result).includes("null") == true) {
                return response.send(false);
            } else {
                let msgSubject = "ALERT message from ASD Assistant";
                let msgBody = "This is an alert message from ASDAssistant. The system has classified recent " +
                    "hand gestures as being possibly related to high anxiety from the smartwatch wearer.";
                let emailAddress = JSON.stringify(result);
                emailAddress = emailAddress.substring((emailAddress.search(":") + 2), (emailAddress.length - 3));
                console.log ("Sending alarm email to " + emailAddress);
                sendEmailMessage (emailAddress, msgSubject, msgBody);
                return response.send(result);
            }

        }
    });

});

// ------------------------------------------------------------------------------------------------
// Classify user data for this user
function getContactEmailAddress (UserID, callback) {

    //Create a connection object
    // MySQL server on localhost
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

    let sql = "SELECT getUserContactEmailAddresses(" + UserID + ") AS email;"

    conn.query (sql, function (err, result) {

        if (err) throw err;
        if (err) console.log (err);

        if (err) {
            callback (err, false);
        } else {
            if (JSON.stringify(result).length < 2) {
                callback(null, false);
            } else {
                callback(null, result);
            }
        }
    });

    conn.end();

}

// ------------------------------------------------------------------------------------------------
