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

// race and class features
let featuresJson = fs.readFileSync('bookdata/json/features.json', 'utf8');
let features = JSON.parse(featuresJson);

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

    if (typeof choice === "string") {
        return renderRaceDivHtml([choice]);
    } else {
        return renderRaceDivHtml(choice);
    }
}

// takes any number of races keyname strings as args
function renderRaceDivHtml(racenames) {
    console.log("racenames in renderRaceDivHtml: ");
    console.log(racenames);
    let view = {}; 
    view.desc = "";
    view.items = [];

    for (let i = 0; i < racenames.length; i++) {
        view.title = races[racenames[i]].fullname;
        view.desc += races[racenames[i]].htmlDesc;
        view.items = view.items.concat(getRaceFeatureItems(racenames[i]));
    }

    return mustache.render(raceDivTemplate, view);
}

function getRaceFeatureItems(racename) {
    let list = races[racename].features;
    console.log(list);
    let items = [];

    for (let i = 0; i < list.length; i++) {
        let feature = features[list[i]];
        let name = feature.fullname || util.keynameToFullname(list[i]);
        items.push({name: name, desc: feature.description});
    }

    return items;
}

function getBaseRaceFeatures(racenames) {
    items = [];

    

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