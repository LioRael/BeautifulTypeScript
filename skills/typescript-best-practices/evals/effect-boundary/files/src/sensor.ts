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

interface WireReading {
  atMs: number;
  value: number;
}

interface WireBatch {
  sensorId: string;
  unit: "C" | "F";
  readings: WireReading[];
}

function toCelsius(value: number, unit: "C" | "F"): number {
  return unit === "F" ? ((value - 32) * 5) / 9 : value;
}

// The gateway originally supplied only batches from our own simulator.
export function decodeBatch(input: unknown): BatchResult {
  const wire = input as WireBatch;
  return {
    ok: true,
    batch: {
      sensorId: wire.sensorId.trim(),
      readings: wire.readings.map((reading) => ({
        atMs: reading.atMs,
        celsius: toCelsius(reading.value, wire.unit),
      })),
    },
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
