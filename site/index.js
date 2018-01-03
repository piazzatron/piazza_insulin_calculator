const ENDPOINT = "https://hg3o9k6q92.execute-api.us-east-1.amazonaws.com/prod";

$(document).ready(function(){
    document.getElementById("submit-button").addEventListener("click", function () {
        const payload = {
            bloodGlucose: document.getElementById("blood_glucose").value,
            carbs: document.getElementById("carbs").value,
            timeOfDay: document.getElementById("time_of_day").value
        };

        fetch(ENDPOINT, {
            method: "POST",
            body: JSON.stringify(payload)
        }).then(function (res) {
           return res.json();
        }).then(function (data) {
            console.log(`Got the data: ${JSON.stringify(data)}`);
            
            $("#note").html(data.note);
            $("#explanation").html(`<ul> ${data.message} </ul>`);
            $("#insulin").html(`<h1> Insulin: ${data.insulin} units.</h1>`);
        });
    });
});