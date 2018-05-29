"use strict"

function keynameToFullname(str) {
    let arr = str.split('-');

    for (let i = 0; i < arr.length; i++)
        arr[i] = capitalize(arr[i]);

    return arr.join(' ');
}


function capitalize(str) {
    return str[0].toUpperCase() + str.substr(1);
}


exports.capitalize = capitalize;
exports.keynameToFullname = keynameToFullname;
