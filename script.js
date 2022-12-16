"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _set_description() {
    // prettier-ignore
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}
    `;
  }

  click() {
    this.click++;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calc_pace();
    this._set_description();
  }

  calc_pace() {
    // min per km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = "cycling";

  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calc_speed();
    this._set_description();
  }

  calc_speed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////////
//APLICATION

class App {
  #map;
  #map_zoom_lvl = 13;
  #map_event;
  #workouts = [];

  constructor() {
    // get users possition
    this._get_position();

    // get data from local_storage
    this._get_local_storage();

    // attach event handlers
    form.addEventListener("submit", this._new_workout.bind(this));
    inputType.addEventListener("change", this._toggle_elev_field);
    containerWorkouts.addEventListener("click", this._mov_to_popup.bind(this));
  }

  _get_position() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._load_map.bind(this),
        function () {
          alert(`Could not get your position`);
        }
      );
  }

  _load_map(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#map_zoom_lvl);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._show_form.bind(this));

    this.#workouts.forEach((elem) => {
      this._render_workout_marker(elem);
    });
  }

  _show_form(map_e) {
    this.#map_event = map_e;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hide_form() {
    inputCadence.value = inputDistance.value = inputDuration.value = "";
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggle_elev_field() {
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _new_workout(event) {
    const valid_inputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const all_possitive = (...inputs) => inputs.every((inp) => inp > 0);

    event.preventDefault();

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#map_event.latlng;
    let workout;

    // if activity running, create running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      // check if data is valid
      if (
        !valid_inputs(distance, duration, cadence) ||
        !all_possitive(distance, duration)
      )
        return alert("NOT valid input");

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if activity CYCLING, create CYCLING object
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (
        !valid_inputs(distance, duration, elevation) ||
        !all_possitive(distance, duration)
      )
        return alert(`Number must be a possitive`);
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this.#workouts.push(workout);

    //render worout on map
    this._render_workout_marker(workout);
    //render worout on list
    this._render_workout(workout);
    // cleear input fields
    this._hide_form();

    //local  storage to all workouts
    this._set_local_storage();
  }

  _render_workout_marker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }

  _render_workout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
      } </span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === "running")
      html += `
     <div class="workout__details">
       <span class="workout__icon">⚡️</span>
       <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
   </div>
   <div class="workout__details">
     <span class="workout__icon">🦶🏼</span>
     <span class="workout__value">${workout.cadence}</span>
     <span class="workout__unit">spm</span>
   </div>
 </li>`;

    if (workout.type === "cycling")
      html += `
      <div class="workout__details">
 <span class="workout__icon">⚡️</span>
 <span class="workout__value">${workout.speed.toFixed(1)}</span>
 <span class="workout__unit">km/h</span>
</div>
<div class="workout__details">
 <span class="workout__icon">⛰</span>
 <span class="workout__value">${workout.elevation}</span>
 <span class="workout__unit">m</span>
</div>
</li>`;

    form.insertAdjacentHTML("afterend", html);
  }

  _mov_to_popup(event) {
    const workout_el = event.target.closest(".workout");
    console.log(workout_el);

    if (!workout_el) return;

    const workout = this.#workouts.find(
      (work) => work.id === workout_el.dataset.id
    );
    console.log(workout);

    this.#map.setView(workout.coords, this.#map_zoom_lvl, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public
    // workout.click();
  }

  _set_local_storage() {
    localStorage.setItem(`workouts`, JSON.stringify(this.#workouts));
  }

  _get_local_storage() {
    const data = JSON.parse(localStorage.getItem(`workouts`));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach((elem) => {
      this._render_workout(elem);
    });
  }

  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();
