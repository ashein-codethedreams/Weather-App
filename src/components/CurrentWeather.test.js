import { act, fireEvent, render, screen } from "@testing-library/react";
import CurrentWeather from "./CurrentWeather";

const originalFetch = global.fetch;
const originalGeolocation = Object.getOwnPropertyDescriptor(
  navigator,
  "geolocation"
);
const originalShare = Object.getOwnPropertyDescriptor(navigator, "share");
const originalCanShare = Object.getOwnPropertyDescriptor(navigator, "canShare");
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const originalCanvasGetContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  "getContext"
);
const originalCanvasToBlob = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  "toBlob"
);
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const originalAnchorClick = HTMLAnchorElement.prototype.click;
let canvasText;

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
      uv_index: 7.4,
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

const mockAirQualityResponse = {
  ok: true,
  json: async () => ({
    current: {
      time: "2026-10-10T12:00",
      us_aqi: 42,
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
  canvasText = [];
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => ({
      arc: jest.fn(),
      beginPath: jest.fn(),
      fill: jest.fn(),
      fillRect: jest.fn(),
      fillText: (text) => canvasText.push(text),
      createLinearGradient: () => ({ addColorStop: jest.fn() }),
      measureText: () => ({ width: 100 }),
    }),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
    configurable: true,
    value: (callback) => callback(new Blob(["weather card"], { type: "image/png" })),
  });
  URL.createObjectURL = jest.fn(() => "blob:weather-card");
  URL.revokeObjectURL = jest.fn();
  HTMLAnchorElement.prototype.click = jest.fn();
  global.fetch = jest.fn((url) => {
    if (url.includes("geocoding-api")) {
      return Promise.resolve(mockGeocodingResponse);
    }
    if (url.includes("air-quality-api")) {
      return Promise.resolve(mockAirQualityResponse);
    }
    return Promise.resolve(mockForecastResponse);
  });
});

afterEach(() => {
  global.fetch = originalFetch;
  window.history.replaceState({}, "", "/");
  if (originalShare) {
    Object.defineProperty(navigator, "share", originalShare);
  } else {
    delete navigator.share;
  }
  if (originalCanShare) {
    Object.defineProperty(navigator, "canShare", originalCanShare);
  } else {
    delete navigator.canShare;
  }
  if (originalClipboard) {
    Object.defineProperty(navigator, "clipboard", originalClipboard);
  } else {
    delete navigator.clipboard;
  }
  if (originalCanvasGetContext) {
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      "getContext",
      originalCanvasGetContext
    );
  } else {
    delete HTMLCanvasElement.prototype.getContext;
  }
  if (originalCanvasToBlob) {
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      "toBlob",
      originalCanvasToBlob
    );
  } else {
    delete HTMLCanvasElement.prototype.toBlob;
  }
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  HTMLAnchorElement.prototype.click = originalAnchorClick;
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

  expect(global.fetch).toHaveBeenCalledTimes(3);
  const geocodingCall = global.fetch.mock.calls.find(([url]) =>
    url.includes("geocoding-api")
  );
  const forecastCall = global.fetch.mock.calls.find(([url]) =>
    url.includes("/v1/forecast")
  );
  const airQualityCall = global.fetch.mock.calls.find(([url]) =>
    url.includes("air-quality-api")
  );
  const geocodingUrl = new URL(geocodingCall[0]);
  expect(geocodingUrl.origin).toBe("https://geocoding-api.open-meteo.com");
  expect(geocodingUrl.searchParams.get("name")).toBe("Yangon");
  expect(new URLSearchParams(window.location.search).get("lat")).toBe("16.8");
  expect(new URLSearchParams(window.location.search).get("lon")).toBe("96.15");
  expect(new URLSearchParams(window.location.search).get("name")).toBe("Yangon");
  const forecastUrl = new URL(forecastCall[0]);
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
  expect(forecastUrl.searchParams.get("current")).toContain("uv_index");
  const airQualityUrl = new URL(airQualityCall[0]);
  expect(airQualityUrl.origin).toBe("https://air-quality-api.open-meteo.com");
  expect(airQualityUrl.pathname).toBe("/v1/air-quality");
  expect(airQualityUrl.searchParams.get("current")).toBe("us_aqi");
  expect(
    screen.getByRole("region", { name: "Weather in Yangon" })
  ).toHaveTextContent("Clear sky");
  expect(screen.getByText("72%")).toBeInTheDocument();
  expect(screen.getByRole("article", { name: "Air quality" })).toHaveTextContent(
    "42"
  );
  expect(screen.getByRole("article", { name: "Air quality" })).toHaveTextContent(
    "Good"
  );
  expect(
    screen.getByText("Air quality is good. Enjoy your usual outdoor activities.")
  ).toBeInTheDocument();
  expect(screen.getByRole("article", { name: "UV index" })).toHaveTextContent(
    "7.4"
  );
  expect(screen.getByRole("article", { name: "UV index" })).toHaveTextContent(
    "High"
  );
  expect(
    screen.getByText("Reduce midday sun and use sunscreen, a hat, and sunglasses.")
  ).toBeInTheDocument();
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

