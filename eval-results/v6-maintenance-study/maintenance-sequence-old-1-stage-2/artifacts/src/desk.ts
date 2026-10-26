import { canonicalEmail, DeskError, type Enrollment, type Roster, type SessionSeed } from './model.js';
import { SessionStore, type SessionState } from './store.js';

function fillAvailableSeats(session: SessionState): void {
  if (!session.admissionsOpen) return;
  let available = session.capacity - session.enrollments.filter(entry => entry.status === 'confirmed').length;
  for (const entry of session.enrollments) {
    if (available === 0) break;
    if (entry.status === 'waitlisted') {
      entry.status = 'confirmed';
      available--;
    }
  }
}

export class TrainingDesk {
  private readonly store: SessionStore;

  constructor(seeds: readonly SessionSeed[]) {
    this.store = new SessionStore(seeds);
  }

  enroll(sessionId: string, rawEmail: string, options?: { waitlist: boolean }): Enrollment {
    const session = this.store.get(sessionId);
    if (!session.admissionsOpen) {
      throw new DeskError('ADMISSIONS_CLOSED', 'Session admissions are closed');
    }
    const email = canonicalEmail(rawEmail);
    if (session.enrollments.some(entry => entry.email === email)) {
      throw new DeskError('ALREADY_ENROLLED', 'Employee already enrolled');
    }
    const full = session.enrollments.filter(entry => entry.status === 'confirmed').length >= session.capacity;
    if (full && !options?.waitlist) {
      throw new DeskError('FULL', 'Session is full');
    }
    const entry: Enrollment = { email, status: full ? 'waitlisted' : 'confirmed' };
    session.enrollments.push(entry);
    return { ...entry };
  }

  cancel(sessionId: string, rawEmail: string): void {
    const session = this.store.get(sessionId);
    const email = canonicalEmail(rawEmail);
    const index = session.enrollments.findIndex(entry => entry.email === email);
    if (index < 0) throw new DeskError('NOT_ENROLLED', 'Employee is not enrolled');
    session.enrollments.splice(index, 1);
    fillAvailableSeats(session);
  }

  setAdmissions(sessionId: string, open: boolean): void {
    const session = this.store.get(sessionId);
    session.admissionsOpen = open;
    fillAvailableSeats(session);
  }

  roster(sessionId: string): Roster {
    const session = this.store.get(sessionId);
    return {
      id: session.id,
      title: session.title,
      capacity: session.capacity,
      admissionsOpen: session.admissionsOpen,
      enrollments: session.enrollments.map(entry => ({ ...entry })),
    };
  }
}
