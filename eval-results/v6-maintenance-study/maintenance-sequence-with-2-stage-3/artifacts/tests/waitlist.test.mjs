import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';

const make = () => new TrainingDesk([{ id: 's', title: 'First aid', capacity: 2 }]);
const entry = (email, status) => ({ email: `${email}@example.com`, status });

test('opt-in confirms free seats, queues full sessions and offers in join order', () => {
  const desk = make();
  assert.deepEqual(desk.enroll('s', 'a@example.com', { waitlist: true }), entry('a', 'confirmed'));
  desk.enroll('s', 'b@example.com');
  assert.throws(() => desk.enroll('s', 'c@example.com'), { code: 'FULL' });
  assert.throws(() => desk.enroll('s', 'c@example.com', { waitlist: false }), { code: 'FULL' });
  // Reverse alphabetical order makes joining order observable.
  assert.deepEqual(desk.enroll('s', ' Z@EXAMPLE.COM ', { waitlist: true }), entry('z', 'waitlisted'));
  desk.enroll('s', 'c@example.com', { waitlist: true });
  assert.deepEqual(desk.roster('s').enrollments, [
    entry('a', 'confirmed'), entry('b', 'confirmed'), entry('z', 'waitlisted'), entry('c', 'waitlisted'),
  ]);
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com', 'b@example.com']);
  desk.cancel('s', ' A@EXAMPLE.COM ');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  assert.throws(() => desk.enroll('s', 'd@example.com'), { code: 'FULL' });
  desk.cancel('s', 'z@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  desk.cancel('s', 'b@example.com');
  assert.equal(desk.enroll('s', 'd@example.com').status, 'confirmed');
});

test('waiting cancellation removes only that employee and rejoining goes to the end', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com');
  desk.enroll('s', 'c@example.com', { waitlist: true });
  desk.enroll('s', 'd@example.com', { waitlist: true });
  desk.cancel('s', ' C@EXAMPLE.COM ');
  assert.deepEqual(desk.roster('s').enrollments, [
    entry('a', 'confirmed'), entry('b', 'confirmed'), entry('d', 'waitlisted'),
  ]);
  desk.enroll('s', 'c@example.com', { waitlist: true });
  desk.cancel('s', 'b@example.com');
  assert.deepEqual(desk.roster('s').enrollments, [
    entry('a', 'confirmed'), entry('d', 'offered'), entry('c', 'waitlisted'),
  ]);
});

test('duplicates and failures preserve the queue and domain error precedence', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com');
  desk.enroll('s', 'c@example.com', { waitlist: true });
  const before = desk.roster('s');
  for (const email of [' A@EXAMPLE.COM ', ' C@EXAMPLE.COM ']) {
    for (const options of [undefined, { waitlist: false }, { waitlist: true }]) {
      assert.throws(() => desk.enroll('s', email, options), { code: 'ALREADY_ENROLLED' });
    }
  }
  assert.throws(() => desk.enroll('missing', 'bad', { waitlist: true }), { code: 'NOT_FOUND' });
  assert.throws(() => desk.enroll('s', 'bad', { waitlist: true }), { code: 'INVALID_EMAIL' });
  assert.throws(() => desk.cancel('s', 'missing@example.com'), { code: 'NOT_ENROLLED' });
  assert.deepEqual(desk.roster('s'), before);
});

test('portal validates optional waitlist before enrollment and returns actual status', () => {
  const desk = make();
  for (const waitlist of [undefined, null, 0, 1, 'true', 'false', {}, []]) {
    assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'a@example.com', waitlist }),
      { ok: false, code: 'BAD_REQUEST' });
    assert.deepEqual(desk.roster('s').enrollments, []);
  }
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'a@example.com', waitlist: true }),
    { ok: true, status: 'confirmed' });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'b@example.com', waitlist: false }),
    { ok: true, status: 'confirmed' });
  for (const fields of [{}, { waitlist: false }]) {
    assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'c@example.com', ...fields }),
      { ok: false, code: 'FULL' });
  }
  assert.deepEqual(submitEnrollment(desk, {
    sessionId: 's', email: ' C@EXAMPLE.COM ', waitlist: true, extra: 'ignored',
  }), { ok: true, status: 'waitlisted' });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'c@example.com', waitlist: true }),
    { ok: false, code: 'ALREADY_ENROLLED' });
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com', 'b@example.com']);
  desk.cancel('s', 'a@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
});

test('waitlist entries, snapshots, exports and desk instances keep independent ownership', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com');
  const waiting = desk.enroll('s', 'c@example.com', { waitlist: true });
  waiting.status = 'confirmed';
  waiting.email = 'changed@example.com';
  const snapshot = desk.roster('s');
  snapshot.enrollments[2].status = 'confirmed';
  snapshot.enrollments[2].email = 'changed@example.com';
  const attendance = attendanceEmails(desk, 's');
  attendance.length = 0;
  desk.cancel('s', 'a@example.com');
  assert.equal(snapshot.enrollments[0].email, 'a@example.com');
  assert.equal(waiting.email, 'changed@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  assert.deepEqual(make().roster('s').enrollments, []);
});
