"use strict";

console.log("server started");

// --------------------------------------------------
// Require Statements, Middleware, etc.
// --------------------------------------------------

// node js modules
let path = require('path');
let fs = require('fs');
let mustache = require('mustache');

// other server files
let data = require('./data.js');

// express modules
let express = require('express');
let app = express();

// --------------------------------------------------
// Routing
// --------------------------------------------------

let WEB = path.join(__dirname, 'web');
let STYLE = path.join(__dirname, 'style')

app.use('/style', express.static(STYLE));

app.get('/', (req, res) => {
    let view = data.getView(); 
    fs.readFile('./web/index.mustache', 'utf8', (err, data) => {
        if (err) {
            res.status('500').send('Error. Unavailable.');
        }
        else {
            let page = mustache.render(data, view);
            res.send(page);
        }
    })
});

app.get('*', (req,res) => res.status(404).send('Error 404: Not found'));

// --------------------------------------------------
// Setup Listening
// --------------------------------------------------

let port = process.env.port || 80;
let ip = process.env.IP || 'localhost';

console.log(`using port ${port} and ip ${ip}`);

app.listen(port, ip);
console.log('listening');

