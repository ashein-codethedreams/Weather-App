import { useCallback, useEffect, useState } from "react";
import "./CurrentWeather.css";
import InstallPrompt from "./InstallPrompt";
import { createWeatherCardImage, downloadWeatherCard } from "./weatherShare";

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

const formatForecastDay = (date) =>
  new Intl.DateTimeFormat("en", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

const airQualityInfo = (value) => {
  const aqi = Math.round(value);
  if (aqi <= 50) {
    return {
      value: aqi,
      level: "Good",
      tone: "good",
      guidance: "Air quality is good. Enjoy your usual outdoor activities.",
    };
  }
  if (aqi <= 100) {
    return {
      value: aqi,
      level: "Moderate",
      tone: "moderate",
      guidance:
        "Air is acceptable. Sensitive people may want to take it easier outdoors.",
    };
  }
  if (aqi <= 150) {
    return {
      value: aqi,
      level: "Unhealthy for sensitive groups",
      tone: "unhealthy-sensitive",
      guidance:
        "Sensitive groups should limit prolonged or heavy outdoor exertion.",
    };
  }
  if (aqi <= 200) {
    return {
      value: aqi,
      level: "Unhealthy",
      tone: "unhealthy",
      guidance:
        "Consider limiting time outdoors; sensitive groups should avoid exertion.",
    };
  }
  if (aqi <= 300) {
    return {
      value: aqi,
      level: "Very unhealthy",
      tone: "very-unhealthy",
      guidance: "Reduce outdoor activity and keep windows closed.",
    };
  }
  return {
    value: aqi,
    level: "Hazardous",
    tone: "hazardous",
    guidance: "Avoid outdoor activity and keep windows closed.",
  };
};

const uvIndexInfo = (value) => {
  if (value < 3) {
    return {
      level: "Low",
      tone: "good",
      guidance:
        "Protection is usually not needed. Wear sunglasses on bright days.",
    };
  }
  if (value < 6) {
    return {
      level: "Moderate",
      tone: "moderate",
      guidance: "Seek shade around midday and wear sunscreen.",
    };
  }
  if (value < 8) {
    return {
      level: "High",
      tone: "unhealthy-sensitive",
      guidance:
        "Reduce midday sun and use sunscreen, a hat, and sunglasses.",
    };
  }
  if (value < 11) {
    return {
      level: "Very high",
      tone: "very-unhealthy",
      guidance:
        "Avoid midday sun; use shade, protective clothing, and sunscreen.",
    };
  }
  return {
    level: "Extreme",
    tone: "hazardous",
    guidance:
      "Stay indoors or in deep shade around midday and protect all exposed skin.",
  };
};

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
      uvIndex: current.uv_index,
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
    daily: daily.time.map((date, index) => ({
      date,
      weatherCode: daily.weather_code[index],
      high: daily.temperature_2m_max[index],
      low: daily.temperature_2m_min[index],
      precipitationProbability: daily.precipitation_probability_max[index],
    })),
  };
};

const readJson = async (response, serviceName) => {
  if (!response.ok) {
    throw new Error(`${serviceName} returned HTTP ${response.status}.`);
  }
  return response.json();
};

const locationFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  const name = params.get("name")?.trim();

  if (
    params.has("lat") &&
    params.has("lon") &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    name
  ) {
    return {
      latitude,
      longitude,
      name,
      country_code: params.get("country") || undefined,
    };
  }

  const city = params.get("city")?.trim();
  return city ? { city } : null;
};