test("loads the selected coordinates from a shareable URL", async () => {
  window.history.replaceState(
    {},
    "",
    "/?lat=16.8&lon=96.15&name=Yangon&country=MM"
  );

  await act(async () => {
    render(<CurrentWeather />);
  });

  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(
    global.fetch.mock.calls.some(([url]) => url.includes("geocoding-api"))
  ).toBe(false);
  const forecastUrl = new URL(
    global.fetch.mock.calls.find(([url]) => url.includes("/v1/forecast"))[0]
  );
  expect(forecastUrl.searchParams.get("latitude")).toBe("16.8");
  expect(forecastUrl.searchParams.get("longitude")).toBe("96.15");
  expect(
    screen.getByRole("region", { name: "Weather in Yangon" })
  ).toBeInTheDocument();
});

test("shares the selected forecast using the device share sheet", async () => {
  window.history.replaceState(
    {},
    "",
    "/?lat=16.8&lon=96.15&name=Yangon&country=MM"
  );
  const share = jest.fn().mockResolvedValue();
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  Object.defineProperty(navigator, "canShare", {
    configurable: true,
    value: jest.fn(() => true),
  });

  await act(async () => {
    render(<CurrentWeather />);
  });
  fireEvent.click(screen.getByRole("button", { name: "°F" }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /share/i }));
  });

  const shareData = share.mock.calls[0][0];
  expect(shareData).toMatchObject({
    title: "Weather in Yangon",
    text: expect.stringContaining("Weather in Yangon: 30°C."),
  });
  expect(shareData.files).toHaveLength(1);
  expect(shareData.files[0]).toMatchObject({
    name: "skyward-yangon-weather.png",
    type: "image/png",
  });
  expect(canvasText).toContain("Yangon");
  expect(canvasText).toContain("30°C");
  expect(shareData.text).toContain(window.location.href);
  expect(share).toHaveBeenCalledWith(expect.objectContaining({
    title: "Weather in Yangon",
    files: shareData.files,
  }));
  expect(screen.getByRole("status")).toHaveTextContent("Weather card shared.");
});

test("copies the selected forecast link when device sharing is unavailable", async () => {
  window.history.replaceState(
    {},
    "",
    "/?lat=16.8&lon=96.15&name=Yangon&country=MM"
  );
  const writeText = jest.fn().mockResolvedValue();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });

  await act(async () => {
    render(<CurrentWeather />);
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /share/i }));
  });

  expect(writeText).toHaveBeenCalledWith(window.location.href);
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Weather card downloaded and link copied."
  );
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
  global.fetch.mockImplementation((url) => {
    if (url.includes("geocoding-api")) {
      return Promise.resolve(mockGeocodingResponse);
    }
    if (url.includes("/v1/forecast")) {
      return Promise.resolve({ ok: false, status: 503 });
    }
    return Promise.resolve(mockAirQualityResponse);
  });
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
  global.fetch = jest.fn((url) =>
    Promise.resolve(
      url.includes("air-quality-api")
        ? mockAirQualityResponse
        : mockForecastResponse
    )
  );
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

test("keeps weather available and explains when air quality cannot be loaded", async () => {
  global.fetch.mockImplementation((url) => {
    if (url.includes("geocoding-api")) {
      return Promise.resolve(mockGeocodingResponse);
    }
    if (url.includes("air-quality-api")) {
      return Promise.resolve({ ok: false, status: 503 });
    }
    return Promise.resolve(mockForecastResponse);
  });
  render(<CurrentWeather />);

  fireEvent.change(screen.getByRole("textbox", { name: "Search for a city" }), {
    target: { value: "Yangon" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
  });

  expect(screen.getByRole("region", { name: "Weather in Yangon" })).toBeInTheDocument();
  expect(screen.getByRole("article", { name: "Air quality" })).toHaveTextContent(
    "Air quality is unavailable"
  );
  expect(screen.getByRole("article", { name: "Air quality" })).toHaveTextContent(
    "Air quality service returned HTTP 503"
  );
  expect(screen.getByRole("article", { name: "UV index" })).toHaveTextContent(
    "High"
  );
});
