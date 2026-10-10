import { act, fireEvent, render, screen } from "@testing-library/react";
import CurrentWeather from "./CurrentWeather";

const originalFetch = global.fetch;
const originalGeolocation = Object.getOwnPropertyDescriptor(
  navigator,
  "geolocation"
);

const hourlyTimes = Array.from({ length: 40 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 9, 10, index));
  return date.toISOString().slice(0, 16);
});

const mockForecastResponse = {
  ok: true,
  json: async () => ({
    timezone: "Asia/Yangon",
    current: {
      time: "2026-10-10T12:00",
      temperature_2m: 30,
      relative_humidity_2m: 72,
      apparent_temperature: 32,
      is_day: 1,
      weather_code: 0,
      wind_speed_10m: 3,
      surface_pressure: 1012,
      visibility: 10000,
    },
    hourly: {
      time: hourlyTimes,
      temperature_2m: hourlyTimes.map((_, index) => 20 + index),
      precipitation_probability: hourlyTimes.map((_, index) => index),
      weather_code: hourlyTimes.map((_, index) => (index % 2 === 0 ? 0 : 61)),
      is_day: hourlyTimes.map(() => 1),
    },
    daily: {
      time: [
        "2026-10-10",
        "2026-10-11",
        "2026-10-12",
        "2026-10-13",
        "2026-10-14",
        "2026-10-15",
        "2026-10-16",
      ],
      weather_code: [0, 1, 2, 3, 61, 71, 95],
      temperature_2m_max: [30, 31, 29, 28, 27, 26, 25],
      temperature_2m_min: [20, 21, 19, 18, 17, 16, 15],
      precipitation_probability_max: [10, 20, 30, 40, 50, 60, 70],
      sunrise: ["2026-10-10T06:00"],
      sunset: ["2026-10-10T18:00"],
    },
  }),
};

const mockGeocodingResponse = {
  ok: true,
  json: async () => ({
    results: [
      {
        name: "Yangon",
        country_code: "MM",
        latitude: 16.8,
        longitude: 96.15,
      },
    ],
  }),
};

beforeEach(() => {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(mockGeocodingResponse)
    .mockResolvedValue(mockForecastResponse);
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalGeolocation) {
    Object.defineProperty(navigator, "geolocation", originalGeolocation);
  } else {
    delete navigator.geolocation;
  }
});

