export type BookingStatus = "confirmed" | "tentative" | "cancelled";

export interface Room {
  readonly id: string;
  readonly label: string;
  readonly turnaroundMinutes: number;
}

export interface Booking {
  readonly id: string;
  readonly roomId: string;
  readonly production: string;
  readonly durationMinutes: number;
  readonly status: BookingStatus;
}

export interface DayPlan {
  readonly date: string;
  readonly rooms: readonly Room[];
  readonly bookings: readonly Booking[];
}

export interface DeskSummary {
  readonly date: string;
  readonly roomCount: number;
  readonly confirmedCount: number;
  readonly rehearsalMinutes: number;
}

export interface RoomWorkload {
  readonly roomId: string;
  readonly bookingCount: number;
  readonly rehearsalMinutes: number;
  readonly occupiedMinutes: number;
}

export function roomWorkloads(plan: DayPlan): RoomWorkload[] {
  const totals = new Map<string, { count: number; minutes: number }>();
  for (const booking of plan.bookings) {
    if (booking.status !== "confirmed") continue;
    const total = totals.get(booking.roomId) ?? { count: 0, minutes: 0 };
    total.count += 1;
    total.minutes += booking.durationMinutes;
    totals.set(booking.roomId, total);
  }

  return plan.rooms.map((room) => {
    const total = totals.get(room.id);
    const bookingCount = total?.count ?? 0;
    const rehearsalMinutes = total?.minutes ?? 0;
    return {
      roomId: room.id,
      bookingCount,
      rehearsalMinutes,
      occupiedMinutes:
        rehearsalMinutes + Math.max(bookingCount - 1, 0) * room.turnaroundMinutes,
    };
  });
}

export function confirmedBookings(plan: DayPlan): readonly Booking[] {
  return plan.bookings.filter((booking) => booking.status === "confirmed");
}

export function deskSummary(plan: DayPlan): DeskSummary {
  const bookings = confirmedBookings(plan);
  return {
    date: plan.date,
    roomCount: plan.rooms.length,
    confirmedCount: bookings.length,
    rehearsalMinutes: bookings.reduce(
      (minutes, booking) => minutes + booking.durationMinutes,
      0,
    ),
  };
}

export function roomLabel(plan: DayPlan, roomId: string): string | undefined {
  return plan.rooms.find((room) => room.id === roomId)?.label;
}

export function bookingsForProduction(
  plan: DayPlan,
  production: string,
): readonly Booking[] {
  return plan.bookings.filter((booking) => booking.production === production);
}
