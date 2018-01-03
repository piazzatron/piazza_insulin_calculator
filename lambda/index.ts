// TODO: How do we tell people to delay taking insulin?

enum TimeOfDay {
    Morning = "morning",
    Afternoon = "afternoon",
    Evening = "evening"
}

interface IInput {
    bloodGlucose: number;
    timeOfDay: TimeOfDay;
    carbs: number;
}

interface IOutput {
    insulin: string;
    message: string;
    note: string;
}

interface IGlucoseBucket {
    min: number;
    max: number;
    adjustment: number;
    note: string;
}

const TARGET_BLOOD_GLUCOSE = 150;
const GLUCOSE_BUCKETS: IGlucoseBucket[] = [
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

const RATIO_MAP: {[timeOfDay: number]: string} = {}
RATIO_MAP[TimeOfDay.Morning] = (1/9);
RATIO_MAP[TimeOfDay.Afternoon] = (1/14);
RATIO_MAP[TimeOfDay.Evening] = (1/9);

const calculateInsulin = (input: IInput): IOutput => {
    // Positive delta = hyperglycemic, negate = hypo 
    const min = GLUCOSE_BUCKETS[GLUCOSE_BUCKETS.length - 1].min;
    const max = GLUCOSE_BUCKETS[0].max - 1;

    if (input.bloodGlucose < min) {
        return {
            note: `Error: Blood Glucose is less than ${min}, and doctor hasn't specified what to do in this situation. 
                Time to call a relative.`,
            insulin: "",
            message: ""

        }
    } else if (input.bloodGlucose > max) {
        return {
            note: `Error: Blood Glucose is greater than ${max}, and doctor hasn't specified what to do in this situation. 
                Time to call a relative.`,
            insulin: "",
            message: ""
        }
    }

    const bucket = GLUCOSE_BUCKETS.filter((bucket) => (input.bloodGlucose >= bucket.min && input.bloodGlucose < bucket.max))[0]
    const ratio = RATIO_MAP[input.timeOfDay];
    const baseInsulin = input.carbs * ratio;
    const adjustedInsulin = baseInsulin + bucket.adjustment;

    let msg = "";
    let adjustmentPartial = "";

    if (bucket.adjustment == 0) {
        adjustmentPartial = "no extra insulin added";
    } else {
        adjustmentPartial = `${bucket.adjustment} units of insulin ${bucket.adjustment > 0 ? "added" : "subtracted"}`
    }
    const baseMsg = `<li> It's ${input.timeOfDay}, so you should take ${ratio.toFixed(3)} units of insulin for each carb. </li> 
    <li> Since you ate ${input.carbs} carbs, your unadjusted insulin is ${baseInsulin.toFixed(3)} units.</li>`;
    const adjustmentMsg = `<li>Because your blood glucose of ${input.bloodGlucose} is in the range of ${bucket.min} to ${bucket.max - 1}, there was ${adjustmentPartial}.</li>`;
    msg = `${baseMsg}\n${adjustmentMsg}`;

    return {
        insulin: adjustedInsulin.toFixed(3),
        message: msg,
        note: bucket.note
    }
}

exports.handler = (event, context) => {
    try {
        const insulinResponse = calculateInsulin(JSON.parse(event.body));
        console.log(insulinResponse)

        const response = {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify(insulinResponse)
        };

        context.done(null, response);
    } catch (err) {
        context.done(err, null);
    }
};
