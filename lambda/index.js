// TODO: How do we tell people to delay taking insulin?
var TimeOfDay;
(function (TimeOfDay) {
    TimeOfDay["Morning"] = "morning";
    TimeOfDay["Afternoon"] = "afternoon";
    TimeOfDay["Evening"] = "evening";
})(TimeOfDay || (TimeOfDay = {}));
var TARGET_BLOOD_GLUCOSE = 150;
var GLUCOSE_BUCKETS = [
    {
        min: 170,
        max: 190,
        adjustment: 1,
        note: ""
    },
    {
        min: 150,
        max: 170,
        adjustment: 0.5,
        note: ""
    },
    {
        min: 100,
        max: 150,
        adjustment: 0,
        note: ""
    },
    {
        min: 80,
        max: 100,
        adjustment: -0.5,
        note: "Do not shoot insulin until 15 minutes after you start eating"
    },
    {
        min: 60,
        max: 80,
        adjustment: -1,
        note: "Do not shoot insulin until 15 minutes after you start eating"
    }
];
var RATIO_MAP = {};
RATIO_MAP[TimeOfDay.Morning] = (1 / 9);
RATIO_MAP[TimeOfDay.Afternoon] = (1 / 14);
RATIO_MAP[TimeOfDay.Evening] = (1 / 9);
var calculateInsulin = function (input) {
    // Positive delta = hyperglycemic, negate = hypo 
    var min = GLUCOSE_BUCKETS[GLUCOSE_BUCKETS.length - 1].min;
    var max = GLUCOSE_BUCKETS[0].max - 1;
    if (input.bloodGlucose < min) {
        return {
            note: "Error: Blood Glucose is less than " + min + ", and doctor hasn't specified what to do in this situation. \n                Time to call a relative.",
            insulin: "",
            message: ""
        };
    }
    else if (input.bloodGlucose > max) {
        return {
            note: "Error: Blood Glucose is greater than " + max + ", and doctor hasn't specified what to do in this situation. \n                Time to call a relative.",
            insulin: "",
            message: ""
        };
    }
    var bucket = GLUCOSE_BUCKETS.filter(function (bucket) { return (input.bloodGlucose >= bucket.min && input.bloodGlucose < bucket.max); })[0];
    var ratio = RATIO_MAP[input.timeOfDay];
    var baseInsulin = input.carbs * ratio;
    var adjustedInsulin = baseInsulin + bucket.adjustment;
    var msg = "";
    var adjustmentPartial = "";
    if (bucket.adjustment == 0) {
        adjustmentPartial = "no extra insulin added";
    }
    else {
        adjustmentPartial = bucket.adjustment + " units of insulin " + (bucket.adjustment > 0 ? "added" : "subtracted");
    }
    var baseMsg = "<li> It's " + input.timeOfDay + ", so you should take " + ratio.toFixed(3) + " units of insulin for each carb. </li> \n    <li> Since you ate " + input.carbs + " carbs, your unadjusted insulin is " + baseInsulin.toFixed(3) + " units.</li>";
    var adjustmentMsg = "<li>Because your blood glucose of " + input.bloodGlucose + " is in the range of " + bucket.min + " to " + (bucket.max - 1) + ", there was " + adjustmentPartial + ".</li>";
    msg = baseMsg + "\n" + adjustmentMsg;
    return {
        insulin: adjustedInsulin.toFixed(3),
        message: msg,
        note: bucket.note
    };
};
exports.handler = function (event, context) {
    try {
        var insulinResponse = calculateInsulin(JSON.parse(event.body));
        console.log(insulinResponse);
        var response = {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify(insulinResponse)
        };
        context.done(null, response);
    }
    catch (err) {
        context.done(err, null);
    }
};
