import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

clientsClaim();

// Workbox injects the production asset list at build time.
// eslint-disable-next-line no-restricted-globals
precacheAndRoute(self.__WB_MANIFEST);

const navigationHandler = createHandlerBoundToURL(
  `${process.env.PUBLIC_URL}/index.html`
);
registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
  })
);

const openMeteoApi = ({ url }) =>
  url.origin === 'https://api.open-meteo.com' &&
  url.pathname === '/v1/forecast';
const openMeteoAirQuality = ({ url }) =>
  url.origin === 'https://air-quality-api.open-meteo.com' &&
  url.pathname === '/v1/air-quality';

const weatherCache = new NetworkFirst({
  cacheName: 'skyward-weather-data',
  networkTimeoutSeconds: 3,
  plugins: [
    new ExpirationPlugin({
      maxEntries: 24,
      maxAgeSeconds: 60 * 60,
      purgeOnQuotaError: true,
    }),
  ],
});

registerRoute(openMeteoApi, weatherCache);
registerRoute(openMeteoAirQuality, weatherCache);
