import { TrainingDesk } from './desk.js';
import { DeskError } from './model.js';

export type PortalReply =
  | { ok: true; status: string }
  | { ok: false; code: string };

// The HTTP adapter passes decoded JSON here; this is a real untrusted boundary.
export function submitEnrollment(desk: TrainingDesk, body: unknown): PortalReply {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, code: 'BAD_REQUEST' };
  }
  const input = body as Record<string, unknown>;
  if (typeof input.sessionId !== 'string' || typeof input.email !== 'string') {
    return { ok: false, code: 'BAD_REQUEST' };
  }
  try {
    const enrollment = desk.enroll(input.sessionId, input.email);
    return { ok: true, status: enrollment.status };
  } catch (error) {
    if (error instanceof DeskError) return { ok: false, code: error.code };
    throw error;
  }
}

// Used by the coordinator's daily attendance export.
export function attendanceEmails(desk: TrainingDesk, sessionId: string): string[] {
  return desk.roster(sessionId).enrollments
    .filter(entry => entry.status === 'confirmed')
    .map(entry => entry.email);
}
