import { useState } from "react";
import "./CurrentWeather.css";

const QUICK_CITIES = ["Yangon", "Bangkok", "Singapore", "Tokyo"];

const weatherDescription = (code) => {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Current conditions";
};

const weatherIcon = (code, isDay) => {
  if ([95, 96, 99].includes(code)) return "⛈";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "🌧";
  }
  if ([45, 48].includes(code)) return "🌫";
  if (code === 0) return isDay ? "☀" : "☾";
  return isDay ? "⛅" : "☁";
};

const formatClock = (dateTime) => {
  const [, time = "00:00"] = dateTime.split("T");
  const [hour, minute] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, 0, 1, hour, minute)));
};

const formatLocalTime = (date, timeZone) =>
  new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);

const normalizeWeather = (location, forecast) => {
  const current = forecast.current;
  const daily = forecast.daily;
  const hourly = forecast.hourly;
  const weatherCode = current.weather_code;
  const forecastStart = hourly.time.findIndex((time) => time >= current.time);
  const firstForecastHour = Math.max(0, forecastStart);

  return {
    name: location.name,
    timezone: forecast.timezone,
    sys: {
      country: location.country_code,
      sunrise: daily.sunrise?.[0],
      sunset: daily.sunset?.[0],
    },
    main: {
      temp: current.temperature_2m,
      feels_like: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      pressure: current.surface_pressure,
    },
    wind: { speed: current.wind_speed_10m },
    visibility: current.visibility,
    weather: [
      {
        description: weatherDescription(weatherCode),
        icon: weatherIcon(weatherCode, current.is_day === 1),
      },
    ],
    hourly: hourly.time
      .slice(firstForecastHour, firstForecastHour + 24)
      .map((time, index) => ({
        time,
        temperature: hourly.temperature_2m[firstForecastHour + index],
        weatherCode: hourly.weather_code[firstForecastHour + index],
        precipitationProbability:
          hourly.precipitation_probability[firstForecastHour + index],
        isDay: hourly.is_day[firstForecastHour + index] === 1,
      })),
  };
};

const readJson = async (response, serviceName) => {
  if (!response.ok) {
    throw new Error(`${serviceName} returned HTTP ${response.status}.`);
  }
  return response.json();
};

