//Import the modules that this app depends on
const mysql = require('mysql');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

//Set up express to serve static files from the public folder
app.use (express.static ('public'));

//Start listening on port 8100
app.listen (8100);

// ------------------------------------------------------------------------------------------------

//Set up the application to handle GET requests sent when student identifies themself
app.get('/checkStudent', function(request, response) {

    var studentNumber = request.query['studentNumber'] || '';
    var studentName = request.query['studentName'] || '';

    studentExists (studentNumber, studentName, function (err, data)
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

//Set up the application to handle GET requests sent when student requests the date/time of their next lecture
app.get('/nextLecture', function(request, response) {

    var studentNumber = request.query['studentNumber'] || '';

    nextLecture (studentNumber, function (err, data)
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
            var resp = JSON.stringify(data);
            if (resp.length < 20)
            {
                resp = "No lectures found.";
            }
            else
            {
                resp = "Your next lecture is on "
                    + JSON.stringify(data).substr(14, JSON.stringify(data).length - 17);
            }

            console.log ("Response: <" + resp + '>');

            response.status(200);
            response.setHeader('Content-type', 'text/html');
            return response.send(resp);
        }
    });

});

// ------------------------------------------------------------------------------------------------

//Set up the application to handle GET requests sent when student requests the room number of their next lecture
app.get('/nextLectureRoom', function(request, response) {

    var studentNumber = request.query['studentNumber'] || '';

    nextLectureRoom (studentNumber, function (err, data)
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
            var resp = JSON.stringify(data);
            if (resp.length < 1)
            {
                resp = "No lecture rooms found.";
            }
            else
            {
                resp = "Your next lecture will be held in room "
                    + JSON.stringify(data).substr(14, JSON.stringify(data).length - 17);
            }

            console.log ("Response: <" + resp + '>');

            response.status(200);
            response.setHeader('Content-type', 'text/html');
            return response.send(resp);
        }
    });

});

// ------------------------------------------------------------------------------------------------

//Set up the application to handle GET requests sent when student requests the room number of their next lecture
app.get('/nextAssignmentDeadline', function(request, response) {

    var studentNumber = request.query['studentNumber'] || '';
    var moduleName = request.query['moduleName'] || '';

    nextAssignmentDeadline(studentNumber, moduleName, function (err, data)
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
            var resp = JSON.stringify(data);
            if (resp.length < 20)
            {
                resp = "No assignments found.";
            }
            else
            {
                resp = "Your next assignment deadline is on  "
                    + JSON.stringify(data).substr(14, JSON.stringify(data).length - 17);
            }

            console.log ("Response: <" + resp + '>');

            response.status(200);
            response.setHeader('Content-type', 'text/html');
            return response.send(resp);
        }
    });

});

// ------------------------------------------------------------------------------------------------

/*
Attempts to identify a student using the studentNumber and studentName
 */
function studentExists (studentNumber, studentName, callback)
{

    studentNumber = studentNumber.replace(/\s/g, "");

    var sql = "SELECT COUNT(stu_ID) as recs_found FROM Student WHERE stu_code = '" + studentNumber +
    "' AND UPPER(stu_firstname) = '" + studentName.trim().toUpperCase() + "';";

    //Create a connection object
    var conn = mysql.createConnection({
        host: "localhost",
        user: "tsuser",
        password: "tsuser",
        database: "uni_lectures"
    });

    //Open the connection
    conn.connect (
        function(err)
        {
            if (err) throw err; //Check for errors
            if (err) console.log (err); //Log errors
        }
    );

    conn.query (sql, function (err, result)
    {
        //Check for errors
        if (err) throw err;
        if (err) console.log (err); // Log the error

        if (err)
        {
            callback (err, false);
        }
        else
        {
            if (JSON.stringify(result).length < 2)
            {
                callback(null, false);
            }
            else
            {
                var res = JSON.parse(JSON.stringify(result));
                if (JSON.stringify(result).substr((JSON.stringify(result).toString().length) - 3, 1) == "0")
                {
                    callback(null, false);
                }
                else
                {
                    callback(null,true)
                }
            }
        }

    });

    //Close the connection
    conn.end();

}

// ------------------------------------------------------------------------------------------------

/*
Attempts to retrieve the student's next lecture
 */
function nextLecture (studentNumber, callback)
{

    var sql = "SELECT CONCAT(CAST(DAYOFMONTH(SC.sch_start) AS CHAR(2)), ' ', " +
        "MONTHNAME(SC.sch_start), ' ', YEAR(SC.sch_start), ' at ', " +
        "HOUR(TIME(SC.sch_start)), ' hundred') AS response " +
        "FROM Schedule SC " +
        "INNER JOIN Module M on SC.sch_mod_FK = M.mod_ID " +
        "INNER JOIN Enrollment EN ON EN.enr_mod_FK = M.mod_ID " +
        "INNER JOIN Student ST ON EN.enr_stu_FK = ST.stu_ID " +
        "WHERE ST.stu_code = '" + studentNumber + "' AND SC.sch_start > NOW() " +
        "ORDER BY SC.sch_start LIMIT 1;";

    //Create a connection object
    var conn = mysql.createConnection({
        host: "localhost",
        user: "tsuser",
        password: "tsuser",
        database: "uni_lectures"
    });

    //Open the connection
    conn.connect (
        function(err)
        {
            if (err) throw err; //Check for errors
            if (err) console.log (err); //Log errors
        }
    );

    conn.query (sql, function (err, result)
    {
        //Check for errors
        if (err) throw err;
        if (err) console.log (err); // Log the error

        if (err)
        {
            callback (err, false);
        }
        else
        {
            if (JSON.stringify(result).length < 2)
            {
                callback(null, '');
            }
            else
            {
                var res = JSON.parse(JSON.stringify(result));
                callback(null, res);
            }
        }

    });

    //Close the connection
    conn.end();

}

