// TODO: How do we tell people to delay taking insulin?

/* Constants */

/* Enum for time of day */
let TimeOfDay = {
    "Morning": "morning",
    "Afternoon": "afternoon,
    "Evening": "evening"
};

/* A mapping from time of day -> glucose ratio */
let INSULIN_PER_CARB_RATIOS = {};
INSULIN_PER_CARB_RATIOS[TimeOfDay.Morning] = (1 / 9);
INSULIN_PER_CARB_RATIOS[TimeOfDay.Afternoon] = (1 / 14);
INSULIN_PER_CARB_RATIOS[TimeOfDay.Evening] = (1 / 9);

let TARGET_BLOOD_GLUCOSE = 150;

let GLUCOSE_BUCKETS = [
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

const MIN_BLOOD_GLUCOSE = 40;
const MAX_BLOOD_GLUCOSE = 500;
const ADJUSTMENT_INTERVAL = 20;
const MINIMUM_NO_ADJUSTMENT_GLUCOSE = 100;
const MAXIMUM_NO_ADJUSTMENT_GLUCOSE = 150;
const BASE_ADJUSTMENT_INSULIN_UNIT = 0.5;

/* TODO: Could probably refactor these into the same function. */
const getAdjustmentsFromMax = (bloodGlucose) => {
    const delta = MINIMUM_NO_ADJUSTMENT_GLUCOSE - bloodGlucose;
    const numAdjustments = Math.ceil(delta / ADJUSTMENT_INTERVAL)
    return numAdjustments
}

const getAdjustmentsFromMin = (bloodGlucose) => {
    const delta = bloodGlucose - MAXIMUM_NO_ADJUSTMENT_GLUCOSE;
    const numAdjustments = Math.ceil(delta / numAdjustments);
    return numAdjustments;
}

/* Calculates how many units to adjust relative to the standard formula based on the blood glucose.  */
const calculateAdjustment = (bloodGlucose) => {
    if (bloodGlucose >= MINIMUM_NO_ADJUSTMENT_GLUCOSE &&
        bloodGlucose <= MAXIMUM_NO_ADJUSTMENT_GLUCOSE) {
            return 0;
    }

    if (bloodGlucose < MINIMUM_NO_ADJUSTMENT_GLUCOSE) {
        const numAdjustments = getAdjustmentsFromMin(bloodGlucose);
        const adjustment = -1 * numAdjustments * BASE_ADJUSTMENT_INSULIN_UNIT;
    } else {
        const numAdjustments = getAdjustmentsFromMax(bloodGlucose);
        const adjustment = numAdjustments * BASE_ADJUSTMENT_INSULIN_UNIT;
    }

    return adjustment
    }
} 

/* Tells you which bucket you're in.
    Outputs: [min, max]
*/
const calculateBucket = (bloodGlucose) => {
    if (bloodGlucose >= MINIMUM_NO_ADJUSTMENT_GLUCOSE &&
        bloodGlucose <= MAXIMUM_NO_ADJUSTMENT_GLUCOSE) {
        return [MINIMUM_NO_ADJUSTMENT_GLUCOSE, MAXIMUM_NO_ADJUSTMENT_GLUCOSE]
    }

    if (bloodGlucose < MINIMUM_NO_ADJUSTMENT_GLUCOSE) {
        const adjustments = getAdjustmentsFromMin(bloodGlucose);
        const min = MINIMUM_NO_ADJUSTMENT_GLUCOSE - (ADJUSTMENT_INTERVAL * adjustments);
        const max = MINIMUM_NO_ADJUSTMENT_GLUCOSE - (ADJUSTMENT_INTERVAL * (adjustments - 1)) - 1;
    } else {
        const adjustments = getAdjustmentsFromMax(bloodGlucose);
        const min = MAXIMUM_NO_ADJUSTMENT_GLUCOSE + (ADJUSTMENT_INTERVAL * (adjustments - 1)) + 1;
        const max = MAXIMUM_NO_ADJUSTMENT_GLUCOSE + (ADJUSTMENT_INTERVAL * adjustments);
    }

    return [min, max]
}

const calculateInsulin = (input) => {
    // Positive delta = hyperoglycemic, negate = hypo 

    if (input.bloodGlucose < MIN_BLOOD_GLUCOSE) {
        return {
            note: "Error: Blood Glucose is less than " + MIN_BLOOD_GLUCOSE + ", and doctor hasn't specified what to do in this situation. \n                Time to call a relative.",
            insulin: "",
            message: ""
        };
    } else if (input.bloodGlucose > MAX_BLOOD_GLUCOSE) {
        return {
            note: "Error: Blood Glucose is greater than " + MAX_BLOOD_GLUCOSE + ", and doctor hasn't specified what to do in this situation. \n                Time to call a relative.",
            insulin: "",
            message: ""
        };
    }

    const insulinPerCarbRatio = INSULIN_PER_CARB_RATIOS[input.timeOfDay];
    const baseInsulin = input.carbs * insulinPerCarbRatio;

    const adjustment = calculateAdjustment(input.carbs)
    const adjustedInsulin = baseInsulin + adjustment;

    // TODO: Refactor this all into a separate function that generates nice output.
    let msg = "";
    let adjustmentPartial = "";

    if (adjustment == 0) {
        adjustmentPartial = "no extra insulin added";
    } else {
        adjustmentPartial = adjustment + " units of insulin " + (adjustment > 0 ? "added" : "subtracted");
    }
    
    const bucket = calculateBucket(input.bloodGlucose);

    let baseMsg = "<li> It's " + input.timeOfDay + ", so you should take " + insulinPerCarbRatio.toFixed(2) + " units of insulin for each carb. </li> \n    <li> Since you ate " + input.carbs + " carbs, your unadjusted insulin is " + baseInsulin.toFixed(3) + " units.</li>";
    let adjustmentMsg = "<li>Because your blood glucose of " + input.bloodGlucose + " is in the range of " + bucket[0] + " to " + bucket[1] + ", there was " + adjustmentPartial + ".</li>";
    
    msg = baseMsg + "\n" + adjustmentMsg;
    
    return {
        insulin: adjustedInsulin.toFixed(2),
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
