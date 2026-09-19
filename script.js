/* QuickCare: hospital appointment scheduler (plain JavaScript + DOM only)
   Less waiting time because it: shows each doctor's next free time,
   has a "Find soonest slot" button, and blocks booked and past times. */

// ---------- Values ----------
const doctors = [
  { name: "Dr. Anita Sharma", type: "General physician" },
  { name: "Dr. Rohan Mehta", type: "Pediatrics" },
  { name: "Dr. Priya Rao", type: "Dermatology" },
  { name: "Dr. Imran Khan", type: "Orthopedics" }
];
const times = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00",
               "12:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

let appointments = [];
let selectedDoctor = null;      // position in the doctors list (0, 1, 2, 3)
let selectedDate = getDate(0);  // like "2026-09-19"
let selectedTime = null;        // like "10:30"

// ---------- Page elements ----------
const clockEl = document.getElementById("clock");
const doctorList = document.getElementById("doctor-list");
const dateInput = document.getElementById("date-input");
const slotGrid = document.getElementById("slot-grid");
const nameInput = document.getElementById("name-input");
const phoneInput = document.getElementById("phone-input");
const summaryEl = document.getElementById("summary");
const messageEl = document.getElementById("message");
const queueNote = document.getElementById("queue-note");
const appointmentList = document.getElementById("appointment-list");

// ---------- Helpers ----------
// Create an element, put it inside a parent, and return it
function addEl(parent, tag, className, text) {
  const element = document.createElement(tag);
  element.className = className || "";
  element.textContent = text || "";
  parent.appendChild(element);
  return element;
}

// Date as text. 0 = today, 1 = tomorrow ...
function getDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString("en-CA"); // gives 2026-09-19
}

// A slot is free if nobody booked it and the time has not passed
function isFree(doctor, date, time) {
  for (const a of appointments) {
    if (a.doctor === doctor && a.date === date && a.time === time) {
      return false;
    }
  }
  const nowTime = new Date().toTimeString().slice(0, 5); // like "14:07"
  return !(date === getDate(0) && time <= nowTime);
}

// First free slot of one doctor (looks at today and the next 7 days)
function findNextFree(doctor) {
  for (let day = 0; day <= 7; day++) {
    for (const time of times) {
      if (isFree(doctor, getDate(day), time)) {
        return { date: getDate(day), time: time };
      }
    }
  }
  return null; // fully booked
}

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = "message " + type; // success, error or info
}

// ---------- Drawing the page ----------
function showDoctors() {
  doctorList.replaceChildren();
  for (let i = 0; i < doctors.length; i++) {
    const slot = findNextFree(i);

    const button = addEl(doctorList, "button", "doctor");
    button.setAttribute("aria-pressed", selectedDoctor === i);

    const info = addEl(button, "div", "doctor-info");
    addEl(info, "strong", "", doctors[i].name);
    addEl(info, "span", "", doctors[i].type);

    const wait = addEl(button, "div", "doctor-wait");
    if (slot) {
      addEl(wait, "span", "", "Next free");
      addEl(wait, "strong", "", slot.date + ", " + slot.time);
    } else {
      addEl(wait, "strong", "", "Fully booked");
    }

    button.addEventListener("click", function () {
      selectedDoctor = i;
      selectedTime = null;
      showAll();
    });
  }
}

function showSlots() {
  slotGrid.replaceChildren();
  if (selectedDoctor === null) {
    addEl(slotGrid, "p", "hint", "Choose a doctor to see open times.");
    return;
  }
  for (const time of times) {
    const button = addEl(slotGrid, "button", "slot", time);
    button.disabled = !isFree(selectedDoctor, selectedDate, time);
    if (time === selectedTime) {
      button.classList.add("selected");
    }
    button.addEventListener("click", function () {
      selectedTime = time;
      showAll();
    });
  }
}

function showSummary() {
  if (selectedDoctor === null || selectedTime === null) {
    summaryEl.textContent = "Select a doctor and a time to continue.";
  } else {
    summaryEl.textContent = "You are booking " + doctors[selectedDoctor].name +
      ", " + selectedDate + " at " + selectedTime + ".";
  }
}

