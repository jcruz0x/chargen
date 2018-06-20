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
            var primary = $("#bonus-choice-primary").val();
            var secondary = $("#bonus-choice-secondary").val();

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
        var humanoid1 = $('#humanoid-dropdown-first').val();
        var humanoid2 = $('#humanoid-dropdown-second').val();
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
        html += '<b>Extra Language:</b>'
        html += '<select class="extra-language-dropdown">';
        bookdata.languages.list.forEach(function (lang) {
            var fullname = keynameToFullname(lang);
            html += '<option value="' + lang + '">' + fullname + '</option>';
        });
        html += '</select>';
        $langlist.append(html);
    }
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
            var name = model.inventory[i].item.fullname;
            var qty = model.inventory[i].qty;
            var cost = goldStr(model.inventory[i].item.cost);
            var weight = weightStr(model.inventory[i].item.weight);
            var key = model.inventory[i].item.keyname;
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
                    if (model.inventory[i].item.keyname == key) {
                        model.spentGold -= model.inventory[i].item.cost;
                        
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
    $('#inventory-table').toggle(model.inventory.length > 0);
    $('#remove-all-button-div').toggle(model.inventory.length > 0);
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

function addInventoryItem(item) {
    for (var i = 0; i < model.inventory.length; i++) {
        if (model.inventory[i].item.keyname == item.keyname) {
            model.inventory[i].qty += 1;
            return;
        }
    }
    model.inventory.push({ item, qty: 1 });
}

function setupEquipmentControls() {
    for (var i = 0; i < equipmentList.length; i++) {
        (function () {
            var item = equipmentList[i];

            $('#' + item.keyname + '-buy-button').click(function() {
                addInventoryItem(item);
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
        var cost = model.inventory[i].item.cost;
        var qty = model.inventory[i].qty;
        model.spentGold -= cost * qty;
    }

    model.inventory = [];
}

// --------------------------------------------------
// Summary / Model Processing
// --------------------------------------------------

function gatherFeatures() {
    
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

    selectRace(model.raceval);
    selectClass(model.classval);
    selectDomain(model.domainval);
    selectPatron(model.patronval);
    selectBackground(model.backgroundval)
    updateProficiencies();
    selectEquipmentTable();
    updateInventory();
    updateLanguages();

    $('#race-dropdown').change(function() {
        selectRace();
        updateProficiencies();
        updateLanguages();
    })

    $('#class-dropdown').change(function() {
        selectClass();
        updateProficiencies();
        updateInventory();
        updateLanguages();
    })

    $('#domain-dropdown').change(function() {
        selectDomain();
        updateProficiencies();
        updateLanguages();
    })

    $('#patron-dropdown').change(function() {
        selectPatron();
        updateProficiencies();
        updateLanguages();
    })

    $('#sorcerous-origin-dropdown').change(function() {
        selectSorcerousOrigin();
        updateProficiencies();
        updateLanguages();
    })

    $('#background-dropdown').change(function() {
        selectBackground();
        updateProficiencies();
        updateLanguages();
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

    $('#bonus-choice-primary').change(function() {
        updateAbilities();
    });

    $('#bonus-choice-secondary').change(function() {
        updateAbilities();
    });

    $('#remove-all-button').click(function() {
        clearInventory();
        updateInventory();
    });

    $('#black-dragonborn-ancestry').prop("checked", true);
    $('#black-sorcerous-origin').prop("checked", true);
    $('#archery-fighting-style').prop("checked", true);

    $('#gold-roll-button').click(function() {
        calculateGold(false);
    });

    $('#gold-avg-button').click(function() {
        calculateGold(true);
    });

    $('#trinket-button').click(function() {
        $('#trinket-div').text(sample(bookdata.trinkets));
    });

    $( '#favored-enemy-dropdown, #humanoid-dropdown-first, #humanoid-dropdown-second')
        .change(function() {
            updateRangerDiv();
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