import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';

const make = () => new TrainingDesk([{ id: 's', title: 'First aid', capacity: 2 }]);

test('free seats confirm opt-ins; full sessions require opt-in and preserve unique identity', () => {
  const desk = make();
  assert.equal(desk.enroll('s', 'a@example.com', { waitlist: true }).status, 'confirmed');
  desk.enroll('s', 'b@example.com');
  const before = desk.roster('s');
  for (const options of [undefined, { waitlist: false }]) {
    assert.throws(() => desk.enroll('s', 'c@example.com', options), { code: 'FULL' });
  }
  assert.deepEqual(desk.roster('s'), before);
  assert.deepEqual(desk.enroll('s', ' C@EXAMPLE.COM ', { waitlist: true }), {
    email: 'c@example.com', status: 'waitlisted',
  });
  for (const email of [' A@EXAMPLE.COM ', ' C@EXAMPLE.COM ']) {
    for (const options of [undefined, { waitlist: true }, { waitlist: false }]) {
      assert.throws(() => desk.enroll('s', email, options), { code: 'ALREADY_ENROLLED' });
    }
  }
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com', 'b@example.com']);
});

test('cancellation promotes in join order, while waiting cancellation only removes that entry', () => {
  const desk = make();
  for (const name of ['a', 'b', 'c', 'd', 'e']) {
    desk.enroll('s', `${name}@example.com`, { waitlist: true });
  }
  desk.cancel('s', ' D@example.com ');
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com', 'b@example.com']);
  desk.enroll('s', 'd@example.com', { waitlist: true });
  desk.cancel('s', 'a@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com', 'c@example.com']);
  assert.deepEqual(desk.roster('s').enrollments.map(entry => entry.status), [
    'confirmed', 'confirmed', 'waitlisted', 'waitlisted',
  ]);
  desk.cancel('s', 'b@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com', 'e@example.com']);
  desk.cancel('s', 'c@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['e@example.com', 'd@example.com']);
  desk.cancel('s', 'e@example.com');
  assert.equal(desk.enroll('s', 'f@example.com', { waitlist: true }).status, 'confirmed');
});

test('waiting entries and promoted snapshots remain owned by their desk', () => {
  const desk = make();
  const other = make();
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com');
  const waiting = desk.enroll('s', 'c@example.com', { waitlist: true });
  const snapshot = desk.roster('s');
  waiting.status = 'confirmed';
  snapshot.enrollments[2].email = 'changed@example.com';
  assert.deepEqual(desk.roster('s').enrollments[2], { email: 'c@example.com', status: 'waitlisted' });
  desk.cancel('s', 'a@example.com');
  assert.equal(snapshot.enrollments[2].status, 'waitlisted');
  const attendance = attendanceEmails(desk, 's');
  attendance.length = 0;
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com', 'c@example.com']);
  assert.deepEqual(other.roster('s').enrollments, []);
});

test('portal validates present waitlist values before making any changes', () => {
  const desk = make();
  for (const waitlist of [undefined, null, 0, 1, '', 'true', [], {}]) {
    assert.deepEqual(submitEnrollment(desk, {
      sessionId: 's', email: 'a@example.com', waitlist,
    }), { ok: false, code: 'BAD_REQUEST' });
    assert.deepEqual(desk.roster('s').enrollments, []);
  }
  assert.deepEqual(submitEnrollment(desk, {
    sessionId: 's', email: ' A@EXAMPLE.COM ', waitlist: true, extra: 'ignored',
  }), { ok: true, status: 'confirmed' });
  assert.deepEqual(submitEnrollment(desk, {
    sessionId: 's', email: 'b@example.com', waitlist: false,
  }), { ok: true, status: 'confirmed' });
  for (const options of [{}, { waitlist: false }]) {
    assert.deepEqual(submitEnrollment(desk, {
      sessionId: 's', email: 'c@example.com', ...options,
    }), { ok: false, code: 'FULL' });
  }
  assert.deepEqual(submitEnrollment(desk, {
    sessionId: 's', email: 'c@example.com', waitlist: true,
  }), { ok: true, status: 'waitlisted' });
  assert.deepEqual(submitEnrollment(desk, {
    sessionId: 's', email: ' C@EXAMPLE.COM ', waitlist: true,
  }), { ok: false, code: 'ALREADY_ENROLLED' });
  const before = desk.roster('s');
  assert.deepEqual(submitEnrollment(desk, {
    sessionId: 's', email: 'd@example.com', waitlist: null,
  }), { ok: false, code: 'BAD_REQUEST' });
  assert.deepEqual(desk.roster('s'), before);
});

test('waitlisting preserves domain error ordering and atomic failures', () => {
  const desk = make();
  assert.throws(() => desk.enroll('missing', 'bad', { waitlist: true }), { code: 'NOT_FOUND' });
  assert.throws(() => desk.enroll('s', 'bad', { waitlist: true }), { code: 'INVALID_EMAIL' });
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com');
  desk.enroll('s', 'c@example.com', { waitlist: true });
  const before = desk.roster('s');
  assert.throws(() => desk.cancel('s', 'missing@example.com'), { code: 'NOT_ENROLLED' });
  assert.throws(() => desk.cancel('s', 'bad'), { code: 'INVALID_EMAIL' });
  assert.deepEqual(desk.roster('s'), before);
});