const CurrentWeather = () => {
  const [city, setCity] = useState("");
  const [result, setResult] = useState(null);
  const [recentCities, setRecentCities] = useState([]);
  const [unit, setUnit] = useState("C");
  const [forecastView, setForecastView] = useState("hourly");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [shareFeedback, setShareFeedback] = useState(null);

  const searchWeather = useCallback(
    async (searchParams, { updateUrl = true } = {}) => {
      setIsLoading(true);
      setMessage("");
      setResult(null);
      setShareFeedback(null);

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
            name: searchParams.name || "Your location",
            country_code: searchParams.country_code,
            latitude: searchParams.latitude,
            longitude: searchParams.longitude,
          };
        }

        const forecastParams = new URLSearchParams({
          latitude: String(location.latitude),
          longitude: String(location.longitude),
          current:
            "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,surface_pressure,visibility,uv_index",
          hourly:
            "temperature_2m,precipitation_probability,weather_code,is_day",
          daily:
            "sunrise,sunset,weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
          timezone: "auto",
          wind_speed_unit: "ms",
          forecast_days: "7",
        });
        const airQualityParams = new URLSearchParams({
          latitude: String(location.latitude),
          longitude: String(location.longitude),
          current: "us_aqi",
          timezone: "auto",
        });
        const [forecastResponse, airQualityResult] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?${forecastParams}`),
          fetch(
            `https://air-quality-api.open-meteo.com/v1/air-quality?${airQualityParams}`
          )
            .then((response) => readJson(response, "Air quality service"))
            .then((data) => ({ data }))
            .catch((error) => ({ error })),
        ]);
        const forecast = await readJson(forecastResponse, "Weather service");
        const weather = normalizeWeather(location, forecast);
        const aqi = airQualityResult.data?.current?.us_aqi;
        weather.airQuality =
          Number.isFinite(aqi) ? airQualityInfo(aqi) : null;
        weather.airQualityError = airQualityResult.error
          ? airQualityResult.error instanceof TypeError
            ? "Unable to connect to the air quality service."
            : `${airQualityResult.error.message}`
          : null;
        const uvIndex = weather.main.uvIndex;
        weather.uvIndex = Number.isFinite(uvIndex)
          ? { value: uvIndex, ...uvIndexInfo(uvIndex) }
          : null;
        setResult(weather);
        setCity(weather.name);
        setRecentCities((cities) =>
          [weather.name, ...cities.filter((name) => name !== weather.name)].slice(
            0,
            5
          )
        );
        if (updateUrl) {
          const params = new URLSearchParams({
            lat: String(location.latitude),
            lon: String(location.longitude),
            name: location.name,
          });
          if (location.country_code) {
            params.set("country", location.country_code);
          }
          const shareUrl = new URL(window.location.href);
          shareUrl.search = params.toString();
          if (shareUrl.href !== window.location.href) {
            window.history.pushState({ location: location.name }, "", shareUrl);
          }
        }
      } catch (error) {
        setMessage(
          error instanceof TypeError
            ? "Unable to connect to the weather service. Check your internet and try again."
            : `${error.message} Please try again in a moment.`
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const loadLocationFromUrl = () => {
      const location = locationFromUrl();
      if (location) {
        if (location.city) {
          setCity(location.city);
        } else {
          setCity(location.name);
        }
        searchWeather(location, { updateUrl: Boolean(location.city) });
      } else {
        setResult(null);
        setCity("");
        setMessage("");
      }
    };

    loadLocationFromUrl();
    window.addEventListener("popstate", loadLocationFromUrl);
    return () => window.removeEventListener("popstate", loadLocationFromUrl);
  }, [searchWeather]);

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

  const handleShare = async () => {
    const url = window.location.href;

    try {
      const image = await createWeatherCardImage(result);
      const shareData = {
        files: [image],
        title: `Weather in ${result.name}`,
        text: `Weather in ${result.name}: ${Math.round(result.main.temp)}°C. ${url}`,
      };

      if (navigator.share && navigator.canShare?.({ files: [image] })) {
        try {
          await navigator.share(shareData);
          setShareFeedback({ text: "Weather card shared.", isError: false });
          return;
        } catch (error) {
          if (error.name === "AbortError") return;
        }
      }

      downloadWeatherCard(image);
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(url);
          setShareFeedback({
            text: "Weather card downloaded and link copied.",
            isError: false,
          });
          return;
        } catch {
          setShareFeedback({
            text: "Weather card downloaded. Copy the forecast link from the address bar.",
            isError: true,
          });
          return;
        }
      }

      setShareFeedback({
        text: "Weather card downloaded. Copy the forecast link from the address bar.",
        isError: true,
      });
    } catch (error) {
      if (error.name === "AbortError") return;

      setShareFeedback({
        text: "Couldn't create or share the weather card. Copy the forecast link from the address bar.",
        isError: true,
      });
    }
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
        <div className="topbar-actions">
          <InstallPrompt />
          <div className="live-indicator">
            <span className="live-dot" />
            LIVE CONDITIONS
          </div>
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
                <div className="card-actions">
                  <button
                    className="share-button"
                    onClick={handleShare}
                    type="button"
                  >
                    <span aria-hidden="true">↗</span> Share
                  </button>
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
                  {shareFeedback && (
                    <span
                      className={`share-feedback${shareFeedback.isError ? " error" : ""}`}
                      role={shareFeedback.isError ? "alert" : "status"}
                    >
                      {shareFeedback.text}
                    </span>
                  )}
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
          <section aria-label="Weather forecast" className="forecast-section">
            <div className="forecast-header">
              <h2>Forecast</h2>
              <div className="forecast-tabs" role="tablist" aria-label="Forecast range">
                <button
                  aria-controls="hourly-forecast-panel"
                  aria-selected={forecastView === "hourly"}
                  className={forecastView === "hourly" ? "active" : ""}
                  id="hourly-forecast-tab"
                  onClick={() => setForecastView("hourly")}
                  role="tab"
                  type="button"
                >
                  Hourly
                </button>
                <button
                  aria-controls="daily-forecast-panel"
                  aria-selected={forecastView === "daily"}
                  className={forecastView === "daily" ? "active" : ""}
                  id="daily-forecast-tab"
                  onClick={() => setForecastView("daily")}
                  role="tab"
                  type="button"
                >
                  7 days
                </button>
              </div>
            </div>
            {forecastView === "hourly" ? (
              <div
                aria-labelledby="hourly-forecast-tab"
                className="forecast-panel"
                id="hourly-forecast-panel"
                role="tabpanel"
                tabIndex="0"
              >
                <div
                  aria-label="Hourly weather forecast; scroll horizontally to explore"
                  className="forecast-scroll"
                  role="group"
                  tabIndex="0"
                >
                  <div className="forecast-strip hourly-strip">
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
                          {hour.precipitationProbability}%
                        </span>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                aria-labelledby="daily-forecast-tab"
                className="forecast-panel"
                id="daily-forecast-panel"
                role="tabpanel"
                tabIndex="0"
              >
                <div
                  aria-label="Daily weather forecast; scroll horizontally to explore"
                  className="forecast-scroll"
                  role="group"
                  tabIndex="0"
                >
                  <div className="forecast-strip daily-strip">
                    {result.daily.map((day, index) => (
                      <article
                        aria-label={`${index === 0 ? "Today" : formatForecastDay(day.date)}, ${weatherDescription(day.weatherCode)}, high ${temperature(day.high)} degrees, low ${temperature(day.low)} degrees, ${day.precipitationProbability}% chance of rain`}
                        className="daily-item"
                        key={day.date}
                      >
                        <span className="daily-day">
                          {index === 0 ? "Today" : formatForecastDay(day.date)}
                        </span>
                        <span aria-hidden="true" className="daily-icon">
                          {weatherIcon(day.weatherCode, true)}
                        </span>
                        <span className="daily-rain">
                          {day.precipitationProbability}% rain
                        </span>
                        <span className="daily-temperatures">
                          <strong>{temperature(day.high)}°</strong>
                          <span>{temperature(day.low)}°</span>
                        </span>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
          <section
            aria-label="Air quality and UV index"
            className="environment-section"
          >
            <div className="environment-heading">
              <div>
                <p className="card-kicker">FOR YOUR TIME OUTSIDE</p>
                <h2>Air &amp; sun</h2>
              </div>
              <p>Simple guidance for the conditions right now.</p>
            </div>
            <div className="environment-grid">
              <article
                aria-label="Air quality"
                className={`environment-card ${
                  result.airQuality
                    ? `tone-${result.airQuality.tone}`
                    : "tone-unavailable"
                }`}
              >
                <div className="environment-card-top">
                  <div>
                    <span className="environment-label">AIR QUALITY</span>
                    <h3>US Air Quality Index</h3>
                  </div>
                  <span className="environment-symbol" aria-hidden="true">
                    ◉
                  </span>
                </div>
                {result.airQuality ? (
                  <>
                    <div className="environment-reading">
                      <strong>{result.airQuality.value}</strong>
                      <span>{result.airQuality.level}</span>
                    </div>
                    <p className="environment-guidance">
                      {result.airQuality.guidance}
                    </p>
                  </>
                ) : (
                  <p className="environment-guidance" role="status">
                    Air quality is unavailable
                    {result.airQualityError
                      ? ` — ${result.airQualityError}`
                      : " for this location right now."}
                  </p>
                )}
              </article>

              <article
                aria-label="UV index"
                className={`environment-card ${
                  result.uvIndex ? `tone-${result.uvIndex.tone}` : "tone-unavailable"
                }`}
              >
                <div className="environment-card-top">
                  <div>
                    <span className="environment-label">SUN EXPOSURE</span>
                    <h3>UV Index</h3>
                  </div>
                  <span className="environment-symbol" aria-hidden="true">
                    ☼
                  </span>
                </div>
                {result.uvIndex ? (
                  <>
                    <div className="environment-reading">
                      <strong>
                        {Number.isInteger(result.uvIndex.value)
                          ? result.uvIndex.value
                          : result.uvIndex.value.toFixed(1)}
                      </strong>
                      <span>{result.uvIndex.level}</span>
                    </div>
                    <p className="environment-guidance">
                      {result.uvIndex.guidance}
                    </p>
                  </>
                ) : (
                  <p className="environment-guidance" role="status">
                    UV index is unavailable for this location right now.
                  </p>
                )}
              </article>
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