// ------------------------------------------------------------------------------------------------

/*
Attempts to retrieve the student's next lecture room
 */
function nextLectureRoom (studentNumber, callback)
{

    var sql = "SELECT R.roo_number AS response " +
        "FROM Room R INNER JOIN Schedule SC on R.roo_ID = SC.sch_roo_FK " +
        "INNER JOIN Module M on SC.sch_mod_FK = M.mod_ID " +
        "INNER JOIN Enrollment EN ON EN.enr_mod_FK = M.mod_ID " +
        "INNER JOIN Student ST ON EN.enr_stu_FK = ST.stu_ID " +
        "WHERE ST.stu_code = '" + studentNumber + "' AND SC.sch_start > NOW() " +
        "ORDER BY SC.sch_start LIMIT 1;";

    //Create a connection object
    var conn = mysql.createConnection({
        host: "localhost",
        user: "tsuser",
        password: "tsuser",
        database: "uni_lectures"
    });

    //Open the connection
    conn.connect (
        function(err)
        {
            if (err) throw err; //Check for errors
            if (err) console.log (err); //Log errors
        }
    );

    conn.query (sql, function (err, result)
    {
        //Check for errors
        if (err) throw err;
        if (err) console.log (err); // Log the error

        if (err)
        {
            callback (err, false);
        }
        else
        {
            if (JSON.stringify(result).length < 2)
            {
                callback(null, '');
            }
            else
            {
                var res = JSON.parse(JSON.stringify(result));
                callback(null, res);
            }
        }

    });

    //Close the connection
    conn.end();

}

// ------------------------------------------------------------------------------------------------

/*
Attempts to retrieve the student's next assignment deadline
 */
function nextAssignmentDeadline (studentNumber, moduleName, callback)
{

    var sql = "";

    if ((moduleName.toString().toLowerCase() == "all") || (moduleName.toString().trim().length = 0))
    {
        sql = "SELECT CONCAT(CAST(DAYOFMONTH(A.asm_deadline) AS CHAR(2)), ' ', " +
            "MONTHNAME(asm_deadline), ' ', YEAR(asm_deadline), ' at ', " +
            "HOUR(TIME(asm_deadline)), ' ', MINUTE(TIME(asm_deadline)), ' ', " +
            "SECOND(TIME(asm_deadline))) AS response " +
            "FROM Assignment A INNER JOIN Module M ON A.asm_mod_FK = M.mod_ID " +
            "INNER JOIN Enrollment EN ON EN.enr_mod_FK = M.mod_ID " +
            "INNER JOIN Student ST ON EN.enr_stu_FK = ST.stu_ID " +
            "WHERE ST.stu_code = '" + studentNumber + "' AND A.asm_deadline > NOW() " +
            "ORDER BY A.asm_deadline LIMIT 1;";

    }
    else
    {
        sql = "SELECT CONCAT(CAST(DAYOFMONTH(A.asm_deadline) AS CHAR(2)), ' ', " +
            "MONTHNAME(asm_deadline), ' ', YEAR(asm_deadline), ' at ', " +
            "HOUR(TIME(asm_deadline)), ' ', MINUTE(TIME(asm_deadline)), ' ', " +
            "SECOND(TIME(asm_deadline))) AS response " +
            "FROM Assignment A INNER JOIN Module M ON A.asm_mod_FK = M.mod_ID " +
            "INNER JOIN Enrollment EN ON EN.enr_mod_FK = M.mod_ID " +
            "INNER JOIN Student ST ON EN.enr_stu_FK = ST.stu_ID " +
            "WHERE ST.stu_code = '" + studentNumber + "' AND A.asm_deadline > NOW() " +
            "AND M.mod_name LIKE '%" + moduleName.toString() + "%' " +
            "ORDER BY A.asm_deadline LIMIT 1;";
    }

    //Create a connection object
    var conn = mysql.createConnection({
        host: "localhost",
        user: "tsuser",
        password: "tsuser",
        database: "uni_lectures"
    });

    //Open the connection
    conn.connect (
        function(err)
        {
            if (err) throw err; //Check for errors
            if (err) console.log (err); //Log errors
        }
    );

    conn.query (sql, function (err, result)
    {
        //Check for errors
        if (err) throw err;
        if (err) console.log (err); // Log the error

        if (err)
        {
            callback (err, false);
        }
        else
        {
            if (JSON.stringify(result).length < 2)
            {
                callback(null, '');
            }
            else
            {
                var res = JSON.parse(JSON.stringify(result));
                callback(null, res);
            }
        }

    });

    //Close the connection
    conn.end();

}

// ------------------------------------------------------------------------------------------------
