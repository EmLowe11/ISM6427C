const DEFAULT = { name: "Boca Raton", lat: 26.3683, lon: -80.1289 };

// WMO weather codes -> [description, day icon, night icon]
const CODES = {
  0: ["Clear", "☀️", "🌙"],
  1: ["Mostly Clear", "🌤️", "🌙"],
  2: ["Partly Cloudy", "⛅", "☁️"],
  3: ["Cloudy", "☁️", "☁️"],
  45: ["Fog", "🌫️", "🌫️"], 48: ["Fog", "🌫️", "🌫️"],
  51: ["Drizzle", "🌦️", "🌧️"], 53: ["Drizzle", "🌦️", "🌧️"], 55: ["Drizzle", "🌦️", "🌧️"],
  61: ["Rain", "🌧️", "🌧️"], 63: ["Rain", "🌧️", "🌧️"], 65: ["Heavy Rain", "🌧️", "🌧️"],
  71: ["Snow", "🌨️", "🌨️"], 73: ["Snow", "🌨️", "🌨️"], 75: ["Heavy Snow", "❄️", "❄️"],
  80: ["Showers", "🌦️", "🌧️"], 81: ["Showers", "🌦️", "🌧️"], 82: ["Heavy Showers", "🌧️", "🌧️"],
  95: ["Thunderstorm", "⛈️", "⛈️"], 96: ["Thunderstorm", "⛈️", "⛈️"], 99: ["Thunderstorm", "⛈️", "⛈️"],
};

const info = (code, isDay = 1) => {
  const c = CODES[code] || ["—", "🌡️", "🌡️"];
  return { text: c[0], icon: isDay ? c[1] : c[2] };
};

const $ = (id) => document.getElementById(id);

async function loadWeather({ name, lat, lon }) {
  const url = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${lat}&longitude=${lon}`
    + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day"
    + "&hourly=temperature_2m,weather_code,is_day"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max"
    + "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=7";

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    render(name, await res.json());
  } catch {
    $("condition").textContent = "Unable to load weather";
  }
}

function render(name, data) {
  const { current: cur, hourly, daily } = data;
  const now = info(cur.weather_code, cur.is_day);

  $("city").textContent = name;
  $("temp").textContent = `${Math.round(cur.temperature_2m)}°`;
  $("condition").textContent = now.text;
  $("hilo").textContent = `H:${Math.round(daily.temperature_2m_max[0])}°  L:${Math.round(daily.temperature_2m_min[0])}°`;
  $("feels").textContent = `${Math.round(cur.apparent_temperature)}°`;
  $("humidity").textContent = `${cur.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(cur.wind_speed_10m)} mph`;
  $("uv").textContent = Math.round(daily.uv_index_max[0]);

  // Background mood
  const code = cur.weather_code;
  document.body.className =
    !cur.is_day ? "night" : code >= 51 ? "rainy" : code >= 3 ? "cloudy" : "";

  // Next 24 hours starting from the current hour
  const start = hourly.time.findIndex((t) => t >= cur.time.slice(0, 13));
  $("hourly").innerHTML = hourly.time.slice(start, start + 24).map((t, i) => {
    const j = start + i;
    const h = new Date(t).getHours();
    const label = i === 0 ? "Now" : `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`;
    return `<div class="hour"><span>${label}</span>
      <span class="icon">${info(hourly.weather_code[j], hourly.is_day[j]).icon}</span>
      <span>${Math.round(hourly.temperature_2m[j])}°</span></div>`;
  }).join("");

  $("daily").innerHTML = daily.time.map((t, i) => {
    const day = i === 0 ? "Today" : new Date(t + "T00:00").toLocaleDateString("en-US", { weekday: "short" });
    return `<li><span>${day}</span>
      <span class="icon">${info(daily.weather_code[i]).icon}</span>
      <span class="range"><span class="lo">${Math.round(daily.temperature_2m_min[i])}°</span>${Math.round(daily.temperature_2m_max[i])}°</span></li>`;
  }).join("");
}

$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("query").value.trim();
  if (!q) return;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`);
    const place = (await res.json()).results?.[0];
    if (!place) return alert("City not found");
    $("query").value = "";
    loadWeather({ name: place.name, lat: place.latitude, lon: place.longitude });
  } catch {
    alert("Search failed");
  }
});

loadWeather(DEFAULT);