test("looks up a city and renders its current conditions", async () => {
  render(<CurrentWeather />);

  fireEvent.change(screen.getByRole("textbox", { name: "Search for a city" }), {
    target: { value: "Yangon" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
  });

  expect(global.fetch).toHaveBeenCalledTimes(2);
  const geocodingUrl = new URL(global.fetch.mock.calls[0][0]);
  expect(geocodingUrl.origin).toBe("https://geocoding-api.open-meteo.com");
  expect(geocodingUrl.searchParams.get("name")).toBe("Yangon");
  const forecastUrl = new URL(global.fetch.mock.calls[1][0]);
  expect(forecastUrl.origin).toBe("https://api.open-meteo.com");
  expect(forecastUrl.pathname).toBe("/v1/forecast");
  expect(forecastUrl.searchParams.get("latitude")).toBe("16.8");
  expect(forecastUrl.searchParams.get("longitude")).toBe("96.15");
  expect(forecastUrl.searchParams.get("current")).toContain("temperature_2m");
  expect(forecastUrl.searchParams.get("hourly")).toContain(
    "precipitation_probability"
  );
  expect(forecastUrl.searchParams.get("forecast_days")).toBe("7");
  expect(forecastUrl.searchParams.get("daily")).toContain(
    "temperature_2m_min"
  );
  expect(forecastUrl.searchParams.get("daily")).toContain(
    "precipitation_probability_max"
  );
  expect(
    screen.getByRole("region", { name: "Weather in Yangon" })
  ).toHaveTextContent("Clear sky");
  expect(screen.getByText("72%")).toBeInTheDocument();
  const hourlyTab = screen.getByRole("tab", { name: "Hourly" });
  const dailyTab = screen.getByRole("tab", { name: "7 days" });
  expect(hourlyTab).toHaveAttribute("aria-selected", "true");
  expect(dailyTab).toHaveAttribute("aria-selected", "false");
  let hourlyForecast = screen.getByRole("tabpanel", { name: "Hourly" });
  const hourlyScroll = screen.getByRole("group", {
    name: "Hourly weather forecast; scroll horizontally to explore",
  });
  expect(hourlyScroll).toHaveClass("forecast-scroll");
  expect(hourlyForecast.querySelectorAll(".hourly-item")).toHaveLength(24);
  expect(hourlyForecast).toHaveTextContent("Now");
  expect(hourlyForecast).toHaveTextContent("1:00 PM");
  expect(hourlyForecast).toHaveTextContent("32°");
  expect(hourlyForecast).toHaveTextContent("12%");
  expect(screen.queryByRole("tabpanel", { name: "7 days" })).not.toBeInTheDocument();

  fireEvent.click(dailyTab);
  expect(dailyTab).toHaveAttribute("aria-selected", "true");
  expect(hourlyTab).toHaveAttribute("aria-selected", "false");
  let dailyForecast = screen.getByRole("tabpanel", { name: "7 days" });
  expect(dailyForecast.querySelectorAll(".daily-item")).toHaveLength(7);
  expect(dailyForecast.querySelector(".daily-item")).toHaveTextContent("Today");
  expect(dailyForecast.querySelector(".daily-item")).toHaveTextContent("30°");
  expect(dailyForecast.querySelector(".daily-item")).toHaveTextContent("20°");
  expect(dailyForecast.querySelector(".daily-item")).toHaveTextContent("10% rain");
  expect(screen.queryByRole("tabpanel", { name: "Hourly" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "°F" }));
  expect(document.querySelector(".temperature")).toHaveTextContent("86°");
  fireEvent.click(hourlyTab);
  hourlyForecast = screen.getByRole("tabpanel", { name: "Hourly" });
  expect(hourlyForecast).toHaveTextContent("90°");
  fireEvent.click(dailyTab);
  dailyForecast = screen.getByRole("tabpanel", { name: "7 days" });
  expect(dailyForecast.querySelector(".daily-item")).toHaveTextContent("86°");
  expect(dailyForecast.querySelector(".daily-item")).toHaveTextContent("68°");
});

test("shows a useful message when city search returns no matches", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ results: [] }),
  });
  render(<CurrentWeather />);

  fireEvent.change(screen.getByRole("textbox", { name: "Search for a city" }), {
    target: { value: "Not a real place" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
  });

  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "We couldn't find that place"
  );
});

test("shows the weather route error instead of silently failing", async () => {
  global.fetch
    .mockReset()
    .mockResolvedValueOnce(mockGeocodingResponse)
    .mockResolvedValueOnce({ ok: false, status: 503 });
  render(<CurrentWeather />);

  fireEvent.change(screen.getByRole("textbox", { name: "Search for a city" }), {
    target: { value: "Yangon" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
  });

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Weather service returned HTTP 503"
  );
});

test("uses the device coordinates for a current-location search", async () => {
  global.fetch = jest.fn().mockResolvedValue(mockForecastResponse);
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (onSuccess) =>
        onSuccess({ coords: { latitude: 16.8, longitude: 96.15 } }),
    },
  });
  render(<CurrentWeather />);

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
  });

  const forecastUrl = new URL(global.fetch.mock.calls[0][0]);
  expect(forecastUrl.searchParams.get("latitude")).toBe("16.8");
  expect(forecastUrl.searchParams.get("longitude")).toBe("96.15");
  expect(screen.getByRole("heading", { name: /Your location/ })).toBeInTheDocument();
});
