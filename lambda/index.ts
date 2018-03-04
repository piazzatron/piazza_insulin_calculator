/*
 *
 * Piazza Insulin Calculator
 * Copyright Michael Piazza 2018
 *
 */

/* ---------------- Types ---------------- */

import { Callback, Context, Handler} from "aws-lambda";

type BloodGlucose = number;
type InsulinAdjustment = number;
type InsulinUnit = number;
type Bucket = [number, number];
type Carb = number;

interface ICalculationContext {
    bg: BloodGlucose;
    carbs: Carb;
    timeOfDay: TimeOfDay;
}

interface ICalculationOutput {
    insulin: InsulinUnit;
}

interface IFormatMessageContext {
    adjustment: InsulinAdjustment;
    timeOfDay: TimeOfDay;
    insulinPerCarbRatio: number;
    bg: BloodGlucose;
    carbs: Carb;
    baseInsulin: number;
}

interface IRequest {
    bg: BloodGlucose;
    carbs: Carb;
    timeOfDay: TimeOfDay;
}

interface IResponse {
    insulin: InsulinUnit;
    carbs: Carb;
    timeOfDay: TimeOfDay;
    bloodGlucose: BloodGlucose;
    message: string;
}

interface IFormatMessageInput {
    adjustment: InsulinAdjustment;
    timeOfDay: TimeOfDay;
    insulinPerCarbRatio: number;
    bg: BloodGlucose;
    carbs: Carb;
    baseInsulin: InsulinUnit;
}

interface ILambdaResponse {
    body: string;
    statusCode: number;
    headers: {[index: string]: string};
}

/* ---------------- Constants ---------------- */

/* Enum for time of day */
enum TimeOfDay {
    "Morning" = "morning",
    "Afternoon" = "afternoon",
    "Evening" = "evening",
}

/* A mapping from time of day -> glucose ratio */
const INSULIN_PER_CARB_RATIOS: {[index: string]: number} = {};
INSULIN_PER_CARB_RATIOS[TimeOfDay.Morning] = (1 / 9);
INSULIN_PER_CARB_RATIOS[TimeOfDay.Afternoon] = (1 / 14);
INSULIN_PER_CARB_RATIOS[TimeOfDay.Evening] = (1 / 9);

const MIN_BLOOD_GLUCOSE = 40;
const MAX_BLOOD_GLUCOSE = 500;

/* Number of units of blood glucose which have the same correction factor applied. */
const ADJUSTMENT_INTERVAL = 20;

/* Floor of the 'happy interval' where no adjustments are applied. */
const MINIMUM_NO_ADJUSTMENT_GLUCOSE = 100;

/* Ceiling of the 'happy interval' where no adjustments are applied. */
const MAXIMUM_NO_ADJUSTMENT_GLUCOSE = 150;

/* How many units of insulin we add or subtract, per adjustment unit. */
const BASE_ADJUSTMENT_INSULIN_UNIT = 0.5;

/* ---------------- Insulin Calculation ---------------- */

/* Returns how many adjustment units we are below our happy interval. */
const getNumAdjustmentsFromMin = (bg: BloodGlucose): number => {
    const delta = MINIMUM_NO_ADJUSTMENT_GLUCOSE - bg;
    const numAdjustments = Math.ceil(delta / ADJUSTMENT_INTERVAL);
    return numAdjustments;
};

/* Returns how many adjustment units we are above our happy interval. */
const getNumAdjustmentsFromMax = (bg: BloodGlucose): number => {
    const delta = bg - MAXIMUM_NO_ADJUSTMENT_GLUCOSE;
    const numAdjustments = Math.ceil(delta / ADJUSTMENT_INTERVAL);
    return numAdjustments;
};

/* Calculates how many insulin units to adjust relative to the standard formula based on the blood glucose.  */
const calculateAdjustment = (bg: BloodGlucose): InsulinAdjustment => {
    if (bg >= MINIMUM_NO_ADJUSTMENT_GLUCOSE &&
        bg <= MAXIMUM_NO_ADJUSTMENT_GLUCOSE) {
            return 0;
    }

    let adjustment: InsulinAdjustment;

    if (bg < MINIMUM_NO_ADJUSTMENT_GLUCOSE) {
        const numAdjustments = getNumAdjustmentsFromMin(bg);
        adjustment = -1 * numAdjustments * BASE_ADJUSTMENT_INSULIN_UNIT;
    } else {
        const numAdjustments = getNumAdjustmentsFromMax(bg);
        adjustment = numAdjustments * BASE_ADJUSTMENT_INSULIN_UNIT;
    }

    return adjustment;
};

