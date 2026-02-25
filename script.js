// ------------------------------------
// GLOBAL ARRAYS FOR TREND DATA
// ------------------------------------
let esrLabels = [];
let esrData = [];

let cLabels = [];
let cData = [];

// ⭐ NEW — Temperature storage
let latestTemperature = null;

// ⭐ store latest real values
let latestESR = null;
let latestC = null;
let latestHI = null;
let latestRUL = null;

// ------------------------------------
// MQTT CONNECTION
// ------------------------------------
const client = mqtt.connect("wss://test.mosquitto.org:8081/mqtt");

client.on("connect", () => {
    console.log("MQTT Connected");
    client.subscribe("dpack/esr");
    client.subscribe("dpack/c");
    client.subscribe("dpack/hi");
    client.subscribe("dpack/rul");
    client.subscribe("dpack/Temperature");   // ⭐ NEW
});

// ------------------------------------
// ESR CHART INITIALIZATION
// ------------------------------------
const esrCtx = document.getElementById("esrChart").getContext("2d");

const esrChart = new Chart(esrCtx, {
    type: "line",
    data: {
        labels: esrLabels,
        datasets: [{
            label: "ESR (mΩ)",
            data: esrData,
            borderColor: "#00eaff",
            backgroundColor: "#00eaff33",
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: "#00eaff"
        }]
    },
    options: { responsive: true }
});

// ------------------------------------
// CAPACITANCE CHART INITIALIZATION
// ------------------------------------
const cCtx = document.getElementById("cChart").getContext("2d");

const cChart = new Chart(cCtx, {
    type: "line",
    data: {
        labels: cLabels,
        datasets: [{
            label: "Capacitance (µF)",
            data: cData,
            borderColor: "#ffae00",
            backgroundColor: "#ffae0033",
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: "#ffae00"
        }]
    },
    options: { responsive: true }
});

// ------------------------------------
// LED STATE UPDATE (based on ESR)
// ------------------------------------
function updateLED(value) {
    let led = document.getElementById("led");
    let txt = document.getElementById("capState");
    let color = "grey";

    if (value < 140) {
        color = "#00ff88";
        txt.innerText = "HEALTHY – Capacitor OK";
    }
    else if (value < 190) {
        color = "#fbff00";
        txt.innerText = "WARNING – Aging";
    }
    //else if (value < 210) {
    //    color = "#ff9100";
    //    txt.innerText = "CRITICAL – Replace Soon";
    //}
    else {
        color = "#ff3c3c";
        txt.innerText = "FAILURE – Replace Soon";
    }
  
    led.style.background = color;
    led.style.boxShadow = `0 0 15px ${color}`;
}

// --------------------------------------------------------
// EMAIL SENDER FUNCTION
// --------------------------------------------------------
function sendEmailAlert(esrCurrent, cCurrent, rul, healthIndex, temperatureValue) {
    emailjs.send("service_igfjovu", "template_gih89it", {
        esrCurrent: esrCurrent,
        cCurrent: cCurrent,
        rul: rul,
        healthIndex: healthIndex,
        temperatureValue: temperatureValue    // ⭐ NEW
    })
    .then(() => console.log("Email sent"))
    .catch(err => console.log("Email error:", err));
}

// ------------------------------------
// MQTT MESSAGE HANDLING
// ------------------------------------
client.on("message", (topic, msg) => {

    const value = parseFloat(msg.toString());
    const timestamp = new Date().toLocaleTimeString();

    // --------- ESR ----------
    if (topic === "dpack/esr") {

        latestESR = value;

        document.getElementById("esrValue").innerText = value + " mΩ";
        updateLED(value);

        esrLabels.push(timestamp);
        esrData.push(value);

        if (esrData.length > 20) {
            esrData.shift();
            esrLabels.shift();
        }
        esrChart.update();

        // ----- EMAIL TRIGGER -----
        if (value >= 190) {
            sendEmailAlert(latestESR, latestC, latestRUL, latestHI, latestTemperature);
        }
    }

    // --------- CAPACITANCE ----------
    if (topic === "dpack/c") {

        latestC = value;

        document.getElementById("cValue").innerText = value + " µF";

        cLabels.push(timestamp);
        cData.push(value);

        if (cData.length > 20) {
            cData.shift();
            cLabels.shift();
        }
        cChart.update();
    }

    // --------- HEALTH INDEX ----------
    if (topic === "dpack/hi") {
        latestHI = value;
        document.getElementById("hiValue").innerText = value.toFixed(2);
    }

    // --------- RUL ----------
    if (topic === "dpack/rul") {
        latestRUL = value;

        let days = (value / 24).toFixed(1);
        document.getElementById("rulValue").innerText = `${value} hrs (${days} days)`;
    }

    // --------- TEMPERATURE (NEW) ----------
    if (topic === "dpack/Temperature") {

        latestTemperature = value;

        // Update temperature box in dashboard
        document.getElementById("tempValue").innerText = value.toFixed(2) + " °C";

        console.log("Temperature Updated:", latestTemperature);
    }
});
