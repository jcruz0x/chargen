
"use strict"
// --------------------------------------------------
// Model
// --------------------------------------------------

var model;

function newModel() {
    model = {};

    // race, class, and background defaults
    model.raceval = 'human';
    model.classval = 'fighter';
    model.backgroundval = 'acolyte';

    // cleric domain, sorcerous origin, 
    // and warlock patron defaults
    model.domainval = 'knowledge-domain';
    model.originval = 'wild-magic';
    model.patronval = 'the-archfey';

    // gold and inventory defaults
    model.initialGold = 0;
    model.spentGold = 0;
    model.inventory = [];

    // ability defaults
    model.abilities = {
        str: 10, dex: 10, con: 10, 
        int: 10, wis: 10, cha: 10
    };

    model.bonuses = {};
    model.finalAbilities = {};
    model.abilityModifiers = {};
}

function getFeatures() {
    var classFeatures = bookdata.classes[model.classval].features;

    var races = getRaces(); 
    var mainRaceFeatures = races.main.features;
    var subRaceFeatures = races.sub === undefined ? [] : races.sub.features;

    var features = classFeatures.concat(mainRaceFeatures, subRaceFeatures);

    if (model.classval === 'sorcerer') {
        features = features.concat(bookdata.classes.sorcerer.origins[model.originval].features)
    }
    else if (model.classval === 'cleric') {
        features = features.concat(bookdata.classes.cleric.domains[model.domainval].features);
    }
    else if (model.classval === 'warlock') {
        features = features.concat(bookdata.classes.warlock.patrons[model.patronval].features);
    }

    return features;
}

function getRaces() {
    var mainRaceKey = bookdata.racechoices[model.raceval][0];
    var subRaceKey = bookdata.racechoices[model.raceval][1];

    var mainrace = bookdata.races[mainRaceKey];
    var subrace = subRaceKey === undefined ? undefined : bookdata.races[subRaceKey];

    return { main: mainrace, sub: subrace };
}

// --------------------------------------------------
// Misc / Util
// --------------------------------------------------

function rolld(n) {
    return Math.floor(Math.random() * n) + 1;
}

function useDragAndDrop() {
    if (('draggable' in document.createElement('div')) == false)
        return false;
    
    if (navigator.userAgent.toLowerCase().indexOf('mobi') != -1)
        return false;
    
    return true;
}

function objectAssign(target, source) {
    for (var key in source) {
        if (!source.hasOwnProperty(key))
            continue;

        target[key] = source[key];
    }
}

function manageDivSelection(property, changeto) {
    var modelproperty = property + "val"

    var oldval = model[modelproperty];
    $("#" + property + "div-" + oldval).hide();
    
    var $dropdown = $("#" + property + "-dropdown");
    if (changeto != undefined)
        $dropdown.val(changeto);
    else
        changeto = $dropdown.val()

    model[modelproperty] = changeto;
    $("#" + property + "div-" + changeto).show();

    return changeto;
}

function sample(arr) {
   return arr[Math.floor(Math.random() * arr.length)];
}

function weightStr(pounds) {
    if (pounds === 0.5)
        return '1/2 lb.';
    if (pounds === 0.25)
        return '1/4 lb.';
    
    return `${pounds} lb.`
}

function goldStr(gold) {
    var neg = gold < 0? '-' : '';
    var goldabs = Math.abs(gold);

    if (goldabs < 0.001)
        return '0 gp';

    if (goldabs >= 1)
        return `${neg}${fixedIfNeeded(goldabs)} gp`;
    if (goldabs >= 0.1)
        return `${neg}${fixedIfNeeded(goldabs) * 10} sp`;

    return `${neg}${fixedIfNeeded(goldabs) * 100} cp`;
}

function fixedIfNeeded(num) {
    if ((num - (num | 0)) < 0.001)
        return Math.floor(num).toString();
    else
        return num.toFixed(2);
}

function removeDuplicates(arr) {
    var uniq = [];
    for (var i = 0; i < arr.length; i++) {
        if ($.inArray(arr[i], uniq) === -1)
            uniq.push(arr[i]);
    }
    return uniq;
}

function keynameToFullname(str) {
    var arr = str.split('-');

    for (var i = 0; i < arr.length; i++)
        arr[i] = capitalize(arr[i]);

    return arr.join(' ');
}