const calculateBucket = (bg: BloodGlucose): Bucket => {
    if (bg >= MINIMUM_NO_ADJUSTMENT_GLUCOSE &&
        bg <= MAXIMUM_NO_ADJUSTMENT_GLUCOSE) {
        return [MINIMUM_NO_ADJUSTMENT_GLUCOSE, MAXIMUM_NO_ADJUSTMENT_GLUCOSE];
    }

    let min;
    let max;

    if (bg < MINIMUM_NO_ADJUSTMENT_GLUCOSE) {
        const adjustments = getNumAdjustmentsFromMin(bg);
        min = MINIMUM_NO_ADJUSTMENT_GLUCOSE - (ADJUSTMENT_INTERVAL * adjustments);
        max = MINIMUM_NO_ADJUSTMENT_GLUCOSE - (ADJUSTMENT_INTERVAL * (adjustments - 1)) - 1;
    } else {
        const adjustments = getNumAdjustmentsFromMax(bg);
        min = MAXIMUM_NO_ADJUSTMENT_GLUCOSE + (ADJUSTMENT_INTERVAL * (adjustments - 1)) + 1;
        max = MAXIMUM_NO_ADJUSTMENT_GLUCOSE + (ADJUSTMENT_INTERVAL * adjustments);
    }

    return [min, max];
};

const calculateInsulinWithExplanation = (bg: BloodGlucose, carbs: Carb, timeOfDay: TimeOfDay): [InsulinUnit, string] => {
    const insulinPerCarbRatio = INSULIN_PER_CARB_RATIOS[timeOfDay];
    const baseInsulin = carbs * insulinPerCarbRatio;
    const adjustment = calculateAdjustment(bg);
    const adjustedInsulin = baseInsulin + adjustment;

    const messageInput: IFormatMessageInput = {
        adjustment,
        baseInsulin,
        bg,
        carbs,
        insulinPerCarbRatio,
        timeOfDay,
    };

    const message = formatMessage(messageInput);

    return [adjustedInsulin, message];
};

const formatMessage = (input: IFormatMessageInput): string => {
    const {adjustment, bg, timeOfDay, insulinPerCarbRatio, baseInsulin, carbs} = input;
    let adjustmentPartial;

    if (adjustment === 0) {
        adjustmentPartial = `no extra insulin added`;
    } else {
        adjustmentPartial = `${adjustment} units of insulin  ${(adjustment > 0 ? "added" : "subtracted")}`;
    }

    const bucket = calculateBucket(bg);

    const baseMsg = `<li> It's ${timeOfDay}, so you should take ${insulinPerCarbRatio.toFixed(2)} units of insulin for each carb. </li>
                <li> Since you ate ${carbs} carbs, your unadjusted insulin is ${baseInsulin.toFixed(3)} units.</li>`;
    const adjustmentMsg = `<li>Because your blood glucose of ${bg} is in the range of ${bucket[0]} to ${bucket[1]}, there was ${adjustmentPartial}.</li>`;

    return `${baseMsg}\n${adjustmentMsg}`;
};

/* TODO: Think of a better name for this fella */
const main = (request: IRequest): IResponse => {
    /*  TODO: Refactor this bit here */
    if (request.bg < MIN_BLOOD_GLUCOSE) {
        return {
            bloodGlucose: request.bg,
            carbs: request.carbs,
            insulin: 0,
            message: `Error: Blood Glucose is less than ${MIN_BLOOD_GLUCOSE},
                 and doctor hasn't specified what to do in this situation. \n Time to call a relative.`,
            timeOfDay: request.timeOfDay,
        };

    } else if (request.bg > MAX_BLOOD_GLUCOSE) {
        return {
            bloodGlucose: request.bg,
            carbs: request.carbs,
            insulin: 0,
            message: `Error: Blood Glucose is greater than ${MAX_BLOOD_GLUCOSE},
                and doctor hasn't specified what to do in this situation. \n Time to call a relative.`,
            timeOfDay: request.timeOfDay,
        };
    }

    const [ insulin, explanation ] = calculateInsulinWithExplanation(request.bg, request.carbs, request.timeOfDay);

    return {
        bloodGlucose: request.bg,
        carbs: request.carbs,
        insulin: Number(insulin.toFixed(2)),
        message: explanation,
        timeOfDay: request.timeOfDay,
    };
};

const handleRequest: Handler = (event: any, context: Context, callback: Callback): void => {
    try {
        const request: IRequest = JSON.parse(event.body);
        const responseBody = main(request);

        const response: ILambdaResponse = {
            body: JSON.stringify(responseBody),
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            statusCode: 200,
        };
        context.done(undefined, response);
    } catch (err) {
        context.done(err, null);
    }
};

export const handler = handleRequest;