const CurrentWeather = () => {
  const [city, setCity] = useState("");
  const [result, setResult] = useState(null);
  const [recentCities, setRecentCities] = useState([]);
  const [unit, setUnit] = useState("C");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const searchWeather = async (searchParams) => {
    setIsLoading(true);
    setMessage("");
    setResult(null);

    try {
      let location;
      if (searchParams.city) {
        const geocodingParams = new URLSearchParams({
          name: searchParams.city,
          count: "1",
          language: "en",
          format: "json",
        });
        const geocodingResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?${geocodingParams}`
        );
        const places = await readJson(geocodingResponse, "Place search");
        location = places.results?.[0];
        if (!location) {
          setMessage("We couldn't find that place. Check the spelling and try again.");
          return;
        }
      } else {
        location = {
          name: "Your location",
          latitude: searchParams.latitude,
          longitude: searchParams.longitude,
        };
      }

      const forecastParams = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current:
          "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,surface_pressure,visibility",
        hourly:
          "temperature_2m,precipitation_probability,weather_code,is_day",
        daily: "sunrise,sunset",
        timezone: "auto",
        wind_speed_unit: "ms",
        forecast_days: "3",
      });
      const forecastResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?${forecastParams}`
      );
      const forecast = await readJson(forecastResponse, "Weather service");
      const weather = normalizeWeather(location, forecast);
      setResult(weather);
      setCity(weather.name);
      setRecentCities((cities) =>
        [weather.name, ...cities.filter((name) => name !== weather.name)].slice(
          0,
          5
        )
      );
    } catch (error) {
      setMessage(
        error instanceof TypeError
          ? "Unable to connect to the weather service. Check your internet and try again."
          : `${error.message} Please try again in a moment.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const trimmedCity = city.trim();
    if (!trimmedCity || isLoading) return;
    searchWeather({ city: trimmedCity });
  };

  const handleLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Location isn't supported by this browser.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        searchWeather({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      () => {
        setIsLoading(false);
        setMessage("Location access is unavailable. Try searching for a city.");
      },
      { timeout: 10000 }
    );
  };

  const temperature = (value) =>
    Math.round(unit === "C" ? value : (value * 9) / 5 + 32);
  const windSpeed = (value) =>
    unit === "C" ? `${Math.round(value)} m/s` : `${Math.round(value * 2.237)} mph`;

  return (
    <main className="weather-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Skyward home">
          <span className="brand-mark" aria-hidden="true">
            ✳
          </span>
          <span>skyward</span>
        </a>
        <div className="live-indicator">
          <span className="live-dot" />
          LIVE CONDITIONS
        </div>
      </header>

      <section className="dashboard">
        <div className="intro">
          <p className="eyebrow">YOUR PERSONAL WEATHER DESK</p>
          <h1>Look outside, from anywhere.</h1>
          <p className="intro-copy">
            The forecast for wherever you are — or wherever you&apos;re going.
          </p>
        </div>

        <form className="search-form" onSubmit={handleSearch} role="search">
          <span className="search-icon" aria-hidden="true">
            ⌕
          </span>
          <label className="sr-only" htmlFor="city-search">
            Search for a city
          </label>
          <input
            id="city-search"
            autoComplete="off"
            placeholder="Search a city..."
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
          <button
            className="search-button"
            type="submit"
            disabled={isLoading || !city.trim()}
          >
            {isLoading ? "Finding..." : "Search"}
          </button>
        </form>

        <div className="quick-row">
          <span className="quick-label">Try</span>
          {QUICK_CITIES.map((name) => (
            <button
              className="city-chip"
              key={name}
              onClick={() => {
                setCity(name);
                searchWeather({ city: name });
              }}
              type="button"
            >
              {name}
            </button>
          ))}
          <button
            className="location-button"
            onClick={handleLocation}
            type="button"
          >
            <span aria-hidden="true">◎</span> Use my location
          </button>
        </div>

        {message && (
          <p className="feedback-message" role="alert">
            {message}
          </p>
        )}

        {result ? (
          <>
          <section aria-label={`Weather in ${result.name}`} className="weather-layout">
            <article className="current-card">
              <div className="card-heading">
                <div>
                  <p className="card-kicker">CURRENT WEATHER</p>
                  <h2>
                    {result.name}
                    {result.sys?.country && (
                      <span className="country-code">, {result.sys.country}</span>
                    )}
                  </h2>
                  <p className="local-time">
                    <span aria-hidden="true">◷</span>{" "}
                    {formatLocalTime(new Date(), result.timezone)} local time
                  </p>
                </div>
                <div className="unit-switch" aria-label="Temperature unit">
                  <button
                    aria-pressed={unit === "C"}
                    onClick={() => setUnit("C")}
                    type="button"
                  >
                    °C
                  </button>
                  <button
                    aria-pressed={unit === "F"}
                    onClick={() => setUnit("F")}
                    type="button"
                  >
                    °F
                  </button>
                </div>
              </div>

              <div className="temperature-row">
                <div className="temperature">
                  {temperature(result.main.temp)}
                  <span>°</span>
                </div>
                {result.weather?.[0] && (
                  <div className="condition">
                    <span className="condition-icon" aria-hidden="true">
                      {result.weather[0].icon}
                    </span>
                    <span>{result.weather[0].description}</span>
                  </div>
                )}
              </div>
              <p className="feels-like">
                Feels like {temperature(result.main.feels_like ?? result.main.temp)}°
              </p>

              <div className="sun-times">
                <div>
                  <span className="sun-symbol sunrise" aria-hidden="true">
                    ↗
                  </span>
                  <span className="sun-label">SUNRISE</span>
                  <strong>
                    {result.sys?.sunrise
                      ? formatClock(result.sys.sunrise)
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span className="sun-symbol sunset" aria-hidden="true">
                    ↘
                  </span>
                  <span className="sun-label">SUNSET</span>
                  <strong>
                    {result.sys?.sunset
                      ? formatClock(result.sys.sunset)
                      : "—"}
                  </strong>
                </div>
              </div>
            </article>

            <div className="details-column">
              <section className="details-card">
                <div className="section-heading">
                  <div>
                    <p className="card-kicker">THE DETAILS</p>
                    <h2>Right now</h2>
                  </div>
                  <span className="detail-sparkle" aria-hidden="true">
                    ✳
                  </span>
                </div>
                <div className="metrics-grid">
                  <div className="metric">
                    <span className="metric-icon humidity" aria-hidden="true">
                      ◌
                    </span>
                    <span className="metric-label">Humidity</span>
                    <strong>{result.main.humidity}%</strong>
                  </div>
                  <div className="metric">
                    <span className="metric-icon wind" aria-hidden="true">
                      ≋
                    </span>
                    <span className="metric-label">Wind</span>
                    <strong>{windSpeed(result.wind.speed)}</strong>
                  </div>
                  <div className="metric">
                    <span className="metric-icon pressure" aria-hidden="true">
                      ◉
                    </span>
                    <span className="metric-label">Pressure</span>
                    <strong>{result.main.pressure} hPa</strong>
                  </div>
                  <div className="metric">
                    <span className="metric-icon visibility" aria-hidden="true">
                      ◎
                    </span>
                    <span className="metric-label">Visibility</span>
                    <strong>
                      {unit === "C"
                        ? `${(result.visibility / 1000).toFixed(1)} km`
                        : `${(result.visibility / 1609.34).toFixed(1)} mi`}
                    </strong>
                  </div>
                </div>
              </section>

              {recentCities.length > 0 && (
                <section className="recent-card" aria-label="Recent searches">
                  <p className="card-kicker">PICK UP WHERE YOU LEFT OFF</p>
                  <div className="recent-list">
                    {recentCities.map((name) => (
                      <button
                        aria-label={`Show weather for ${name}`}
                        className="recent-city"
                        key={name}
                        onClick={() => {
                          setCity(name);
                          searchWeather({ city: name });
                        }}
                        type="button"
                      >
                        <span>{name}</span>
                        <span aria-hidden="true">↗</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </section>
          <section
            aria-label="24-hour forecast"
            className="hourly-section"
          >
            <div className="hourly-heading">
              <div>
                <p className="card-kicker">PLAN THE DAY</p>
                <h2>Next 24 hours</h2>
              </div>
              <span>Scroll to explore</span>
            </div>
            <div
              aria-label="Hourly weather forecast; scroll horizontally to explore"
              className="hourly-scroll"
              role="group"
              tabIndex="0"
            >
              <div className="hourly-list">
                {result.hourly.map((hour, index) => (
                  <article
                    aria-label={`${index === 0 ? "Now" : formatClock(hour.time)}, ${temperature(hour.temperature)} degrees, ${weatherDescription(hour.weatherCode)}, ${hour.precipitationProbability}% chance of rain`}
                    className="hourly-item"
                    key={hour.time}
                  >
                    <span className="hourly-time">
                      {index === 0 ? "Now" : formatClock(hour.time)}
                    </span>
                    <span aria-hidden="true" className="hourly-icon">
                      {weatherIcon(hour.weatherCode, hour.isDay)}
                    </span>
                    <strong className="hourly-temperature">
                      {temperature(hour.temperature)}°
                    </strong>
                    <span className="hourly-rain">
                      <span aria-hidden="true">↗</span>{" "}
                      {hour.precipitationProbability}%
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </section>
          </>
        ) : (
          !isLoading && (
            <section className="welcome-card">
              <div className="welcome-orbit" aria-hidden="true">
                <span className="orbit-sun">☼</span>
                <span className="orbit-star star-one">✳</span>
                <span className="orbit-star star-two">✦</span>
              </div>
              <div>
                <p className="card-kicker">A LITTLE MORE CLARITY</p>
                <h2>Your day, in the forecast.</h2>
                <p>
                  Search a city to see the temperature, wind, humidity, and
                  daylight — all in one place.
                </p>
              </div>
            </section>
          )
        )}

        <footer className="page-footer">
          <span>Thoughtful forecasts for everyday plans.</span>
          <span>Weather data by Open-Meteo</span>
        </footer>
      </section>
    </main>
  );
};

export default CurrentWeather;
