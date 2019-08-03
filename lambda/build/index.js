"use strict";
/*
 *
 * Piazza Insulin Calculator
 * Copyright Michael Piazza 2018
 *
 */
exports.__esModule = true;
/* ---------------- Constants ---------------- */
/* Enum for time of day */
var TimeOfDay;
(function (TimeOfDay) {
    TimeOfDay["Morning"] = "morning";
    TimeOfDay["Afternoon"] = "afternoon";
    TimeOfDay["Evening"] = "evening";
})(TimeOfDay || (TimeOfDay = {}));
/* A mapping from time of day -> glucose ratio */
var INSULIN_PER_CARB_RATIOS = {};
INSULIN_PER_CARB_RATIOS[TimeOfDay.Morning] = (1 / 9);
INSULIN_PER_CARB_RATIOS[TimeOfDay.Afternoon] = (1 / 14);
INSULIN_PER_CARB_RATIOS[TimeOfDay.Evening] = (1 / 9);
var MIN_BLOOD_GLUCOSE = 40;
var MAX_BLOOD_GLUCOSE = 500;
/* Number of units of blood glucose which have the same correction factor applied. */
var ADJUSTMENT_INTERVAL = 20;
/* Floor of the 'happy interval' where no adjustments are applied. */
var MINIMUM_NO_ADJUSTMENT_GLUCOSE = 100;
/* Ceiling of the 'happy interval' where no adjustments are applied. */
var MAXIMUM_NO_ADJUSTMENT_GLUCOSE = 150;
/* How many units of insulin we add or subtract, per adjustment unit. */
var BASE_ADJUSTMENT_INSULIN_UNIT = 0.5;
/* ---------------- Insulin Calculation ---------------- */
/* Returns how many adjustment units we are below our happy interval. */
var getNumAdjustmentsFromMin = function (bg) {
    var delta = MINIMUM_NO_ADJUSTMENT_GLUCOSE - bg;
    var numAdjustments = Math.ceil(delta / ADJUSTMENT_INTERVAL);
    return numAdjustments;
};
/* Returns how many adjustment units we are above our happy interval. */
var getNumAdjustmentsFromMax = function (bg) {
    var delta = bg - MAXIMUM_NO_ADJUSTMENT_GLUCOSE;
    var numAdjustments = Math.ceil(delta / ADJUSTMENT_INTERVAL);
    return numAdjustments;
};
/* Calculates how many insulin units to adjust relative to the standard formula based on the blood glucose.  */
var calculateAdjustment = function (bg) {
    if (bg >= MINIMUM_NO_ADJUSTMENT_GLUCOSE &&
        bg <= MAXIMUM_NO_ADJUSTMENT_GLUCOSE) {
        return 0;
    }
    var adjustment;
    if (bg < MINIMUM_NO_ADJUSTMENT_GLUCOSE) {
        var numAdjustments = getNumAdjustmentsFromMin(bg);
        adjustment = -1 * numAdjustments * BASE_ADJUSTMENT_INSULIN_UNIT;
    }
    else {
        var numAdjustments = getNumAdjustmentsFromMax(bg);
        adjustment = numAdjustments * BASE_ADJUSTMENT_INSULIN_UNIT;
    }
    return adjustment;
};
var calculateBucket = function (bg) {
    if (bg >= MINIMUM_NO_ADJUSTMENT_GLUCOSE &&
        bg <= MAXIMUM_NO_ADJUSTMENT_GLUCOSE) {
        return [MINIMUM_NO_ADJUSTMENT_GLUCOSE, MAXIMUM_NO_ADJUSTMENT_GLUCOSE];
    }
    var min;
    var max;
    if (bg < MINIMUM_NO_ADJUSTMENT_GLUCOSE) {
        var adjustments = getNumAdjustmentsFromMin(bg);
        min = MINIMUM_NO_ADJUSTMENT_GLUCOSE - (ADJUSTMENT_INTERVAL * adjustments);
        max = MINIMUM_NO_ADJUSTMENT_GLUCOSE - (ADJUSTMENT_INTERVAL * (adjustments - 1)) - 1;
    }
    else {
        var adjustments = getNumAdjustmentsFromMax(bg);
        min = MAXIMUM_NO_ADJUSTMENT_GLUCOSE + (ADJUSTMENT_INTERVAL * (adjustments - 1)) + 1;
        max = MAXIMUM_NO_ADJUSTMENT_GLUCOSE + (ADJUSTMENT_INTERVAL * adjustments);
    }
    return [min, max];
};
var calculateInsulinWithExplanation = function (bg, carbs, timeOfDay) {
    var insulinPerCarbRatio = INSULIN_PER_CARB_RATIOS[timeOfDay];
    var baseInsulin = carbs * insulinPerCarbRatio;
    var adjustment = calculateAdjustment(bg);
    var adjustedInsulin = Math.max(baseInsulin + adjustment, 0);
    var formattedAdjustedInsulin = Number(adjustedInsulin.toFixed(2));
    var messageInput = {
        adjustment: adjustment,
        baseInsulin: baseInsulin,
        bg: bg,
        carbs: carbs,
        insulinPerCarbRatio: insulinPerCarbRatio,
        timeOfDay: timeOfDay
    };
    var message = formatMessage(messageInput);
    return [formattedAdjustedInsulin, message];
};
var formatMessage = function (input) {
    var adjustment = input.adjustment, bg = input.bg, timeOfDay = input.timeOfDay, insulinPerCarbRatio = input.insulinPerCarbRatio, baseInsulin = input.baseInsulin, carbs = input.carbs;
    var capitalize = function (word) { return (word.charAt(0).toUpperCase() + word.slice(1)); };
    var adjustmentPartial;
    if (adjustment === 0) {
        adjustmentPartial = "no extra insulin added";
    }
    else {
        adjustmentPartial = Math.abs(adjustment) + " units of insulin  " + (adjustment > 0 ? "added" : "subtracted");
    }
    var bucket = calculateBucket(bg);
    var baseMsg = "<li> " + capitalize(timeOfDay) + " insulin to carb ratio: " + insulinPerCarbRatio.toFixed(2) + ". </li>\n                <li> " + capitalize(carbs.toString()) + " carbs * " + insulinPerCarbRatio.toFixed(2) + " units per carb = " + baseInsulin.toFixed(2) + " units of insulin.</li>";
    var adjustmentMsg = "<li>" + capitalize(adjustmentPartial) + " because blood glucose of " + bg + " is in the range of " + bucket[0] + " to " + bucket[1] + ".</li>";
    return baseMsg + "\n" + adjustmentMsg;
};
/* TODO: Think of a better name for this fella */
var main = function (request) {
    /*  TODO: Refactor this bit here */
    if (request.bg < MIN_BLOOD_GLUCOSE) {
        return {
            bloodGlucose: request.bg,
            carbs: request.carbs,
            insulin: 0,
            message: "Error: Blood Glucose is less than " + MIN_BLOOD_GLUCOSE + ",\n                 and doctor hasn't specified what to do in this situation. \n Time to call a relative.",
            timeOfDay: request.timeOfDay
        };
    }
    else if (request.bg > MAX_BLOOD_GLUCOSE) {
        return {
            bloodGlucose: request.bg,
            carbs: request.carbs,
            insulin: 0,
            message: "Error: Blood Glucose is greater than " + MAX_BLOOD_GLUCOSE + ",\n                and doctor hasn't specified what to do in this situation. \n Time to call a relative.",
            timeOfDay: request.timeOfDay
        };
    }
    var _a = calculateInsulinWithExplanation(request.bg, request.carbs, request.timeOfDay), insulin = _a[0], explanation = _a[1];
    return {
        bloodGlucose: request.bg,
        carbs: request.carbs,
        insulin: Number(insulin.toFixed(2)),
        message: explanation,
        timeOfDay: request.timeOfDay
    };
};
var handleRequest = function (event, context, callback) {
    try {
        var request = JSON.parse(event.body);
        var responseBody = main(request);
        var response = {
            body: JSON.stringify(responseBody),
            headers: {
                "Access-Control-Allow-Origin": "*"
            },
            statusCode: 200
        };
        context.done(undefined, response);
    }
    catch (err) {
        context.done(err, null);
    }
};
exports.handler = handleRequest;
exports.calculateWithExplanation = calculateInsulinWithExplanation;
