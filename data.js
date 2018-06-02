"use strict"

let fs = require('fs');
let showdown = require('showdown');
let mustache = require('mustache');

let util = require('./util.js');

let markdownConverter = new showdown.Converter();

// -------------------------------------------------- 
// Abilities
// -------------------------------------------------- 

let abilities = { 
    'str': { fullname: "Strength", },
    'dex': { fullname: "Dexterity", },
    'con': { fullname: "Constitution" },
    'int': { fullname: "Intelligence" },
    'wis': { fullname: "Wisdom" },
    'cha': { fullname: "Charisma" }
}

function getAbilityView() {
    let view = [];
    for (let ability in abilities) {
        if (!abilities.hasOwnProperty(ability))
            continue;

        let attribs = {};
        attribs.abilityname = abilities[ability].fullname;
        attribs.abilityid = ability;

        view.push(attribs);
    }

    return view;
}



// -------------------------------------------------- 
// Race and Class Features
// -------------------------------------------------- 

let featuresJson = fs.readFileSync('bookdata/json/features.json', 'utf8');
let features = JSON.parse(featuresJson);

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
    race.fullname = util.keynameToFullname(keyname);

    let descfile = race.descfile || (keyname + ".md");
    let desc = fs.readFileSync('bookdata/md/' + descfile, 'utf8');
    race.htmlDesc = markdownConverter.makeHtml(desc);
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
    let racenames = racechoices[racechoice];

    let view = {}; 
    view.desc = "";
    view.items = [];

    view.items.push(getRaceAbilityBonusItem(racenames));

    let speedDesc = getRaceProperty(racenames, 'speed').toString();
    view.items.push({name: 'Speed', desc: speedDesc});
    
    let sizeDesc = util.capitalize(getRaceProperty(racenames, 'size').toString()); 
    view.items.push({name: 'Size', desc: sizeDesc});

    for (let i = 0; i < racenames.length; i++) {
        view.title = races[racenames[i]].fullname;
        view.desc += races[racenames[i]].htmlDesc;
        view.items = view.items.concat(getRaceFeatureItems(racenames[i]));
    }

    return mustache.render(raceDivTemplate, view);
}

function getRaceProperty(racenames, propertyname) {
    let result;
    for (let i = 0; i < racenames.length; i++) {
        let property = races[racenames[i]][propertyname];
        if (property !== undefined)
            result = property;
    }
    return result;
}

function getRaceBonuses(racenames) {
    let bonuses = {};
    for (let i = 0; i < racenames.length; i++) {
        let race = races[racenames[i]];
        bonuses = Object.assign(race.bonuses, bonuses);
    }
    return bonuses;
}

function getRaceAbilityBonusItem(racenames) {
    let bonuses = getRaceBonuses(racenames);
    let desc = [];
    
    for (let key in bonuses) {
        if (!bonuses.hasOwnProperty(key))
        continue;
        
        if (abilities.hasOwnProperty(key)) {
            desc.push(`+${bonuses[key]} to ${abilities[key].fullname}.`);
            continue;
        }
        
        if (key == 'all') {
            desc.push('+1 to all ability scores.')
            continue;
        }

        if (key == 'choice') {
            desc.push(`+${bonuses[key].by} to ${bonuses[key].count} ability scores.`)
        }
    }

    return {name: "Ability Score Bonuses", desc: desc.join(' ')};
}

function getRaceFeatureItems(racename) {
    let list = races[racename].features;
    let items = [];

    for (let i = 0; i < list.length; i++) {
        let feature = features[list[i]];
        let name = feature.fullname || util.keynameToFullname(list[i]);
        items.push({name: name, desc: feature.description});
    }

    return items;
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

function getDragonbornTableView() {
    let view = [];
    for (let item of races['dragonborn'].bloodlines) {
        view.push({
            dragon: item.dragon,
            dragonname: util.capitalize(item.dragon),
            damage: util.capitalize(item.damage),
            breath: item.breath,
        });
    }
    return view;
}

// -------------------------------------------------- 
// Classes
// -------------------------------------------------- 

// testdata
let classes = [
    'fighter',
    'cleric',
    'barbarian',
    'rouge',
    'wizard'
]

// -------------------------------------------------- 
// Skills
// -------------------------------------------------- 

// testdata
let skills = [
    'acrobatics',
    'perception',
    'stealth',
]




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
    view.racechoices = getRaceChoiceView();
    view.racedivs = getRaceDivView();
    view.dragonborntable = getDragonbornTableView();
    
    // temporary:
    view.classes = getInputView('class', classes);
    view.skills = getInputView('skill', skills); 

    return view;
}

exports.getView = getView;