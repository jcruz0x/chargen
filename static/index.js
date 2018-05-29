
currentRaceSelector = null;

function selectrace() {
    if (currentRaceSelector !== null)
        $(currentRaceSelector).hide();

    var raceval = $('#race-dropdown').val();
    var newRaceSelector = '#racediv-' + raceval;
    $(newRaceSelector).show();

    currentRaceSelector = newRaceSelector;
}

function pageinit() {
    selectrace();
}

$('document').ready(function() {
    pageinit();

    $('#race-dropdown').change(function() {
        selectrace();
    })
})