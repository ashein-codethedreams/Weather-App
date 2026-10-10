import { Button, Input } from "antd";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_CITY = "New York";
const API_KEY =
  process.env.REACT_APP_OPENWEATHER_API_KEY ||
  "c9c49f5e59fdde9943de3de8534c1c35";
const POPULAR_CITIES = ["Tokyo", "London", "Paris", "Dubai", "Sydney"];

const convertTemperature = (value, unit) => {
  if (unit === "imperial") {
    return (value * 9) / 5 + 32;
  }

  return value;
};

const getTemperature = (value, unit) => {
  if (unit === "imperial") {
    return `${Math.round(convertTemperature(value, unit))}°F`;
  }

  return `${Math.round(convertTemperature(value, unit))}°C`;
};

const formatTime = (timestamp, timezoneOffset) => {
  const localTime = new Date((timestamp + timezoneOffset) * 1000);

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(localTime);
};

const formatForecastDay = (value) => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(new Date(value * 1000));
};

const CurrentWeather = () => {
  const [query, setQuery] = useState(DEFAULT_CITY);
  const [unit, setUnit] = useState("metric");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentCities, setRecentCities] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("weather-recent") || "[]");
    } catch {
      return [];
    }
  });

  const setRecentCity = useCallback((cityName) => {
    const trimmedName = cityName.trim();
    if (!trimmedName) {
      return;
    }

    setRecentCities((currentCities) => {
      const nextCities = [
        trimmedName,
        ...currentCities.filter(
          (entry) => entry.toLowerCase() !== trimmedName.toLowerCase()
        ),
      ];

      return nextCities.slice(0, 5);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("weather-recent", JSON.stringify(recentCities));
  }, [recentCities]);

  const fetchWeatherByCity = useCallback(async (cityName, selectedUnit) => {
    const trimmedCity = cityName.trim();
    if (!trimmedCity) {
      setError("Please enter a city name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        trimmedCity
      )}&appid=${API_KEY}&units=${selectedUnit}`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
        trimmedCity
      )}&appid=${API_KEY}&units=${selectedUnit}`;

      const [weatherResponse, forecastResponse] = await Promise.all([
        fetch(currentWeatherUrl),
        fetch(forecastUrl),
      ]);

      if (!weatherResponse.ok) {
        throw new Error("We couldn’t find that city. Please try another location.");
      }

      const weatherData = await weatherResponse.json();
      const forecastData = forecastResponse.ok ? await forecastResponse.json() : null;
      const nextDays = forecastData
        ? forecastData.list
            .filter((entry) => entry.dt_txt.includes("12:00:00"))
            .slice(0, 3)
            .map((entry) => ({
              day: formatForecastDay(entry.dt),
              temp: getTemperature(entry.main.temp, selectedUnit),
              icon: entry.weather[0].icon,
              description: entry.weather[0].description,
            }))
        : [];

      setWeather({
        ...weatherData,
        forecast: nextDays,
      });
      setRecentCity(trimmedCity);
      setQuery(trimmedCity);
    } catch (err) {
      setWeather(null);
      setError(err.message || "Something went wrong while fetching weather.");
    } finally {
      setLoading(false);
    }
  }, [setRecentCity]);

  const fetchWeatherByCoordinates = async (latitude, longitude) => {
    const locationUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${unit}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${unit}`;

    setLoading(true);
    setError("");

    try {
      const [weatherResponse, forecastResponse] = await Promise.all([
        fetch(locationUrl),
        fetch(forecastUrl),
      ]);

      if (!weatherResponse.ok) {
        throw new Error("Your location weather is currently unavailable.");
      }

      const currentWeather = await weatherResponse.json();
      const forecastData = forecastResponse.ok ? await forecastResponse.json() : null;
      const nextDays = forecastData
        ? forecastData.list
            .filter((entry) => entry.dt_txt.includes("12:00:00"))
            .slice(0, 3)
            .map((entry) => ({
              day: formatForecastDay(entry.dt),
              temp: getTemperature(entry.main.temp, unit),
              icon: entry.weather[0].icon,
              description: entry.weather[0].description,
            }))
        : [];

      setWeather({
        ...currentWeather,
        forecast: nextDays,
      });
      setQuery(currentWeather.name);
      setRecentCity(currentWeather.name);
    } catch (err) {
      setWeather(null);
      setError(err.message || "Unable to use your location right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherByCity(DEFAULT_CITY, "metric");
  }, [fetchWeatherByCity]);

  const handleSubmit = (event) => {
    event.preventDefault();
    fetchWeatherByCity(query, unit);
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError("Location access isn’t supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => fetchWeatherByCoordinates(coords.latitude, coords.longitude),
      () => {
        setError("Location access was denied. Search by city instead.");
      }
    );
  };

  const handleUnitChange = (nextUnit) => {
    setUnit(nextUnit);

    if (weather?.name) {
      fetchWeatherByCity(weather.name, nextUnit);
    }
  };

  const currentCondition = weather?.weather?.[0];
  const sunrise = weather ? formatTime(weather.sys.sunrise, weather.timezone) : "--";
  const sunset = weather ? formatTime(weather.sys.sunset, weather.timezone) : "--";

  return (
    <div className="weather-app">
      <div className="hero-panel">
        <div className="hero-content">
          <div className="app-header">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="brand-mark">☀️</div>
              <div>
                <div className="brand-text">Forecast</div>
                <h1 className="app-title">Weather Pulse</h1>
              </div>
            </div>

            <div className="unit-toggle" aria-label="Temperature unit selector">
              <button
                type="button"
                className={unit === "metric" ? "active" : ""}
                onClick={() => handleUnitChange("metric")}
              >
                °C
              </button>
              <button
                type="button"
                className={unit === "imperial" ? "active" : ""}
                onClick={() => handleUnitChange("imperial")}
              >
                °F
              </button>
            </div>
          </div>

          {loading ? (
            <div className="status-banner">Checking the skies for {query}...</div>
          ) : null}

          {!loading && error ? <div className="status-banner error">{error}</div> : null}

          {weather ? (
            <>
              <div className="hero-main">
                <img
                  className="weather-icon"
                  src={`https://openweathermap.org/img/wn/${currentCondition?.icon}@2x.png`}
                  alt={currentCondition?.description || "Weather icon"}
                />

                <div>
                  <div className="temp-wrap">
                    <p className="current-temp">
                      {Math.round(convertTemperature(weather.main.temp, unit))}
                    </p>
                    <span style={{ color: "rgba(224,242,254,0.9)", fontSize: "1.25rem" }}>
                      {unit === "metric" ? "°C" : "°F"}
                    </span>
                  </div>

                  <p className="weather-condition">{currentCondition?.description}</p>
                  <div className="location-line">
                    <span className="location-pin">📍</span>
                    <span>
                      {weather.name}, {weather.sys.country}
                    </span>
                  </div>
                </div>
              </div>

              <div className="meta-grid">
                <div className="metric-box">
                  <span className="metric-label">Feels like</span>
                  <span className="metric-value">
                    {getTemperature(weather.main.feels_like, unit)}
                  </span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Humidity</span>
                  <span className="metric-value">{weather.main.humidity}%</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Wind</span>
                  <span className="metric-value">
                    {Math.round(weather.wind.speed)} {unit === "metric" ? "m/s" : "mph"}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="search-panel">
          <form className="search-form" onSubmit={handleSubmit}>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search city"
              onPressEnter={handleSubmit}
            />
            <Button type="primary" htmlType="submit" loading={loading}>
              Search
            </Button>
          </form>

          <div className="quick-actions">
            {POPULAR_CITIES.map((city) => (
              <button
                key={city}
                type="button"
                className={`chip ${query === city ? "active" : ""}`}
                onClick={() => fetchWeatherByCity(city, unit)}
              >
                {city}
              </button>
            ))}
            <button type="button" className="chip" onClick={handleUseLocation}>
              Use my location
            </button>
          </div>

          <div className="status-banner">
            <strong>Today:</strong> {weather ? `${weather.weather[0].description} •` : "Loading..."} {weather ? `${weather.name} is ${currentCondition?.description}.` : "Please wait"}
          </div>

          {recentCities.length > 0 ? (
            <div className="quick-actions">
              {recentCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  className="chip"
                  onClick={() => fetchWeatherByCity(city, unit)}
                >
                  {city}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {weather ? (
        <div className="content-panel">
          <div className="forecast-panel">
            <div className="section-heading">
              <h3>3-day forecast</h3>
              <span>Sunrise {sunrise} • Sunset {sunset}</span>
            </div>

            <div className="forecast-grid">
              {weather.forecast?.length ? (
                weather.forecast.map((day) => (
                  <div key={day.day} className="forecast-card">
                    <div className="forecast-day">{day.day}</div>
                    <strong>{day.temp}</strong>
                    <img
                      src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                      alt={day.description}
                    />
                    <p>{day.description}</p>
                  </div>
                ))
              ) : (
                <div className="status-banner">Forecast details are unavailable right now.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CurrentWeather;