function showAppointments() {
  appointmentList.replaceChildren();
  queueNote.textContent = "Total booked: " + appointments.length;
  if (appointments.length === 0) {
    addEl(appointmentList, "li", "empty", "No appointments yet. Book the first one on the left.");
  }
  for (let i = 0; i < appointments.length; i++) {
    const a = appointments[i];
    const item = addEl(appointmentList, "li", "appt");

    const when = addEl(item, "div", "appt-when");
    addEl(when, "strong", "", a.time);
    addEl(when, "span", "", a.date);

    const who = addEl(item, "div", "appt-who");
    addEl(who, "strong", "", a.patient);
    addEl(who, "span", "", doctors[a.doctor].name + ", " + doctors[a.doctor].type);

    const actions = addEl(item, "div", "appt-actions");
    const cancel = addEl(actions, "button", "link-btn", "Cancel");
    cancel.addEventListener("click", function () {
      appointments.splice(i, 1); // remove this appointment
      showAll();
      showMessage("Appointment cancelled. The slot is open again.", "info");
    });
  }
}

function showAll() {
  clockEl.textContent = new Date().toLocaleString();
  showDoctors();
  showSlots();
  showSummary();
  showAppointments();
}

// ---------- Button actions ----------
function bookAppointment() {
  const patient = nameInput.value.trim();
  const phone = phoneInput.value.trim();

  let error = "";
  if (selectedDoctor === null || selectedTime === null) {
    error = "Choose a doctor and a time slot.";
  } else if (!isFree(selectedDoctor, selectedDate, selectedTime)) {
    error = "That slot is no longer open. Pick another time.";
  } else if (patient.length < 2) {
    error = "Enter the patient's full name.";
  } else if (phone.length !== 10 || isNaN(phone)) {
    error = "Enter a 10-digit phone number.";
  }
  if (error !== "") {
    showMessage(error, "error");
    return;
  }

  appointments.push({ doctor: selectedDoctor, patient: patient, phone: phone, date: selectedDate, time: selectedTime });
  appointments.sort(function (a, b) {
    return (a.date + a.time).localeCompare(b.date + b.time); // earliest first
  });

  const text = "Appointment confirmed with " + doctors[selectedDoctor].name +
    ", " + selectedDate + " at " + selectedTime + ".";
  selectedTime = null;
  nameInput.value = "";
  phoneInput.value = "";
  showAll();
  showMessage(text, "success");
}

// Pick the earliest free slot (of the chosen doctor, or of all doctors)
function pickSoonest() {
  let best = null;
  for (let i = 0; i < doctors.length; i++) {
    const slot = findNextFree(i);
    const allowed = selectedDoctor === null || selectedDoctor === i;
    if (slot && allowed && (best === null || slot.date + slot.time < best.date + best.time)) {
      best = { doctor: i, date: slot.date, time: slot.time };
    }
  }
  if (best === null) {
    showMessage("No open slots in the next 7 days.", "error");
    return;
  }
  selectedDoctor = best.doctor;
  selectedDate = best.date;
  selectedTime = best.time;
  dateInput.value = selectedDate;
  showAll();
  showMessage("Soonest slot selected. Add the patient details to confirm.", "info");
}

function changeDate() {
  selectedDate = dateInput.value;
  if (selectedDate < getDate(0)) {   // also covers an empty date
    selectedDate = getDate(0);
  }
  dateInput.value = selectedDate;
  selectedTime = null;
  showAll();
}

// ---------- Start ----------
dateInput.min = getDate(0);
dateInput.max = getDate(7);
dateInput.value = selectedDate;
dateInput.addEventListener("change", changeDate);
document.getElementById("soonest-btn").addEventListener("click", pickSoonest);
document.getElementById("book-btn").addEventListener("click", bookAppointment);

showAll();
setInterval(showAll, 60000); // refresh every minute