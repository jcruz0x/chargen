"use strict";

console.log("server started");

// --------------------------------------------------
// Require Statements, Middleware, etc.
// --------------------------------------------------

// node js modules
let path = require('path');
let fs = require('fs');

// express modules
let express = require('express');
let app = express();

// --------------------------------------------------
// Routing
// --------------------------------------------------

let WEB = path.join(__dirname, 'web');
app.use('/', express.static(WEB));

app.get('*', (req,res) => res.status(404).send('Error 404: Not found'));

// --------------------------------------------------
// Setup Listening
// --------------------------------------------------

let port = process.env.port || 80;
let ip = process.env.IP || 'localhost';

console.log(`using port ${port} and ip ${ip}`);

app.listen(port, ip);
console.log('listening');