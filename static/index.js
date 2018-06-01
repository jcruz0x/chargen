
// --------------------------------------------------
// Model
// --------------------------------------------------

currentRaceSelector = null;
var model;

function newmodel() {
    model = {};
    model.raceval = $('#race-dropdown').val();
    model.abilities = {
        str: 10, dex: 10, con: 10, 
        int: 10, wis: 10, cha: 10
    }
}


// --------------------------------------------------
// Abilities
// --------------------------------------------------

function isAbility(id) {
    for (var ability in model.abilities) {
        if (!model.abilities.hasOwnProperty(ability))
            continue;

        if (id === ability)
            return true;
    }
    return false;
}

function rolld(n) {
    return Math.floor(Math.random() * n) + 1;
}

// 4d6, drop the lowest
function rollAbility() {
    var rolls = [rolld(6), rolld(6), rolld(6), rolld(6)]; 
    rolls.sort(function(a, b) { return b - a });
    rolls.pop()
    return rolls.reduce(function(total, n) { return total + n });
    return ability;
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

        $("#" + ability).html(model.abilities[ability].toString());
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

            scorediv.ondrop = function(event) {
                var draggedAbility = event.dataTransfer.getData("text/plain");
                if (!isAbility(draggedAbility) || draggedAbility === currentAbility)
                    return true;
                    
                var temp = model.abilities[currentAbility];
                model.abilities[currentAbility] = model.abilities[draggedAbility];
                model.abilities[draggedAbility] = temp;
                
                event.preventDefault();
                return false;
            }

            scorediv.ondragend = function(event) {
                $scorediv.css('opacity', '100%');
                updateAbilityHtml();
            }

        })();

    }
}



// --------------------------------------------------
// Race
// --------------------------------------------------

function selectrace() {
    if (currentRaceSelector !== null)
        $(currentRaceSelector).hide();

    var raceval = $('#race-dropdown').val();
    model.raceval = raceval;

    var newRaceSelector = '#racediv-' + raceval;
    $(newRaceSelector).show();
    currentRaceSelector = newRaceSelector;

    if (raceval == 'dragonborn')
        $('#dragonborn-table').show();
    else
        $('#dragonborn-table').hide();

}

// --------------------------------------------------
// Page
// --------------------------------------------------

function pageinit() {
    newmodel();
    setupDraggableScores();
    selectrace();
}

$('document').ready(function() {
    pageinit();

    $('#race-dropdown').change(function() {
        selectrace();
    })

    $('#abilities-roll-button').click(function() {
        rollAllAbilities();
        updateAbilityHtml();
    });

    $('#abilities-array-button').click(function() {
       abilityArrayFill();
       updateAbilityHtml();
    });
})