// ------------------------------------
// GLOBAL ARRAYS FOR TREND DATA
// ------------------------------------
let esrLabels = [];
let esrData = [];

let cLabels = [];
let cData = [];

// ⭐ NEW — store latest real values
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

    if (value < 150) {
        led.style.background = "green";
        txt.innerText = "HEALTHY – Capacitor OK";
    }
    else if (value < 190) {
        led.style.background = "yellow";
        txt.innerText = "WARNING – Aging";
    }
    else if (value < 210) {
        led.style.background = "orange";
        txt.innerText = "CRITICAL – Replace Soon";
    }
    else {
        led.style.background = "red";
        txt.innerText = "FAILURE – Replace NOW";
    }
}

// --------------------------------------------------------
// EMAIL SENDER FUNCTION
// --------------------------------------------------------
function sendEmailAlert(esrCurrent, cCurrent, rul, healthIndex) {
    emailjs.send("service_igfjovu", "template_gih89it", {
        esrCurrent: esrCurrent,
        cCurrent: cCurrent,
        rul: rul,
        healthIndex: healthIndex
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

        latestESR = value;   // ⭐ NEW — store real ESR value

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
        if (value >= 190 && value < 210) {
            sendEmailAlert(latestESR, latestC, latestRUL, latestHI);
        }
        if (value >= 210) {
            sendEmailAlert(latestESR, latestC, latestRUL, latestHI);
        }
    }

    // --------- CAPACITANCE ----------
    if (topic === "dpack/c") {

        latestC = value;    // ⭐ NEW — store real C value

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
        latestHI = value;   // ⭐ NEW
        document.getElementById("hiValue").innerText = value.toFixed(2);
    }

    // --------- RUL ----------
    if (topic === "dpack/rul") {
        latestRUL = value;   // ⭐ NEW

        let days = (value / 24).toFixed(1);
        document.getElementById("rulValue").innerText = `${value} hrs (${days} days)`;
    }
});