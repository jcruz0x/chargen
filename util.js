"use strict"

let fs = require('fs');
let showdown = require('showdown');

let markdownConverter = new showdown.Converter();

function keynameToFullname(str) {
    let arr = str.split('-');

    for (let i = 0; i < arr.length; i++)
        arr[i] = capitalize(arr[i]);

    return arr.join(' ');
}

function capitalize(str) {
    return str[0].toUpperCase() + str.substr(1);
}

function rolld(n) {
    return Math.floor(Math.random() * n) + 1;
}

function getBookMdAsHtml(filename) {
    let md = fs.readFileSync('bookdata/md/' + filename, 'utf8');
    return markdownConverter.makeHtml(md);
}

function smallNumberToString(n) {
    if (n === 0) return 'none';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    if (n === 3) return 'three';
    if (n === 4) return 'four';
    if (n === 4) return 'five';
    return n.toString();
}

exports.capitalize = capitalize;
exports.keynameToFullname = keynameToFullname;
exports.getBookMdAsHtml = getBookMdAsHtml;
exports.smallNumberToString = smallNumberToString;
