# Skyward weather app

Search current weather by city or your device location. The dashboard includes
temperature conversion, a compact forecast panel with hourly and 7-day tabs,
daily highs and lows, precipitation chances, humidity, wind, pressure,
visibility, sunrise and sunset, air-quality and UV readings with plain-language
outdoor guidance, quick city picks, and recent searches for the current session.
Weather, air quality, and place search are provided by Open-Meteo and do not
require an API key.

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
