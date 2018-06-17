"use strict"

let fs = require('fs');
let showdown = require('showdown');
let mustache = require('mustache');
let database = require('better-sqlite3');

let util = require('./util.js');

let markdownConverter = new showdown.Converter();
let bookdb = new database('db/bookdb.sqlite', {readonly: true, fileMustExist: true});

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
        attribs.shortname = util.capitalize(ability);
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

    let _class = classes[keyname];
    _class.fullname = util.keynameToFullname(keyname);
    _class.htmlDesc = util.getBookMdAsHtml(keyname + '.md');
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
    if (skillchoices.from.length === 1 && skillchoices.from[0] === 'skills')
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

function getFightingStyleView() {
    let view = [];
    let styles = features['fighting-style'].styles;
    for (let style in styles) {
        if (!styles.hasOwnProperty(style))
            continue;

        let item = {};

        item.name = style;
        item.fullname = util.keynameToFullname(style);
        item.benefit = styles[style];

        view.push(item);
    }

    return view;
}

// -------------------------------------------------- 
// Backgrounds
// -------------------------------------------------- 

let backgroundsJson = fs.readFileSync('bookdata/json/backgrounds.json', 'utf8');
let backgrounds = JSON.parse(backgroundsJson);

for (let bgkey in backgrounds) {
    if (!backgrounds.hasOwnProperty(bgkey))
        continue;

    let bg = backgrounds[bgkey];

    if (bg.fullname === undefined)
        bg.fullname = util.keynameToFullname(bgkey);
}

