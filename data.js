"use strict"

let abilities = [
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

let races = [
    'elf',
    'dwarf',
    'human',
    'halfling',
]


function capitalize(str) {
    return str[0].toUpperCase() + str.substr(1);
}

function getAbilityView() {
    let view = [];
    for (let ability of abilities) {
        let attribs = {};
        attribs.abilityname = capitalize(ability);
        attribs.abilityid = ability;

        view.push(attribs);
    }

    return view;
}

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
        attribs[name] = capitalize(item);
        
        view.push(attribs);
    }

    return view;
}

exports.getView = function() {
    let view = {};

    view.abilities = getAbilityView();
    view.classes = getInputView('class', classes);
    view.races = getInputView('race', races);
    view.skills = getInputView('skill', skills);

    // console.log(view);

    return view;
}

