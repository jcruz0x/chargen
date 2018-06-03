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
let IMG = path.join(__dirname, 'img');
let STATIC = path.join(__dirname, 'static')

app.use('/static', express.static(STATIC));
app.use('/img', express.static(IMG));

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

app.get('/api/jsondata', (req, res) => {
    res.send(data.joinedJson);
});

app.get('*', (req,res) => res.status(404).send('Error 404: Not found'));

// --------------------------------------------------
// Setup Listening
// --------------------------------------------------

let port = process.env.port || 80;
let ip = process.env.IP || 'localhost';

console.log(`using port ${port} and ip ${ip}`);

app.listen(port);
console.log('listening');

