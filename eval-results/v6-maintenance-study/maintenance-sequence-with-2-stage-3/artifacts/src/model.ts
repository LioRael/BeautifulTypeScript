export interface SessionSeed {
  id: string;
  title: string;
  capacity: number;
}

export interface Enrollment {
  email: string;
  status: 'confirmed' | 'waitlisted' | 'offered';
}

export interface Roster {
  id: string;
  title: string;
  capacity: number;
  admissionsOpen: boolean;
  enrollments: Enrollment[];
}

export class DeskError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'DeskError';
  }
}

// Email is the company directory's stable identifier for this application.
export function canonicalEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new DeskError('INVALID_EMAIL', 'A directory email is required');
  }
  return email;
}