function capitalize(str) {
    return str[0].toUpperCase() + str.substr(1);
}

function escapeText(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// --------------------------------------------------
// Abilities
// --------------------------------------------------

function calcAbilityModifier(ability) {
    var score = model.finalAbilities[ability];
    return Math.floor((score - 10) / 2);
}

function printableMod(mod) {
    if (mod == 0)
        return '--';
    if (mod > 0) 
        return '+' + mod.toString();
    return mod.toString();
}

function updateBonuses() {
    var racenames = bookdata.racechoices[model.raceval];
    var bonuses = {};

    for (var i = 0; i < racenames.length; i++) {
        var racebonuses = bookdata.races[racenames[i]].bonuses;
        objectAssign(bonuses, racebonuses);
    }


    for (var ability in model.abilities) {
        if (!model.abilities.hasOwnProperty(ability))
            continue;
        
        var bonus = bonuses[ability];
        if (bonus !== undefined) {
            model.bonuses[ability] = bonus;
            continue;
        }

        if (bonuses.choice !== undefined) {
            var primary = $("#bonus-choice1").val();
            var secondary = $("#bonus-choice2").val();

            if (primary === ability || secondary === ability) {
                model.bonuses[ability] = 1;
                continue;
            }
        }

        if (bonuses.all !== undefined) {
            model.bonuses[ability] = 1;
            continue;
        }

        model.bonuses[ability] = 0;
    }
}

function updateAbilities() {
    updateBonuses();
    for (var ability in model.abilities) {
        if (!model.abilities.hasOwnProperty(ability))
            continue;

        var base = model.abilities[ability];
        var bonus = model.bonuses[ability];
        model.finalAbilities[ability] = base + bonus;

        model.abilityModifiers[ability] = calcAbilityModifier(ability);
    }

    updateAbilityHtml();
    updateSpellcasting();
    updateModel();
}

// 4d6, drop the lowest
function rollAbility() {
    var rolls = [rolld(6), rolld(6), rolld(6), rolld(6)]; 
    rolls.sort(function(a, b) { return b - a });
    rolls.pop()
    return rolls.reduce(function(total, n) { return total + n });
}

function rollAllAbilities() {
    for (var ability in model.abilities) {
        if (!model.abilities.hasOwnProperty(ability))
            continue;

        model.abilities[ability] = rollAbility();
    }
}

function abilityArrayFill() {
    model.abilities = {
        str: 15, dex: 14, con: 13, 
        int: 12, wis: 10, cha: 8
    }
}

function updateAbilityHtml() {
    for (var ability in model.abilities) {
        if (!model.abilities.hasOwnProperty(ability))
            continue;

        var $roll  = $("#" + ability);
        var $bonus = $("#" + ability + "-bonus");
        var $final = $("#" + ability + "-final");
        var $mod   = $("#" + ability + "-modifier")

        $roll.html(model.abilities[ability].toString());
        $bonus.html(printableMod(model.bonuses[ability]));
        $final.html(model.finalAbilities[ability].toString());
        $mod.html(printableMod(model.abilityModifiers[ability]));
    }
}

function setupDraggableScores() {
    for (var ability in model.abilities) {
        if (!model.abilities.hasOwnProperty(ability))
            continue;

        (function() {

            var $scorediv = $("#" + ability);
            var scorediv = $scorediv[0];
            var currentAbility = ability;

            scorediv.ondragstart = function(event) {
                $scorediv.css('opacity', '0%');
                event.dataTransfer.setData("text/plain", currentAbility);
                event.dataTransfer.effectAllowed = 'move';
            }

            scorediv.ondragover = function(event) {
                event.dataTransfer.dropEffect = 'move';
                event.preventDefault();
                return false;
            }

            scorediv.ondragenter = function(event) {
                event.preventDefault();
                return false;
            }

            scorediv.ondragexit = function(event) {
                event.preventDefault();
                return false;
            }

            scorediv.ondrop = function(event) {
                var draggedAbility = event.dataTransfer.getData("text/plain");
                if ((draggedAbility in model.abilities) == false || draggedAbility === currentAbility)
                    return true;

                swapAbilityRolls(currentAbility, draggedAbility);
                    
                event.preventDefault();
                return false;
            }

            scorediv.ondragend = function(event) {
                $scorediv.css('opacity', '100%');
                updateAbilities();
            }

        })();

    }
}

function swapAbilityRolls(first, second) {
    var temp = model.abilities[first];
    model.abilities[first] = model.abilities[second];
    model.abilities[second] = temp;
}

var swapAbility = null;

function setupTapSwappableScores() {
    for (var ability in model.abilities) {
        if (!model.abilities.hasOwnProperty(ability))
            continue;

        (function() {
            
            var $scorediv = $("#" + ability);
            var scorediv = $scorediv[0];
            var currentAbility = ability; 

            scorediv.classList.remove("grabbable");
            scorediv.grabbable = false;

            $scorediv.click(function() {
                if (swapAbility === null) {
                    swapAbility = currentAbility;                          
                    scorediv.classList.add("scoreglow");
                } else {
                    swapAbilityRolls(currentAbility, swapAbility);
                    updateAbilities();
                    $("#" + swapAbility)[0].classList.remove("scoreglow");
                    swapAbility = null;
                }
            });
        })();
    }
}

function setupAbilityControls() {
    if (useDragAndDrop()) {
        setupDraggableScores();
    }
    else {
        $("#ability-drag-drop-instructions").hide();
        $("#ability-tap-swap-instructions").show();
        setupTapSwappableScores();
    }
}

// --------------------------------------------------
// Race
// --------------------------------------------------

function selectRace(changeto) {
    let raceval = manageDivSelection('race', changeto);

    $('#dragonborn-table').toggle(raceval === 'dragonborn');
    $('#variant-human-bonus-text').toggle(raceval === 'variant-human');
    $('#half-elf-human-bonus-text').toggle(raceval === 'half-elf');
    $('#bonus-choice-dropdowns').toggle(
        raceval === 'variant-human' || raceval === 'half-elf'
    )

    updateAbilities();
    updateProficiencies();
    updateLanguages();
    updateSpellcasting();
    updateModel();
}

function getCharSpeed() {
    var races = getRaces();
    if (races.sub === undefined)
        return races.main.speed;
    else
        return races.sub.speed;
}

// --------------------------------------------------
// Class
// --------------------------------------------------

function selectClass(changeto) {
    let classval = manageDivSelection('class', changeto);

    selectSorcerousOrigin();
    $('#divine-domains').toggle(model.classval === 'cleric');
    $('#warlock-patrons').toggle(model.classval === 'warlock');
    $('#fighting-style-table').toggle(model.classval === 'fighter');
    $('#expertise-div').toggle(model.classval === 'rouge');

    updateRangerDiv();

    $('#starting-gold-class-label').text(bookdata.classes[model.classval].fullname);
}

function selectSorcerousOrigin() {
    model.originval = $("#sorcerous-origin-dropdown").val();

    $('#sorcerous-origin-dropdown-div').toggle(model.classval === 'sorcerer');
    $('#sorcerer-wild-div').toggle(
        model.classval === 'sorcerer' && model.originval === 'wild-magic'
    )
    $('#sorcerer-draconic-div').toggle(
        model.classval === 'sorcerer' && model.originval === 'draconic-ancestry'
    )
    $('#sorcerous-origin-table').toggle(
        model.classval === 'sorcerer' && model.originval === 'draconic-ancestry'
    );
}

function selectDomain(changeto) {
    let domainval = manageDivSelection('domain', changeto);
}

function selectPatron(changeto) {
    let patronval = manageDivSelection('patron', changeto);
}

function updateRangerDiv() {
    $('#ranger-favor-div').toggle(model.classval === 'ranger');

    var favoredEnemy = $('#favored-enemy-dropdown').val();
    $('#ranger-humanoids-div').toggle(favoredEnemy === "humanoids");

    var langs;
    if (favoredEnemy === "humanoids") {
        var humanoid1 = $('#humanoid-dropdown1').val();
        var humanoid2 = $('#humanoid-dropdown2').val();
        var langs1 = bookdata.languages.byrace[humanoid1];
        var langs2 = bookdata.languages.byrace[humanoid2];

        langs = removeDuplicates(langs1.concat(langs2));
    }
    else {
        langs = bookdata.languages.byrace[favoredEnemy]
    }

    $('#ranger-language-none-text').toggle(langs.length === 0);
    $('#ranger-language-dropdown').toggle(langs.length > 0);
    var $langdrop = $('#ranger-language-dropdown');

    $langdrop.html('');
    for (var i = 0; i < langs.length; i++) {
        var keyname = langs[i];
        var fullname = keynameToFullname(keyname);
        $langdrop.append('<option value="' + keyname + '">' + fullname + '</option>')
    }
}

// --------------------------------------------------
// Background
// --------------------------------------------------

function selectBackground(changeto) {
    let backgroundval = manageDivSelection('background', changeto);

    clearTextFields([
        'background-subtype',
        'personality-trait-one',
        'personality-trait-two',
        'ideal',
        'bond',
        'flaw'
    ]);

    // hide all the background subtype divs, then determine if we
    // should reshow
    $('.background-subtype-div').hide();
    let $subtypediv = $('#background-subtype-' + model.backgroundval);
    if ($subtypediv.length > 0) {
        $subtypediv.show();
        $('#background-subtype-entry-div').show();
    }
    else {
        $('#background-subtype-entry-div').hide();
    }

    $('.background-variant-div').hide();
    $('#variant-feature-' + backgroundval).show();
    $('#variant-background-' + backgroundval).show();
}

function setupSuggestionButton(prefix, section, subsection) {
    $('#' + prefix + '-button').click(function() {
        var background = bookdata.backgrounds[model.backgroundval];
        var $textarea = $('#' + prefix + '-text');
        
        var text = $textarea.text();

        while($textarea.text() === text) {
            if (subsection === undefined)
                text = sample(background[section]);
            else
                text = sample(background[section][subsection]);
        }

        $textarea.text(text);
        updateModel();
        updateSummary();
    })
}

function clearTextFields(prefixes) {
    for (var i = 0; i < prefixes.length; i++)
        $('#' + prefixes[i] + '-text').text('');
}

function setupAllSuggestionButtons() {
    setupSuggestionButton('background-subtype', 'subtype', 'values')
    setupSuggestionButton('personality-trait-one', 'traits');
    setupSuggestionButton('personality-trait-two', 'traits');
    setupSuggestionButton('ideal', 'ideals');
    setupSuggestionButton('bond', 'bonds');
    setupSuggestionButton('flaw', 'flaws');
}

// --------------------------------------------------
// Proficiencies and languages
// --------------------------------------------------

function updateProficiencies() {
    $('.prof-source-div').hide();
    
    $('.' + model.raceval + '-prof-source-div').show();
    $('.' + model.classval + '-prof-source-div').show();
    $('.' + model.backgroundval + '-prof-source-div').show();

    var features = getFeatures();
    for (var i = 0; i < features.length; i++) {
        $('.' + features[i] + '-prof-source-div').show();
    }
}

function getLanguages() {
    var extra = 0;
    var languages = getRaces().main.languages;
    var features = getFeatures();

    for (var i = 0; i < features.length; i++) {
        var feature = bookdata.features[features[i]];
        if (feature['bonus-languages'] !== undefined) {
            extra += feature['bonus-languages'];
        }

        if (feature['languages'] !== undefined)
            languages = languages.concat(feature['languages']);
    }

    extra += bookdata.backgrounds[model.backgroundval].languages || 0;

    return { list: languages, extra: extra };
}

function updateLanguages() {
    var languages = getLanguages();
    var $langlist = $("#languages-list");

    $langlist.html('');

    for (var i = 0; i < languages.list.length; i++) {
        var fullname = keynameToFullname(languages.list[i]);
        $langlist.append( '<li class="two-column-section"><b>' + fullname + '<b></li>');
    }

    for (var i = 0; i < languages.extra; i++) {
        var html = '<li class="two-column-section">' 
        html += '<b>Extra Language: </b>'
        html += '<select class="extra-language-dropdown">';
        bookdata.languages.list.forEach(function (lang) {
            var fullname = keynameToFullname(lang);
            html += '<option value="' + lang + '">' + fullname + '</option>';
        });
        html += '</select>';
        $langlist.append(html);
    }

    $('.extra-language-dropdown').change(function() {
        updateModel();
        updateSummary();
    });
}

// --------------------------------------------------
// Equipment 
// --------------------------------------------------

function selectEquipmentTable() {
    $('.equipment-table-div').hide();

    var category = $('#equipment-dropdown').val();
    $('#buy-' + category + '-table').show()

    $('#armor-small-print').toggle(category === 'armor');
}

function updateInventory() {
    var goldstr = bookdata.classes[model.classval].goldstr;
    $('#amount-gold-text').text(goldstr);

    var currentGold = model.initialGold - model.spentGold;

    $('#initial-gold-tracker').text(goldStr(model.initialGold));
    $('#spent-gold-tracker').text(goldStr(model.spentGold));
    $('#current-gold-tracker').text(goldStr(currentGold));

    var $inventory = $('#inventory-table-body');
    $inventory.html('');
    for (var i = 0; i < model.inventory.length; i++) {
        (function() {
            var key = model.inventory[i].itemkey;
            var item = getEquipmentItem(key);
            var name = item.fullname;
            var qty = model.inventory[i].qty;
            var cost = goldStr(item.cost);
            var weight = weightStr(item.weight);
            $inventory.append(
                '<tr>' + 
                ' <td>' + name + '</td>' +
                ' <td>' + cost + '</td>' +
                ' <td>' + weight + '</td>' + 
                ' <td>x ' + qty + '</td>' +
                ' <td> ' +
                '  <button class="remove-button table-button" id="' + key + '-remove-button">Remove</button>' +
                ' </td>' +
                '</tr>'
            );

            $('#' + key + '-remove-button').click(function() {
                for (var i = 0; i < model.inventory.length; i++) {
                    if (model.inventory[i].itemkey == key) {
                        model.spentGold -= item.cost;
                        
                        if (model.inventory[i].qty > 1)
                            model.inventory[i].qty--;
                        else
                            model.inventory.splice(i, 1);

                        updateInventory();
                        return;
                    }
                }
            });
        })();
    }

    $('#no-inventory-div').toggle(model.inventory.length == 0);
    $('#inventory-table, #remove-all-button-div').toggle(model.inventory.length > 0);
}

function calculateGold(takeAverage) {
    if (takeAverage) {
        var goldavg = bookdata.classes[model.classval].goldavg;
        model.initialGold = goldavg;
    }
    else {
        var goldarr = bookdata.classes[model.classval].gold;

        var dicenumber = goldarr[0];
        var dicetype   = goldarr[1];
        var multiplier = goldarr[2];

        var sum = 0;
        for (var i = 0; i < dicenumber; i++)
            sum += rolld(dicetype);
        
        model.initialGold = sum * multiplier;
    }
    updateInventory();
}

function addInventoryItem(itemkey) {
    for (var i = 0; i < model.inventory.length; i++) {
        if (model.inventory[i].itemkey == itemkey) {
            model.inventory[i].qty += 1;
            return;
        }
    }
    model.inventory.push({ itemkey, qty: 1 });
}

function setupEquipmentControls() {
    for (var i = 0; i < equipmentList.length; i++) {
        (function () {
            var item = equipmentList[i];

            $('#' + item.keyname + '-buy-button').click(function() {
                addInventoryItem(item.keyname);
                model.spentGold += item.cost;
                updateInventory();
            });
        })();
    }
}

var equipmentList;
function gatherEquipmentList() {
    equipmentList = bookdata.weapons.concat(
        bookdata.armors,
        bookdata.packs,
        bookdata.items
    );
}

function clearInventory() {
    for (var i = 0; i < model.inventory.length; i++) {
        var item = getEquipmentItem(model.inventory[i].itemkey);
        var cost = item.cost;
        var qty = model.inventory[i].qty;
        model.spentGold -= cost * qty;
    }

    model.inventory = [];
}

function getEquipmentItem(keyname) {
    for (var i = 0; i < equipmentList.length; i++) {
        if (equipmentList[i].keyname === keyname)
            return equipmentList[i];
    }
    return null;
}

// --------------------------------------------------
// Spellcasting
// --------------------------------------------------

var spellcasters = ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'];
var spellPreppers = ['wizard', 'cleric', 'druid'];

function updateSpellcasting() {
    var features = getFeatures();

    var isSpellCastingClass = $.inArray(model.classval, spellcasters) !== -1;
    var preparesSpells = $.inArray(model.classval, spellPreppers) !== -1;
    var hasSpellsKnown = isSpellCastingClass && (model.classval != 'cleric' && model.classval != 'druid');
    
    var canCastSpells = isSpellCastingClass;

    if (model.raceval === 'high-elf')
        canCastSpells = true; 

    $('#elf-cantrip-div').toggle(model.raceval === 'high-elf');
    $('#acolyte-of-nature-div').toggle( model.classval === 'cleric' && model.domainval === 'nature-domain');

    $('.feature-cantrip').hide();
    for (var i = 0; i < features.length; i++) {
        if (bookdata.features[features[i]].cantrip !== undefined) {
            $('#feature-cantrip-' + features[i]).show();
            canCastSpells = true;
        }
    }

    $('#cantrips-div').toggle(isSpellCastingClass);
    $('#spells-known-div').toggle(isSpellCastingClass);
    $('#spells-section').toggle(canCastSpells);
    $('#spells-known-div').toggle(hasSpellsKnown);
    $('#prepared-spells-div').toggle(preparesSpells);

    var $cantrips = $('#cantrips-list');
    $cantrips.html('');

    if (isSpellCastingClass) {
        var cantripsKnown = bookdata.classes[model.classval].cantripsknown;
        var cantripsList = bookdata.classes[model.classval].cantrips;
        var html = '';
        for (var i = 0; i < cantripsKnown; i++) {
            html += '<select class="cantrips-known-dropdown trigger-model-update-onchange">';
            for (var j = 0; j < cantripsList.length; j++) {
                var keyname = cantripsList[j];
                var fullname = keynameToFullname(keyname);
                html += '<option value="' + keyname + '">' + fullname + '</option>';
            }
            html += '</select>';
        }

        $cantrips.html(html);
    }

    var $spellsknown = $('#spells-known-list');
    $spellsknown.html('');

    if (hasSpellsKnown) {
        var spellsKnown = bookdata.classes[model.classval].spellsknown;
        var spellsList = bookdata.classes[model.classval].spells;
        var html = '';
        for (var i = 0; i < spellsKnown; i++) {
            html += '<select class="spells-known-dropdown trigger-model-update-onchange">';
            for (var j = 0; j < cantripsList.length; j++) {
                var keyname = spellsList[j];
                var fullname = keynameToFullname(keyname);
                html += '<option value="' + keyname + '">' + fullname + '</option>';
            }
            html += '</select>'
        }
        $spellsknown.html(html);
    }

    if (preparesSpells) {
        if (model.classval == 'cleric' || model.classval == 'druid') {
            var nspells = Math.max(1, model.abilityModifiers.wis + 1);
            var classname = capitalize(model.classval);
            $('#prepared-spell-text').text('You can prepare ' + nspells + ' spell(s) from the ' + classname + ' spell list.');
        }
        else {
            var nspells = Math.max(1, model.abilityModifiers.int + 1);
            $('#prepared-spell-text').text('You can prepare ' + nspells + ' spell(s) from your spellbook.');
        }
    }
}

// --------------------------------------------------
// Summary / Model Updating and Processing 
// --------------------------------------------------

function getProficiencies() {
    var profs = {};

    var bg = bookdata.backgrounds[model.backgroundval];
    var charclass = bookdata.classes[model.classval];
    var race = bookdata.classes[model.raceval];
    var features = getFeatures();

    profs.skills = bg.skills.slice(0)
    profs.tools = bg.tools.slice(0);

    profs.weapons = charclass.weaponprof.slice(0);
    profs.armors = charclass.armorprof.slice(0);

    profs.languages = getLanguages.list.concat(model.languageChoices);

    $.each(features, function(i, featurekey) {
        var featureprofs = bookdata.features[featurekey].proficiencies;
        if (!featureprofs)
            continue;

        $.each(featureprofs, function(j, proficiency) {
            var category = categoriseProficiency(proficiency); 
            profs[category] = proficiency;
        });
    });
}

function categoriseProficiency(proficiency) {
    $.each(bookdata.profCategories, function(category, list) {
        if ($.inArray(proficiency, list)) {
            if (category === 'artisans-tools' || category === 'gaming-set' || category === 'musical-instrument') 
                return 'tools';
            else
                return category;
        }
    });

    $.each(bookdata.weapons, function (i, weapon) {
        if (proficiency === weapon.keyname)
            return 'weapons'
    });

    $.each(bookdata.armors, function (i, armor) {
        if (proficiency === armor.keyname)
            return 'armors'
    });

    return 'languages';
}

function AppendListItem(html, title, desc, subpoints) {
    html += '<li class="two-column">';
    var onlyTitle = ( typeof desc !== 'string' && (subpoints === undefined || subpoints.length === 0));

    html += ('<b>' + escapeText(title) + (onlyTitle ? '</b>' : ': </b>'));

    if (typeof desc === 'string') 
        html += escapeText(desc);

    if (subpoints !== undefined && subpoints.length > 0) {
        html += '<ul>';
        for (var i = 0; i < subpoints.length; i++) {
            if (typeof subpoints[i] === 'string') {
                html += '<li>' + escapeText(subpoints[i]) + '</li>';
            }
            else {
                html += '<li>';
                html += '<b>' + escapeText(subpoints[i][0]) + ': </b>';
                html += escapeText(subpoints[i][1]);
                html += '</li>'
            }
        }
        html += '</ul>';
    }

    html += '</li>'

    return html;
}

function updateSummary() {
    var html = '<ul class="two-column">';

    html = AppendListItem(html, "Description", null, [
        ['Name', model.charname || '--'],
        ['Appearance', model.appearance || '--'],
        ['Race', keynameToFullname(model.raceval)],
        ['Class and Level', 'Level 1 ' + keynameToFullname(model.classval)],
        ['Alignment', keynameToFullname(model.alignment)]
    ]);

    html = AppendListItem(html, 'Attributes', null, [
        ['Proficiency Bonus', '2'],
        ['Initiative', (10 + model.abilityModifiers.dex).toString()],
        ['Speed', getCharSpeed().toString()],
        ['Size', capitalize(getRaces().main.size)],
        ['Hit Points', (bookdata.classes[model.classval].hitdie + model.abilityModifiers.con).toString()],
        ['Hit Dice', '1d' + bookdata.classes[model.classval].hitdie]
        
    ]);

    html = AppendListItem(html, "Ability Scores", null, [
        ['Strength',     model.finalAbilities.str + ' (+' + model.abilityModifiers.str + ')'],
        ['Dexterity',    model.finalAbilities.dex + ' (+' + model.abilityModifiers.dex + ')'],
        ['Constitution', model.finalAbilities.con + ' (+' + model.abilityModifiers.con + ')'],
        ['Intelligence', model.finalAbilities.int + ' (+' + model.abilityModifiers.int + ')'],
        ['Wisdom',       model.finalAbilities.wis + ' (+' + model.abilityModifiers.wis + ')'],
        ['Charisma',     model.finalAbilities.cha + ' (+' + model.abilityModifiers.cha + ')'],
    ]);

    html += '</ul>';
    $('#summary-div').html(html);
}

// read all data from the page into the model, except the
// stuff that directly updates itself
function updateModel() {
    model.charname = $('#character-name-field').val();
    model.appearance = $('#appearance-field').val();
    model.alignment = $('#alignment-dropdown').val();

    model.fightingStyle = $('input[type="radio"][name="fighting-style"]:checked').val();
    model.dragonbornAncestry = $('input[type="radio"][name="dragonborn-ancestry"]:checked').val();
    model.originDragontype = $('input[type="radio"][name="origin-dragontype"]:checked').val();

    model.rangerEnemy = $('#favored-enemy-dropdown').val();
    model.rangerTerrain = $('#favored-terrain-dropdown').val();
    model.rangerHumanoid1 = $('#humanoid-dropdown1').val();
    model.rangerHumanoid2 = $('#humanoid-dropdown2').val();
    model.rangerLanguage = $('#ranger-language-dropdown').val();

    model.expertise1 = $('#expertise-dropdown1').val();
    model.expertise2 = $('#expertise-dropdown2').val();

    model.bonusChoice1 = $('#bonus-choice1').val();
    model.bonusChoice2 = $('#bonus-choice2').val();

    model.bgVariants = [];
    $('.bg-variant-checkbox').each(function() {
        if (this.checked)
            model.bgVariants.push(this.id);
    });

    model.bgSubtype = $('#background-subtype-text').text();

    model.trait1 = $('#personality-trait-one-text').text();
    model.trait2 = $('#personality-trait-two-text').text();

    model.ideal = $('#ideal-text').text();
    model.bond = $('#bond-text').text();
    model.flaw = $('#flaw-text').text();

    model.profchoices = [];
    
    // get values of proficiency dropdowns associated with class
    $('.' + model.classval + '-prof-dropdown').each(function() {
        model.profchoices.push({
            sourcekey: model.classval,
            value: this.value
        });
    });

    // get values of proficiency dropdowns associated with features
    var features = getFeatures();
    for (var i = 0; i < features.length; i++) {
        $('#' + features[i] + '-prof-dropdown').each(function() {
            model.profchoices.push({
                sourcekey: features[i],
                value: this.value
            });
        });
    }

    // get values of proficiency dropdowns associated with background
    $('.' + model.backgroundval + '-prof-dropdown').each(function() {
        model.profchoices.push({
            sourcekey: model.backgroundval,
            value: this.value
        });
    });

    model.languageChoices = [];
    $('.extra-language-dropdown').each(function() {
        model.languageChoices.push(this.value);
    })

    model.acolyteCantrip = $('#acolyte-cantrip-dropdown').val();
    model.elfCantrip = $('#elf-cantrip-dropdown').val();

    model.cantrips = [];
    model.spells = [];

    $('.cantrips-known-dropdown').each(function() {
        model.cantrips.push(this.value);
    })
    
    $('.spells-known-dropdown').each(function() {
        model.spells.push(this.value);
    })

    model.trinket = $('#trinket-div').text();

    updateSummary();
}


// --------------------------------------------------
// Page
// --------------------------------------------------

function pageinit() {
    newModel();

    setupAbilityControls();
    setupAllSuggestionButtons();
    gatherEquipmentList();
    setupEquipmentControls();

    $('#black-dragonborn-ancestry').prop("checked", true);
    $('#black-origin-dragontype').prop("checked", true);
    $('#archery-fighting-style').prop("checked", true);

    selectRace(model.raceval);
    selectClass(model.classval);
    selectDomain(model.domainval);
    selectPatron(model.patronval);
    selectBackground(model.backgroundval)
    updateProficiencies();
    selectEquipmentTable();
    updateInventory();
    updateLanguages();
    updateSpellcasting();
    updateModel();

    $('#race-dropdown').change(function() {
        selectRace();
        updateProficiencies();
        updateLanguages();
        updateSpellcasting();
        updateModel();
    })

    $('#class-dropdown').change(function() {
        selectClass();
        updateProficiencies();
        updateInventory();
        updateLanguages();
        updateSpellcasting();
        updateModel();
    })

    $('#domain-dropdown').change(function() {
        selectDomain();
        updateProficiencies();
        updateLanguages();
        updateSpellcasting();
        updateModel();
    })

    $('#patron-dropdown').change(function() {
        selectPatron();
        updateProficiencies();
        updateLanguages();
        updateSpellcasting();
        updateModel();
    })

    $('#sorcerous-origin-dropdown').change(function() {
        selectSorcerousOrigin();
        updateProficiencies();
        updateLanguages();
        updateSpellcasting();
        updateModel();
    })

    $('#background-dropdown').change(function() {
        selectBackground();
        updateProficiencies();
        updateLanguages();
        updateModel();
    })

    $('#equipment-dropdown').change(function() {
        selectEquipmentTable();
    })

    $('#abilities-roll-button').click(function() {
        rollAllAbilities();
        updateAbilities();
    });

    $('#abilities-array-button').click(function() {
       abilityArrayFill();
       updateAbilities();
    });

    $('#bonus-choice1').change(function() {
        updateAbilities();
    });

    $('#bonus-choice2').change(function() {
        updateAbilities();
    });

    $('#remove-all-button').click(function() {
        clearInventory();
        updateInventory();
        updateSummary();
    });

    $('#gold-roll-button').click(function() {
        calculateGold(false);
        updateSummary();
    });

    $('#gold-avg-button').click(function() {
        calculateGold(true);
        updateSummary();
    });

    $('#trinket-button').click(function() {
        $('#trinket-div').text(sample(bookdata.trinkets));
        updateModel();
        updateSummary();
    });

    $('#favored-enemy-dropdown, #humanoid-dropdown1, #humanoid-dropdown2').change(function() {
        updateRangerDiv();
        updateModel();
        updateSummary();
    });

    $('.trigger-model-update-onchange').change(function() {
        updateModel();
        updateSummary();
    });

    $('.trigger-model-update-onblur').blur(function() {
        updateModel();
        updateSummary();
    });
}

var bookdata;

$.get("/api/jsondata", function(data, status) {
    if (status !== 'success')
        alert('failed to request book data');
    else
        bookdata = JSON.parse(data);

    pageinit();
});