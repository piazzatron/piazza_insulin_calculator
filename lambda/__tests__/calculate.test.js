const InsulinCalc = require("../build/index");

const testData = [
    [{bg: 100, carbs: 10, timeOfDay: "morning"}, 1.11],
    [{bg: 100, carbs: 10, timeOfDay: "afternoon"}, 0.71],
    [{bg: 100, carbs: 10, timeOfDay: "evening"}, 1.11],
    [{bg: 81, carbs: 10, timeOfDay: "morning"}, 0.61],
    [{bg: 81, carbs: 10, timeOfDay: "afternoon"}, 0.21],
    [{bg: 81, carbs: 10, timeOfDay: "evening"}, 0.61],
    [{bg: 151, carbs: 10, timeOfDay: "morning"}, 1.61],
    [{bg: 151, carbs: 10, timeOfDay: "afternoon"}, 1.21],
    [{bg: 151, carbs: 10, timeOfDay: "evening"}, 1.61],
];

test("Insulin Calculation", () => {
    testData.forEach(data => {
        expect(InsulinCalc.calculateWithExplanation(data[0].bg, data[0].carbs, data[0].timeOfDay)[0]).toBe(data[1]);
    }) 
});

