import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { getActiveChampionship } from "@/lib/data/scorecards";
import type { Venue } from "@/payload-types";

export interface HourlyForecast {
  time: string;
  temperatureC: number;
  windMph: number;
  weatherCode: number;
  isDay: boolean;
}

export interface DailyForecast {
  date: string;
  maxTemperatureC: number;
  minTemperatureC: number;
  precipitationProbability: number;
  windMph: number;
  weatherCode: number;
}

export interface VenueWeather {
  locationName: string;
  currentTemperatureC: number;
  currentWeatherCode: number;
  isDay: boolean;
  precipitationProbability: number;
  precipitationMm: number;
  windMph: number;
  windDirectionDeg: number;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

/** Live forecast for the active championship's venue, via Open-Meteo (free, no API key). Returns null if the venue has no coordinates set or the fetch fails. */
export async function getVenueWeather(): Promise<VenueWeather | null> {
  const payload = await getPayload({ config: configPromise });
  const championship = await getActiveChampionship(payload);
  if (!championship) return null;

  const venue = typeof championship.venue === "object" ? (championship.venue as Venue) : undefined;
  if (!venue?.latitude || !venue?.longitude) return null;

  const params = new URLSearchParams({
    latitude: String(venue.latitude),
    longitude: String(venue.longitude),
    current: "temperature_2m,weather_code,is_day,precipitation,wind_speed_10m,wind_direction_10m",
    hourly: "temperature_2m,wind_speed_10m,weather_code,is_day,precipitation_probability",
    daily: "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_speed_10m_max",
    timezone: "Europe/London",
    forecast_days: "7",
    wind_speed_unit: "mph",
  });

  try {
    const res = await fetch(`${OPEN_METEO_URL}?${params.toString()}`, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    const data = await res.json();

    const hourlyTimes: string[] = data.hourly?.time ?? [];
    const nowIndex = Math.max(
      0,
      hourlyTimes.findIndex((t: string) => new Date(t).getTime() >= Date.now()),
    );
    const hourly: HourlyForecast[] = hourlyTimes.slice(nowIndex, nowIndex + 6).map((time: string, i: number) => ({
      time,
      temperatureC: data.hourly.temperature_2m[nowIndex + i],
      windMph: data.hourly.wind_speed_10m[nowIndex + i],
      weatherCode: data.hourly.weather_code[nowIndex + i],
      isDay: data.hourly.is_day[nowIndex + i] === 1,
    }));

    const dailyDates: string[] = data.daily?.time ?? [];
    const daily: DailyForecast[] = dailyDates.map((date: string, i: number) => ({
      date,
      maxTemperatureC: data.daily.temperature_2m_max[i],
      minTemperatureC: data.daily.temperature_2m_min[i],
      precipitationProbability: data.daily.precipitation_probability_max[i],
      windMph: data.daily.wind_speed_10m_max[i],
      weatherCode: data.daily.weather_code[i],
    }));

    return {
      locationName: venue.name,
      currentTemperatureC: data.current.temperature_2m,
      currentWeatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
      precipitationProbability: data.hourly?.precipitation_probability?.[nowIndex] ?? 0,
      precipitationMm: data.current.precipitation ?? 0,
      windMph: data.current.wind_speed_10m,
      windDirectionDeg: data.current.wind_direction_10m,
      hourly,
      daily,
    };
  } catch {
    return null;
  }
}
