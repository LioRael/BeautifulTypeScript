import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';

const make = (capacity = 1) => new TrainingDesk([{ id: 's', title: 'First aid', capacity }]);
const entry = (email, status) => ({ email: `${email}@example.com`, status });

test('opt-in confirms free seats and queues full-session requests in joining order', () => {
  const desk = make(2);
  assert.deepEqual(desk.enroll('s', ' A@EXAMPLE.COM ', { waitlist: true }), entry('a', 'confirmed'));
  desk.enroll('s', 'b@example.com');
  assert.throws(() => desk.enroll('s', 'c@example.com'), { code: 'FULL' });
  assert.throws(() => desk.enroll('s', 'c@example.com', { waitlist: false }), { code: 'FULL' });
  assert.deepEqual(desk.enroll('s', ' C@EXAMPLE.COM ', { waitlist: true }), entry('c', 'waitlisted'));
  desk.enroll('s', 'd@example.com', { waitlist: true });
  assert.deepEqual(desk.roster('s').enrollments, [
    entry('a', 'confirmed'), entry('b', 'confirmed'), entry('c', 'waitlisted'), entry('d', 'waitlisted'),
  ]);
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com', 'b@example.com']);
  for (const email of [' A@example.com ', ' C@example.com ']) {
    assert.throws(() => desk.enroll('s', email), { code: 'ALREADY_ENROLLED' });
    assert.throws(() => desk.enroll('s', email, { waitlist: true }), { code: 'ALREADY_ENROLLED' });
  }
  desk.cancel('s', 'b@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com', 'c@example.com']);
  desk.cancel('s', 'a@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com', 'd@example.com']);
});

test('waiting cancellations remove only that employee and rejoining goes to the back', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com', { waitlist: true });
  desk.enroll('s', 'c@example.com', { waitlist: true });
  desk.cancel('s', ' B@EXAMPLE.COM ');
  assert.deepEqual(desk.roster('s').enrollments, [entry('a', 'confirmed'), entry('c', 'waitlisted')]);
  desk.enroll('s', 'b@example.com', { waitlist: true });
  desk.cancel('s', 'a@example.com');
  assert.deepEqual(desk.roster('s').enrollments, [entry('c', 'confirmed'), entry('b', 'waitlisted')]);
  assert.throws(() => desk.cancel('s', 'missing@example.com'), { code: 'NOT_ENROLLED' });
  assert.throws(() => desk.enroll('missing', 'bad', { waitlist: true }), { code: 'NOT_FOUND' });
  assert.throws(() => desk.enroll('s', 'bad', { waitlist: true }), { code: 'INVALID_EMAIL' });
  assert.deepEqual(desk.roster('s').enrollments, [entry('c', 'confirmed'), entry('b', 'waitlisted')]);
  desk.cancel('s', 'c@example.com');
  desk.cancel('s', 'b@example.com');
  assert.equal(desk.enroll('s', 'new@example.com').status, 'confirmed');
});

test('portal validates the optional boolean before any state change and returns status', () => {
  const desk = make();
  for (const waitlist of [undefined, null, 0, 1, 'true', 'false', {}, []]) {
    assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'a@example.com', waitlist }),
      { ok: false, code: 'BAD_REQUEST' });
    assert.deepEqual(desk.roster('s').enrollments, []);
  }
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'a@example.com', waitlist: true }),
    { ok: true, status: 'confirmed' });
  for (const extra of [{}, { waitlist: false }]) {
    assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'b@example.com', ...extra }),
      { ok: false, code: 'FULL' });
  }
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: ' B@EXAMPLE.COM ', waitlist: true, ignored: 1 }),
    { ok: true, status: 'waitlisted' });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'b@example.com', waitlist: true }),
    { ok: false, code: 'ALREADY_ENROLLED' });
  const before = desk.roster('s');
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'c@example.com', waitlist: 'true' }),
    { ok: false, code: 'BAD_REQUEST' });
  assert.deepEqual(desk.roster('s'), before);
  desk.cancel('s', 'a@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
});

test('waiting entries, promotions and attendance retain independent ownership', () => {
  const desk = make();
  const other = make();
  desk.enroll('s', 'a@example.com');
  const waiting = desk.enroll('s', 'b@example.com', { waitlist: true });
  const snapshot = desk.roster('s');
  waiting.status = 'confirmed';
  waiting.email = 'changed@example.com';
  snapshot.enrollments[1].email = 'changed@example.com';
  snapshot.enrollments[1].status = 'confirmed';
  assert.deepEqual(desk.roster('s').enrollments, [entry('a', 'confirmed'), entry('b', 'waitlisted')]);
  const beforePromotion = desk.roster('s');
  desk.cancel('s', 'a@example.com');
  assert.equal(beforePromotion.enrollments[1].status, 'waitlisted');
  assert.deepEqual(desk.roster('s').enrollments, [entry('b', 'confirmed')]);
  const attendance = attendanceEmails(desk, 's');
  attendance.push('changed@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  assert.deepEqual(other.roster('s').enrollments, []);
});
