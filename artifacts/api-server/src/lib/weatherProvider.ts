import { logger } from "./logger";

// Open-Meteo: free public forecast API, no API key required.
// https://open-meteo.com/

export interface WeatherSnapshot {
  tempF: number;
  windMph: number;
  precipPct: number;
  conditions: string; // "Clear" | "Light Rain" | "Rain" | "Wind" | "Warm" | "Cool"
  source: "open-meteo";
}

interface CacheEntry {
  ts: number;
  data: WeatherSnapshot | null;
}

const cache = new Map<string, CacheEntry>();
const TTL = 30 * 60 * 1000; // 30 minutes

function key(lat: number, lon: number, isoTime: string): string {
  // bucket by hour and 0.01° to maximize cache hits
  const hour = isoTime.slice(0, 13); // YYYY-MM-DDTHH
  return `${lat.toFixed(2)}:${lon.toFixed(2)}:${hour}`;
}

function classify(tempF: number, windMph: number, precipPct: number): string {
  if (precipPct >= 50) return "Rain";
  if (precipPct >= 25) return "Light Rain";
  if (windMph >= 15) return "Wind";
  if (tempF >= 85) return "Warm";
  if (tempF <= 55) return "Cool";
  return "Clear";
}

export async function getWeatherForGame(
  lat: number,
  lon: number,
  gameStartIso: string | undefined,
): Promise<WeatherSnapshot | null> {
  if (!gameStartIso) return null;
  const k = key(lat, lon, gameStartIso);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.ts < TTL) return hit.data;

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("hourly", "temperature_2m,wind_speed_10m,precipitation_probability");
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("wind_speed_unit", "mph");
    url.searchParams.set("forecast_days", "2");
    url.searchParams.set("past_days", "1");
    // Force UTC so the times[] array we receive can be safely parsed with
    // `+ "Z"` and matched against the ISO game start (also UTC). Open-Meteo's
    // current default is GMT, but pinning it explicitly removes any chance
    // of an upstream default change silently shifting weather lookups by
    // many hours (architect-flagged hardening).
    url.searchParams.set("timezone", "UTC");

    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as any;

    const times: string[] = j?.hourly?.time ?? [];
    const temps: number[] = j?.hourly?.temperature_2m ?? [];
    const winds: number[] = j?.hourly?.wind_speed_10m ?? [];
    const precips: number[] = j?.hourly?.precipitation_probability ?? [];

    if (!times.length) {
      cache.set(k, { ts: Date.now(), data: null });
      return null;
    }

    // Find the hour closest to game start
    const target = Date.parse(gameStartIso);
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(Date.parse(times[i]! + "Z") - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }

    const tempF = Math.round(temps[bestIdx] ?? 70);
    const windMph = Math.round(winds[bestIdx] ?? 0);
    const precipPct = Math.round(precips[bestIdx] ?? 0);
    const data: WeatherSnapshot = {
      tempF,
      windMph,
      precipPct,
      conditions: classify(tempF, windMph, precipPct),
      source: "open-meteo",
    };
    cache.set(k, { ts: Date.now(), data });
    return data;
  } catch (err) {
    logger.warn({ err: String(err), lat, lon }, "weather fetch failed");
    cache.set(k, { ts: Date.now(), data: null });
    return null;
  }
}
