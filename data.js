"use strict"

let fs = require('fs');
let showdown = require('showdown');
let mustache = require('mustache');

let util = require('./util.js');

let mdconverter = new showdown.Converter();

let abilities = [
    'str',
    'dex',
    'con',
    'int',
    'wis',
    'cha',
]

let abilityNames = [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
]

// these need to be from database
let skills = [
    'acrobatics',
    'perception',
    'stealth',
]

let classes = [
    'fighter',
    'cleric',
    'barbarian',
    'rouge',
    'wizard'
]

// let races = [
//     'elf',
//     'dwarf',
//     'human',
//     'halfling',
// ]

// -------------------------------------------------- 
// Races
// -------------------------------------------------- 

let racejson = fs.readFileSync('bookdata/json/races.json', 'utf8');
let races = JSON.parse(racejson);

for (let keyname in races) {
    if (!races.hasOwnProperty(keyname))
        continue;
    
    let race = races[keyname];
    race.fullname = util.keynameToFullname(keyname)

    let descfile = race.descfile || (keyname + ".md");
    let desc = fs.readFileSync('bookdata/json/' + descfile, 'utf8');
    race.htmlDesc = mdconverter.makeHtml(desc);
}

function getRaceChoiceView() {

}

function getRaceDivView() {

}


// -------------------------------------------------- 
// Abilities
// -------------------------------------------------- 

function getAbilityView() {
    let view = [];
    for (let ability of abilities) {
        let attribs = {};
        attribs.abilityname = util.capitalize(ability);
        attribs.abilityid = ability;

        view.push(attribs);
    }

    return view;
}

// -------------------------------------------------- 
// Other
// -------------------------------------------------- 

function getInputView(prefix, items) {
    let view = [];

    // attributes
    let choice = prefix + "choice";
    let val = prefix + "val";
    let name = prefix + "name";

    for (let item of items) {
        let attribs = {}; 
        attribs[choice] = item + "-choice"
        attribs[val] = item;
        attribs[name] = util.capitalize(item);
        
        view.push(attribs);
    }

    return view;
}

function getView() {
    let view = {};

    view.abilities = getAbilityView();
    view.classes = getInputView('class', classes);
    view.races = getInputView('race', races);
    view.skills = getInputView('skill', skills);

    // console.log(view);

    return view;
}

exports.getView = getView;