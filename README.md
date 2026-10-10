# Skyward weather app

Search current weather by city or your device location. The dashboard includes
temperature conversion, a compact forecast panel with hourly and 7-day tabs,
daily highs and lows, precipitation chances, humidity, wind, pressure,
visibility, sunrise and sunset, air-quality and UV readings with plain-language
outdoor guidance, quick city picks, and recent searches for the current session.
Weather, air quality, and place search are provided by Open-Meteo and do not
require an API key.
Use the **Share** button on a forecast to open your device's share sheet or copy
a link to that location.

Skyward can be installed from supported browsers and caches its app shell and
recent weather lookups for quicker repeat visits and offline access. On iPhone
or iPad, use Share → Add to Home Screen in Safari.

When a new version is deployed, an **Update app** button appears in the app.
Tap it to install the update and reload; you do not need to uninstall the app.

## Run locally

1. Install dependencies and start the app:

   ```sh
   npm install
   npm start
   ```

## Tests and production build

```sh
npm test -- --watchAll=false
npm run build
```
