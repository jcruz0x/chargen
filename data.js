"use strict"

let fs = require('fs');
let showdown = require('showdown');
let mustache = require('mustache');

let util = require('./util.js');

let markdownConverter = new showdown.Converter();

let desclistTemplate = fs.readFileSync('web/desclist.mustache', 'utf8');
let desclistTwoColTemplate = fs.readFileSync('web/desclist-twocolumn.mustache', 'utf8');

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
    // let desc = fs.readFileSync('bookdata/md/' + descfile, 'utf8');
    // race.htmlDesc = markdownConverter.makeHtml(desc);
    race.htmlDesc = util.getBookMdAsHtml(descfile);
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

    return mustache.render(desclistTwoColTemplate, view);
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

let classJson = fs.readFileSync('bookdata/json/classes.json', 'utf8');
let classes = JSON.parse(classJson);

for (let keyname in classes) {
    if (!classes.hasOwnProperty(keyname))
        continue;

    let charclass = classes[keyname];
    charclass.fullname = util.keynameToFullname(keyname);

    // let desc = fs.readFileSync(`bookdata/md/${keyname}.md`, 'utf8');
    // charclass.htmlDesc = markdownConverter.makeHtml(desc);

    charclass.htmlDesc = util.getBookMdAsHtml(keyname + '.md');
}

function appendHitDieFeatures(charclass, items) {
    items.push({
        name: "Hit Dice",
        desc: `1d${charclass.hitdie} per ${charclass.fullname} level.`
    });
    items.push({
        name: "Hit Points At First Level",
        desc: `${charclass.hitdie} + your constitution modifier,`
    });

    let halfdie = (charclass.hitdie / 2) + 1;
    items.push({
        name: "Hit Points At Higher Levels",
        desc: `1d${charclass.hitdie} (or ${halfdie}) + 
            your constitution modifier per ${charclass.fullname} 
            level after the first.`
    });
}

function joinFullnames(keynames) {
    if (keynames.length == 0)
        return "None";

    let fullnames = [];
    for (let i = 0; i < keynames.length; i++)
        fullnames.push(util.keynameToFullname(keynames[i]));
    return fullnames.join(", ");
}


function getSavingThrowsDesc(throws) {
    let fullnames = [];
    for (let i = 0; i < throws.length; i++) 
        fullnames.push(abilities[throws[i]].fullname)
    return fullnames.join(", ") + ".";
}

function getSkillsDesc(skillchoices) {
    if (skillchoices.from == 'all')
        return `Choose ${skillchoices.count} skills.`;

    let fromlist = joinFullnames(skillchoices.from);
    return `Choose ${skillchoices.count} from ${fromlist}.`;
}

function getToolDesc(tools) {
    if (tools == undefined)
        return "None.";
    else if (Array.isArray(tools))
        return joinFullnames(tools) + ".";
    else
        return getSkillsDesc(tools);
}

function getGoldDesc(charclass) {
    return `${charclass.gold}gp.`;
}

function getClassDivHtml(charclass) {
    let view = {};
    view.items = [];

    view.desc = charclass.htmlDesc;
    view.title = charclass.fullname;

    appendHitDieFeatures(charclass, view.items);

    view.items.push({
        name: "Armor Proficiencies",
        desc: joinFullnames(charclass.armorprof) + "."
    });

    view.items.push({
        name: "Weapon Proficiencies",
        desc: joinFullnames(charclass.weaponprof)  + "."
    });

    view.items.push({
        name: "Tool Proficiencies",
        desc: getToolDesc(charclass.tools)
    });

    view.items.push({
        name: "Saving Throws",
        desc: getSavingThrowsDesc(charclass.savingthrows) 
    });

    view.items.push({ 
        name: "Skills", 
        desc: getSkillsDesc(charclass.skills) 
    });

    view.items.push({
        name: "Starting Wealth", 
        desc: getGoldDesc(charclass)
    });

    for (let i = 0; i < charclass.features.length; i++) {
        let feature = features[charclass.features[i]];
        let fullname = feature.fullname || util.keynameToFullname(charclass.features[i]);
        view.items.push({ name: fullname, desc: feature.description });
    }

    return mustache.render(desclistTwoColTemplate, view);
}


function getClassDivView() {
    let view = [];
    for (let classkey in classes) {
        if (!classes.hasOwnProperty(classkey))
            continue;

        let fullname = util.keynameToFullname(classkey);

        view.push({name: classkey, html: getClassDivHtml(classes[classkey]), fullname });
    }
    return view;
}

