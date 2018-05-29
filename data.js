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

// testdata 
let skills = [
    'acrobatics',
    'perception',
    'stealth',
]

// testdata
let classes = [
    'fighter',
    'cleric',
    'barbarian',
    'rouge',
    'wizard'
]

// -------------------------------------------------- 
// Races
// -------------------------------------------------- 

let raceDivTemplate = fs.readFileSync('web/desclist.mustache', 'utf8');

let raceJson = fs.readFileSync('bookdata/json/races.json', 'utf8');
let races = JSON.parse(raceJson);

let racechoiceJson = fs.readFileSync('bookdata/json/concrete-races.json', 'utf8');
let racechoices = JSON.parse(racechoiceJson);

for (let keyname in races) {
    if (!races.hasOwnProperty(keyname))
        continue;

    let race = races[keyname];
    race.fullname = util.keynameToFullname(keyname)

    let descfile = race.descfile || (keyname + ".md");
    let desc = fs.readFileSync('bookdata/md/' + descfile, 'utf8');
    race.htmlDesc = mdconverter.makeHtml(desc);
}

function getRaceChoiceView() {
    let raceChoiceView = [];
    for (let keyname in racechoices) {
        if (!racechoices.hasOwnProperty(keyname))
            continue;

        let choice = {}; 
        choice.raceval = keyname;
        choice.racename = util.keynameToFullname(keyname);

        raceChoiceView.push(choice);
    }
    return raceChoiceView;
}

function getRaceDivHtml(racechoice) {
    let choice = racechoices[racechoice];
    let html;

    if (typeof choice === "string") {
        html = renderRaceDivHtml(choice);
    } else {
        let mainrace = racechoices[racechoice][0];
        let subrace = racechoices[racechoice][1];

        html = renderRaceDivHtml(mainrace);
        if (subrace !== undefined)
            html += renderRaceDivHtml(subrace, 'Subrace: ');
    }
    return html;
}

function renderRaceDivHtml(race, prefix = '') {
    let view = {}; 
    view.title = prefix + races[race].fullname;
    view.desc = races[race].htmlDesc;
    view.items = [
        {name: "foo: ", desc: "foozball"},
        {name: "bar: ", desc: "barzabalam"},
        {name: "baz: ", desc: "quuxoid"},
    ]
    
    return mustache.render(raceDivTemplate, view);
}

function getRaceDivView() {
    let view = [];
    for (let racechoice in racechoices) {
        if (!racechoices.hasOwnProperty(racechoice))
            continue;
        
        view.push({name: racechoice, html: getRaceDivHtml(racechoice)});
    }
    return view;
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
    view.racechoices = getRaceChoiceView();
    view.racedivs = getRaceDivView();
    view.skills = getInputView('skill', skills);


    return view;
}

exports.getView = getView;