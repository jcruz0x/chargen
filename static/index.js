
// --------------------------------------------------
// Model
// --------------------------------------------------

var model;

function newModel() {
    model = {};

    // race and class defaults
    model.raceval = 'human';
    model.classval = 'fighter';

    // cleric domain and warlock patron defaults
    model.domainval = 'knowledge-domain';
    model.patronval = 'the-archfey';
    model.originval = 'wild-magic';
    model.backgroundval = 'acolyte';

    // ability defaults
    model.abilities = {
        str: 10, dex: 10, con: 10, 
        int: 10, wis: 10, cha: 10
    };

    model.bonuses = {};
    model.finalAbilities = {};
    model.abilityModifiers = {};
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
    
    $dropdown = $("#" + property + "-dropdown");
    if (changeto != undefined)
        $dropdown.val(changeto);
    else
        changeto = $dropdown.val()

    model[modelproperty] = changeto;
    $("#" + property + "div-" + changeto).show();

    return changeto;
}

function conditionallyShow(selector, truthval) {
    if (truthval)
        $(selector).show();
    else
        $(selector).hide();
}

function sample(arr) {
   return arr[Math.floor(Math.random() * arr.length)];
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

    conditionallyShow('#dragonborn-table', raceval === 'dragonborn');

    if (raceval == 'variant-human') {
        $('#bonus-choice-dropdowns').show();
        $('#variant-human-bonus-text').show();
        $('#half-elf-bonus-text').hide();
    }
    else if (raceval == 'half-elf') {
        $('#bonus-choice-dropdowns').show();
        $('#variant-human-bonus-text').hide();
        $('#half-elf-bonus-text').show();
    }
    else {
        $('#bonus-choice-dropdowns').hide();
        $('#variant-human-bonus-text').hide();
        $('#half-elf-bonus-text').hide();
    }

    updateAbilities();
}

// --------------------------------------------------
// Class
// --------------------------------------------------

function selectClass(changeto) {
    let classval = manageDivSelection('class', changeto);

    selectSorcerousOrigin();
    conditionallyShow('#divine-domains', classval === 'cleric');
    conditionallyShow('#warlock-patrons', classval === 'warlock');
}

function selectSorcerousOrigin() {
    model.originval = $("#sorcerous-origin-dropdown").val();

    conditionallyShow('#sorcerous-origin-dropdown-div', model.classval === 'sorcerer');
    let showtable = (model.classval === 'sorcerer' && model.originval === 'origin-draconic');
    conditionallyShow('#sorcerous-origin-table', showtable);
}

function selectDomain(changeto) {
    let domainval = manageDivSelection('domain', changeto);
}

function selectPatron(changeto) {
    let patronval = manageDivSelection('patron', changeto);
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
        $textarea = $('#' + prefix + '-text');
        
        var text = $textarea.val();

        while($textarea.val() === text) {
            if (subsection === undefined)
                text = sample(background[section]);
            else
                text = sample(background[section][subsection]);
        }

        $textarea.val(text);
    })
}

function clearTextFields(prefixes) {
    for (var i = 0; i < prefixes.length; i++)
        $('#' + prefixes[i] + '-text').val('');
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
// Page
// --------------------------------------------------

function pageinit() {
    newModel();
    setupAbilityControls();
    setupAllSuggestionButtons();
    selectRace(model.raceval);
    selectClass(model.classval);
    selectDomain(model.domainval);
    selectPatron(model.patronval);
    selectBackground(model.backgroundval)

    $('#race-dropdown').change(function() {
        selectRace();
    })

    $('#class-dropdown').change(function() {
        selectClass();
    })

    $('#domain-dropdown').change(function() {
        selectDomain();
    })

    $('#patron-dropdown').change(function() {
        selectPatron();
    })

    $('#sorcerous-origin-dropdown').change(function() {
        selectSorcerousOrigin();
    })

    $('#background-dropdown').change(function() {
        selectBackground();
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
    })

    $('#bonus-choice-secondary').change(function() {
        updateAbilities();
    })

    // $('#classdiv-fighter').show();
}

var bookdata;

$.get("/api/jsondata", function(data, status) {
    if (status !== 'success')
        alert('failed to request book data');
    else
        bookdata = JSON.parse(data);

    pageinit();
});