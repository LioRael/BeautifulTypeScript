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
  const invalid: BatchResult = { ok: false, error: "invalid-batch" };
  if (!isRecord(input) || typeof input.sensorId !== "string") return invalid;

  const sensorId = input.sensorId.trim();
  const unit = input.unit;
  const wireReadings = input.readings;
  if (
    sensorId.length < 1 || sensorId.length > 32 ||
    (unit !== "C" && unit !== "F") ||
    !Array.isArray(wireReadings) ||
    wireReadings.length < 1 || wireReadings.length > 100
  ) return invalid;

  const minimum = unit === "C" ? -80 : -112;
  const maximum = unit === "C" ? 80 : 176;
  const readings: Reading[] = [];
  let previousAtMs = -1;
  for (const reading of wireReadings) {
    if (!isRecord(reading)) return invalid;
    const { atMs, value } = reading;
    if (
      typeof atMs !== "number" || !Number.isSafeInteger(atMs) ||
      atMs < 0 || atMs <= previousAtMs ||
      typeof value !== "number" || !Number.isFinite(value) ||
      value < minimum || value > maximum
    ) return invalid;

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