function getDomainDivHtml(domain, fullname) {
    let view = {};
    view.title = fullname;
    view.desc = domain.description;
    view.items = [];


    for (let i = 0; i < domain.features.length; i++) {
        let featurekey = domain.features[i]
        let feature = features[featurekey];
        let fullname = feature.fullname || util.keynameToFullname(featurekey);

        view.items.push({
            name: fullname,
            desc: feature.description
        })
    }

    view.items.push({
        name: "Spells",
        desc: joinFullnames(domain.spells) + '.'
    })

    return mustache.render(desclistTemplate, view);
}

function getDomainDivView(domains) {
    let view = [];
    for (let domainkey in domains) {
        if (!domains.hasOwnProperty(domainkey))
            continue;

        let domain = domains[domainkey];
        let fullname = domain.fullname || util.keynameToFullname(domainkey);
        let html = getDomainDivHtml(domain, fullname);

        view.push({ name: domainkey, fullname, html });
    }

    return view;
}

// -------------------------------------------------- 
// Backgrounds
// -------------------------------------------------- 

let backgroundsJson = fs.readFileSync('bookdata/json/backgrounds.json', 'utf8');
let backgrounds = JSON.parse(backgroundsJson);

function getBgToolsDesc(tools, toolchoices) {
    let result = '';

    if (tools != undefined)
        result += joinFullnames(tools) + '. ';
    
    if (toolchoices != undefined) {
        let fromlist = joinFullnames(tools.from);
        result += `Choose ${tools.count} from ${fromlist}.`;
    }

    return result;
}

function getBackgroundViews() {
    let bgViews = []
    let bgSubtypeViews = [];
    let bgVariantFeatureViews = [];
    let bgVariantViews = [];

    for (let keyname in backgrounds) {
        if (!backgrounds.hasOwnProperty(keyname))
            continue;
        
        let bgview = {};
        let bg = backgrounds[keyname];

        bgview.name = keyname;
        bgview.fullname = util.keynameToFullname(keyname);
        bgview.html = util.getBookMdAsHtml(keyname + '.md');

        bgview.skills = joinFullnames(bg.skills);
        bgview.tools = getBgToolsDesc(bg.tools || []);
        
        if (bg.languages !== undefined && bg.languages > 0) {
            let numstr = util.capitalize(util.smallNumberToString(bg.languages));
            bgview.languages = [`${numstr} of your choice`];
        }

        bgview.featurename = util.keynameToFullname(bg.feature); 
        bgview.featurehtml = util.getBookMdAsHtml(bg.feature + '.md');

        bgViews.push(bgview);

        if (bg.subtype != undefined)
            bgSubtypeViews.push({ name: keyname, title: bg.subtype.title, desc: bg.subtype.desc });

        if (bg.variant != undefined) {
            bgVariantViews.push({ 
                name: keyname,
                title: util.keynameToFullname(bg.variant),
                html: util.getBookMdAsHtml(bg.variant + '.md')
            });
        }

        if (bg.variantfeature != undefined) {
            bgVariantFeatureViews.push({
                name: keyname,
                title: util.keynameToFullname(bg.variantfeature),
                html: util.getBookMdAsHtml(bg.variantfeature + '.md')
            });
        }
    }

    return { bgViews, bgSubtypeViews, bgVariantFeatureViews, bgVariantViews };
}

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
    view.dragondata = getDragonbornTableView();
    view.classes = getClassDivView();
    view.divinedomains = getDomainDivView(classes.cleric.domains);
    view.warlockpatrons = getDomainDivView(classes.warlock.patrons);

    let bgViews = getBackgroundViews();

    view.backgrounds = bgViews.bgViews;
    view.backgroundSubtypes = bgViews.bgSubtypeViews;
    view.backgroundVariantFeatures = bgViews.bgVariantFeatureViews;
    view.backgroundVariants = bgViews.bgVariantViews;

    // temporary:
    view.skills = getInputView('skill', skills); 

    return view;
}

// -------------------------------------------------- 
// Exports, data prep for ajax
// -------------------------------------------------- 

let joinedData = { races, classes, racechoices, features, backgrounds };
let joinedJson = JSON.stringify(joinedData);

exports.getView = getView;
exports.joinedJson = joinedJson;