function getBgToolsDesc(bg) {
    let result = '';

    if (bg.tools != undefined)
        result += joinFullnames(bg.tools) + '. ';
    
    if (bg.toolchoice != undefined) {
        let fromlist = joinFullnames(bg.toolchoice.from);
        result += `Choose ${bg.toolchoice.count} from ${fromlist}.`;
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
        bgview.tools = getBgToolsDesc(bg);
        
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
// Skills and Proficienies
// -------------------------------------------------- 

let expansionJson = fs.readFileSync('bookdata/json/expansions.json', 'utf8');
let expansions = JSON.parse(expansionJson);

function getExpertiseView() {
    let view = [];
    let skills = expansions.skills;

    for (let i = 0; i < skills.length; i++) {
        view.push({
            name: skills[i],
            fullname: util.keynameToFullname(skills[i])
        })
    }
    
    view.push({
        name: "thieves-tools",
        fullname: "Thieves Tools"
    });

    return view;
}

function profExpand(list) {
    let newlist = [];
    for (let prof of list) {
        if (expansions.hasOwnProperty(prof)) {
            newlist = newlist.concat(expansions[prof]);
        } else {
            newlist.push(prof);
        }
    }
    return newlist;
}

let profsources;

function gatherProficiencies() {
    profsources = [];
    for (let classkey in classes) {
        if (!classes.hasOwnProperty(classkey))
            continue;

        let _class = classes[classkey];

        let skillsource = {}
        skillsource.sourcekey = classkey;
        skillsource.title = _class.fullname + ' Skills'
        skillsource.list = []
        skillsource.count = _class.skills.count;
        skillsource.choices = profExpand(_class.skills.from);
        profsources.push(skillsource);

        if (_class.tools !== undefined) {
            let toolsource = {}
            toolsource.sourcekey = classkey;
            toolsource.title = _class.fullname + ' Tool Proficiencies'
            if (Array.isArray(_class.tools)) {
                toolsource.list = _class.tools;
                toolsource.count = 0;
                toolsource.choices = [];
            } else {
                toolsource.list = [];
                toolsource.count = _class.tools.count;
                toolsource.choices = profExpand(_class.tools.from);
            }

            profsources.push(toolsource);
        }

        let wasource = {};
        wasource.sourcekey = classkey;
        wasource.title = _class.fullname + ' Weapon and Armor Proficiencies';
        wasource.count = 0;
        wasource.choices = [];
        wasource.list = _class.armorprof.concat(_class.weaponprof);
        profsources.push(wasource)
    }
    
    for (let featurekey in features) {
        if (!features.hasOwnProperty(featurekey))
            continue;

        let feature = features[featurekey];
        let pchoices = feature['proficiency-choices'];

        if (feature.proficiencies === undefined && pchoices === undefined)
            continue;

        let profsource = {};

        profsource.sourcekey = featurekey;
        profsource.title = feature.proftitle || feature.fullname || util.keynameToFullname(featurekey);
        profsource.list = feature.proficiencies || [];
        
        if (pchoices !== undefined) {
            profsource.count = pchoices.count;
            profsource.choices = profExpand(pchoices.from); 
        }
        else {
            profsource.count = 0;
            profsource.choices = [];
        }

        profsources.push(profsource);
    }

    for (let bgkey in backgrounds) {
        if (!backgrounds.hasOwnProperty(bgkey))
            continue;

        let bg = backgrounds[bgkey];

        let skillsource = {};
        skillsource.sourcekey = bgkey;
        skillsource.title = bg.fullname + " Skills";
        skillsource.list = bg.skills || [];
        skillsource.count = 0;
        skillsource.choices = [];
        profsources.push(skillsource);


        if ((bg.tools && bg.tools.length > 0) || bg.toolchoice) {

            let toolsource = {};
            toolsource.sourcekey = bgkey;
            toolsource.title = bg.fullname + " Tool Proficiencies";
            toolsource.list = bg.tools || [];
    
            if (bg.toolchoice != undefined) {
                toolsource.count = bg.toolchoice.count;
                toolsource.choices = profExpand(bg.toolchoice.from);
            } else {
                toolsource.count = 0;
                toolsource.choices = [];
            }
    
            profsources.push(toolsource);
        }
    }
}

function getProfSourceView() {
    let view = [];

    for (let source of profsources) {
        let item = {
            sourcekey: source.sourcekey,
            title: source.title,
            list: util.allKeynamesToFullnames(source.list),
            dropdowns: []
        }

        for (let i = 0; i < source.count; i++) {
            let dropdownitems = []; 
            for (let choice of source.choices) {
                dropdownitems.push({
                    choicekey: choice,
                    choicename: util.keynameToFullname(choice)
                })
            }
            item.dropdowns.push({ dropdownitems });
        }

        view.push(item);
    }

    return view;
}

gatherProficiencies();

// -------------------------------------------------- 
// Equipment
// -------------------------------------------------- 

// get data synchronously from db
let weapons = bookdb.prepare('SELECT * FROM weapons').all();
let armors = bookdb.prepare('SELECT * FROM armor').all();
let items = bookdb.prepare('SELECT * FROM items').all();
let packs = bookdb.prepare('SELECT * FROM packs').all();

for (let weapon of weapons) {
    if (weapon.properties !== '' && weapon.properties.trim() !== '') 
        weapon.proparr = weapon.properties.split(' ');
    else 
        weapon.proparr = [];

    let niceprops = [];

    for (let prop of weapon.proparr) {
        if (prop === 'versatile-8')
            prop = 'versatile (d8)';
        else if (prop === 'versatile-10')
            prop = 'versatile (d10)';
        else if (prop === 'ammunition')
            prop = `ammo (${weapon.near}/${weapon.far})`
        else if (prop === 'thrown')
            prop = `thrown (${weapon.near}/${weapon.far})`

        niceprops.push(prop);
    }

    if (niceprops.length > 0) {
        niceprops[0] = util.capitalize(niceprops[0]);
        weapon.propdesc = niceprops.join(', ');
    } else {
        weapon.propdesc = '--';
    }
}

let damageTypes = {
    p: '(P)',
    b: '(B)',
    s: '(S)'
}

let categoryFullnames = {
    common: "Common Items and Equipment",
    magical: "Magical, Holy, and Alchemical Items",
    outdoor: "Travel and Adventure Items",
    clothes: "Clothing and Storage",
    ammo: "Ammunition and Traps",
    artisan: "Tools (Artisan's)",
    tool: "Tools (Miscellaneous)",
    instrument: "Tools (Musical Instruments)",
    sm: "Simple Melee Weapons",
    sr: "Simple Ranged Weapons",
    mm: "Martial Melee Weapons",
    mr: "Martial Ranged Weapons",
    "light-armor": " (L)",
    "medium-armor": " (M)",
    "heavy-armor": " (H)",
    "shields": "",
}

function damageStr(dice, damagetype) {
    if (dice == '--')
        return '--';

    return `${dice} ${damageTypes[damagetype]}`;
}

let weaponCategoryFullnames = {
}

function getWeaponView() {
    let view = [];
    for (let weapon of weapons) {
        let viewitem = {};

        viewitem.keyname = weapon.keyname;
        viewitem.fullname = weapon.fullname;
        viewitem.cost = goldStr(weapon.cost);
        viewitem.damage = damageStr(weapon.damage, weapon.type);
        viewitem.weight = weightStr(weapon.weight) ;
        viewitem.properties = weapon.propdesc;

        let list = getOrAddCategory(weapon.category, view);
        list.push(viewitem);
    }

    return view;
}

function getArmorView() {
    let view = [];
    for (let armor of armors) {
        let viewitem = {};

        viewitem.keyname = armor.keyname;
        viewitem.fullname = armor.fullname;
        viewitem.fullname += categoryFullnames[armor.category];
        viewitem.cost = goldStr(armor.cost);
        viewitem.desc = armor.desc;
        viewitem.weight = weightStr(armor.weight);

        if (armor.stealth === 'Disadvantage')
            viewitem.weight += " (D/S)";

        view.push(viewitem);
    }

    return view;
}

function getPackView() {
    let view = [];
    for (let pack of packs) {
        let viewitem = {};

        viewitem.keyname = pack.keyname;
        viewitem.fullname = pack.fullname;
        viewitem.desc = pack.description;
        viewitem.cost = goldStr(pack.cost);
        viewitem.weight = weightStr(pack.weight);

        view.push(viewitem)
    }

    return view;
}

function getItemView() {
    let view = [];
    for (let item of items) {
        let viewitem = {};
        
        viewitem.keyname = item.keyname;
        viewitem.fullname = item.fullname;
        viewitem.cost = goldStr(item.cost);
        viewitem.weight = weightStr(item.weight);

        let list = getOrAddCategory(item.category, view);
        list.push(viewitem);
    } 
    return view;
}

function getOrAddCategory(category, view) {
    for (let subview of view) {
        if (subview.category === category)
            return subview.list
    }

    let categoryView = {
        category: category, 
        categoryFullname: categoryFullnames[category],
        list: [] 
    };
    view.push(categoryView);

    return categoryView.list;
}

// -------------------------------------------------- 
// Misc
// -------------------------------------------------- 

function goldStr(gold) {
    if (gold >= 1)
        return `${gold} gp`;
    if (gold >= 0.1)
        return `${gold * 10} sp`;

    return `${gold * 100} cp`;
}

function weightStr(pounds) {
    if (pounds === 0.5)
        return '1/2 lb.';
    if (pounds === 0.25)
        return '1/4 lb.';
    
    return `${pounds} lb.`
}


// -------------------------------------------------- 
// Main View Creation
// -------------------------------------------------- 

function getView() {
    let view = {};

    view.abilities = getAbilityView();
    view.racechoices = getRaceChoiceView();
    view.racedivs = getRaceDivView();
    view.dragondata = getDragonbornTableView();
    view.classes = getClassDivView();
    view.divinedomains = getDomainDivView(classes.cleric.domains);
    view.warlockpatrons = getDomainDivView(classes.warlock.patrons);
    view.fightingstyles = getFightingStyleView();
    view.expertiseskills = getExpertiseView();

    let bgViews = getBackgroundViews();
    view.backgrounds = bgViews.bgViews;
    view.backgroundSubtypes = bgViews.bgSubtypeViews;
    view.backgroundVariantFeatures = bgViews.bgVariantFeatureViews;
    view.backgroundVariants = bgViews.bgVariantViews;

    view.profSources = getProfSourceView();
    view.weapons = getWeaponView();
    view.armors = getArmorView();
    view.packs = getPackView();
    view.items = getItemView();

    return view;
}

// -------------------------------------------------- 
// Exports, data prep for ajax
// -------------------------------------------------- 

let joinedData = { races, classes, racechoices, features, backgrounds, weapons, armors, items, packs };
let joinedJson = JSON.stringify(joinedData);

exports.getView = getView;
exports.joinedJson = joinedJson;