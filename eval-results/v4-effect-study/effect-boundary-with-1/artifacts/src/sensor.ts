export interface Reading {
  readonly atMs: number;
  readonly celsius: number;
}

export interface SensorBatch {
  readonly sensorId: string;
  readonly readings: readonly Reading[];
}

export type BatchResult =
  | { readonly ok: true; readonly batch: SensorBatch }
  | { readonly ok: false; readonly error: "invalid-batch" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toCelsius(value: number, unit: "C" | "F"): number {
  return unit === "F" ? ((value - 32) * 5) / 9 : value;
}

export function decodeBatch(input: unknown): BatchResult {
  if (!isRecord(input) || typeof input.sensorId !== "string") {
    return { ok: false, error: "invalid-batch" };
  }
  const sensorId = input.sensorId.trim();
  const unit = input.unit;
  if (
    sensorId.length < 1 || sensorId.length > 32 ||
    (unit !== "C" && unit !== "F") ||
    !Array.isArray(input.readings) ||
    input.readings.length < 1 || input.readings.length > 100
  ) {
    return { ok: false, error: "invalid-batch" };
  }

  const wireReadings: readonly unknown[] = input.readings;
  const readings: Reading[] = [];
  const minimum = unit === "C" ? -80 : -112;
  const maximum = unit === "C" ? 80 : 176;
  let previousAtMs = -1;
  for (const reading of wireReadings) {
    if (!isRecord(reading)) {
      return { ok: false, error: "invalid-batch" };
    }
    const { atMs, value } = reading;
    if (
      typeof atMs !== "number" || !Number.isSafeInteger(atMs) ||
      atMs < 0 || atMs <= previousAtMs ||
      typeof value !== "number" || !Number.isFinite(value) ||
      value < minimum || value > maximum
    ) {
      return { ok: false, error: "invalid-batch" };
    }
    readings.push({ atMs, celsius: toCelsius(value, unit) });
    previousAtMs = atMs;
  }

  return {
    ok: true,
    batch: { sensorId, readings },
  };
}

export interface TemperatureRange {
  readonly minimum: number;
  readonly maximum: number;
}

export function temperatureRange(batch: SensorBatch): TemperatureRange {
  let minimum = Infinity;
  let maximum = -Infinity;
  for (const reading of batch.readings) {
    minimum = Math.min(minimum, reading.celsius);
    maximum = Math.max(maximum, reading.celsius);
  }
  return { minimum, maximum };
}
