"use client";

import { useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Droplet, Moon, Sun, Wind } from "lucide-react";

import { cn } from "@/lib/utils";
import type { VenueWeather } from "@/lib/data/weather";

/** Maps Open-Meteo's WMO weather codes to an icon, day/night aware. */
function weatherIcon(code: number, isDay: boolean) {
  if (code === 0) return isDay ? Sun : Moon;
  if (code <= 3) return isDay ? CloudSun : CloudMoon;
  if (code <= 48) return CloudFog;
  if (code <= 57) return CloudDrizzle;
  if (code <= 67) return CloudRain;
  if (code <= 77) return CloudSnow;
  if (code <= 82) return CloudRain;
  if (code <= 86) return CloudSnow;
  return CloudLightning;
}

function windDirectionLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", hour12: true }).replace(" ", "").toLowerCase();
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short" });
}

export function WeatherWidget({ weather }: { weather: VenueWeather }) {
  const [range, setRange] = useState<"today" | "week">("today");
  const CurrentIcon = weatherIcon(weather.currentWeatherCode, weather.isDay);

  return (
    <div className="flex h-full flex-col overflow-hidden text-white">
      <div className="grid grid-cols-2">
        <div className="flex flex-col items-center justify-center gap-1 bg-accent/15 px-4 py-5 text-primary">
          <CurrentIcon className="h-9 w-9" />
          <p className="font-display text-3xl font-bold tabular-nums">
            {Math.round(weather.currentTemperatureC)}
            <span className="text-lg align-top">°C</span>
          </p>
          <p className="text-center text-xs font-bold uppercase tracking-wide">{weather.locationName}</p>
        </div>
        <div className="flex flex-col justify-center gap-2 bg-primary px-4 py-5 text-sm">
          <div className="flex items-center gap-2">
            <Droplet className="h-4 w-4 text-accent" />
            <span className="tabular-nums">
              {Math.round(weather.precipitationProbability)}% · {weather.precipitationMm.toFixed(1)} mm
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-accent" />
            <span className="tabular-nums">
              {weather.windMph.toFixed(1)} mph {windDirectionLabel(weather.windDirectionDeg)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 bg-primary px-4 py-4">
        {range === "today" ? (
          <div className="grid grid-cols-6 gap-1 text-center">
            {weather.hourly.map((hour) => {
              const Icon = weatherIcon(hour.weatherCode, hour.isDay);
              return (
                <div key={hour.time} className="flex flex-col items-center gap-1">
                  <p className="text-[11px] text-white/60">{formatHour(hour.time)}</p>
                  <Icon className="h-5 w-5 text-accent" />
                  <p className="text-sm font-bold tabular-nums">{Math.round(hour.temperatureC)}°</p>
                  <p className="flex items-center gap-0.5 text-[10px] text-white/50">
                    <Wind className="h-2.5 w-2.5" />
                    {Math.round(hour.windMph)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1 text-center">
            {weather.daily.slice(0, 6).map((day) => {
              const Icon = weatherIcon(day.weatherCode, true);
              return (
                <div key={day.date} className="flex flex-col items-center gap-1">
                  <p className="text-[11px] text-white/60">{formatDay(day.date)}</p>
                  <Icon className="h-5 w-5 text-accent" />
                  <p className="text-sm font-bold tabular-nums">
                    {Math.round(day.maxTemperatureC)}°<span className="text-white/50">/{Math.round(day.minTemperatureC)}°</span>
                  </p>
                  <p className="flex items-center gap-0.5 text-[10px] text-white/50">
                    <Droplet className="h-2.5 w-2.5" />
                    {Math.round(day.precipitationProbability)}%
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          {(["today", "week"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={cn(
                "flex-1 rounded-sm border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                range === key ? "border-accent bg-accent text-accent-foreground" : "border-white/25 text-white/70 hover:border-white/50",
              )}
            >
              {key === "today" ? "Today" : "Week"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
