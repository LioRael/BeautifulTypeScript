import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';

const make = (capacity = 1) => new TrainingDesk([{ id: 's', title: 'First aid', capacity }]);

test('opt-in confirms free seats and queues full sessions without changing default behavior', () => {
  const desk = make();
  assert.deepEqual(desk.enroll('s', ' A@EXAMPLE.COM ', { waitlist: true }), {
    email: 'a@example.com', status: 'confirmed',
  });
  for (const options of [undefined, { waitlist: false }]) {
    assert.throws(() => desk.enroll('s', 'b@example.com', options), { code: 'FULL' });
  }
  assert.deepEqual(desk.enroll('s', ' B@EXAMPLE.COM ', { waitlist: true }), {
    email: 'b@example.com', status: 'waitlisted',
  });
  for (const email of [' A@example.com ', ' B@example.com ']) {
    for (const options of [undefined, { waitlist: true }, { waitlist: false }]) {
      assert.throws(() => desk.enroll('s', email, options), { code: 'ALREADY_ENROLLED' });
    }
  }
  assert.deepEqual(desk.roster('s').enrollments, [
    { email: 'a@example.com', status: 'confirmed' },
    { email: 'b@example.com', status: 'waitlisted' },
  ]);
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com']);
});

test('cancellation offers FIFO, skips cancelled waiters, and permits rejoining at the back', () => {
  const desk = make(2);
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com');
  for (const name of ['c', 'd', 'e']) desk.enroll('s', `${name}@example.com`, { waitlist: true });
  desk.cancel('s', ' D@EXAMPLE.COM ');
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com', 'b@example.com']);
  desk.enroll('s', 'd@example.com', { waitlist: true });
  desk.cancel('s', 'a@example.com');
  assert.equal(desk.roster('s').enrollments.find(entry => entry.email === 'c@example.com').status, 'offered');
  desk.acceptOffer('s', 'c@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com', 'c@example.com']);
  assert.throws(() => desk.enroll('s', 'new@example.com'), { code: 'FULL' });
  desk.cancel('s', 'b@example.com');
  desk.acceptOffer('s', 'e@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com', 'e@example.com']);
  desk.cancel('s', 'c@example.com');
  desk.acceptOffer('s', 'd@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['e@example.com', 'd@example.com']);
  desk.cancel('s', 'e@example.com');
  assert.equal(desk.enroll('s', 'new@example.com', { waitlist: true }).status, 'confirmed');
});

test('waitlist snapshots are detached and failed operations preserve the queue', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  const entry = desk.enroll('s', 'b@example.com', { waitlist: true });
  entry.status = 'confirmed';
  entry.email = 'changed@example.com';
  const snapshot = desk.roster('s');
  snapshot.enrollments[1].status = 'confirmed';
  snapshot.enrollments.reverse();
  const before = desk.roster('s');
  assert.throws(() => desk.cancel('s', 'missing@example.com'), { code: 'NOT_ENROLLED' });
  assert.throws(() => desk.enroll('missing', 'bad', { waitlist: true }), { code: 'NOT_FOUND' });
  assert.throws(() => desk.enroll('s', 'bad', { waitlist: true }), { code: 'INVALID_EMAIL' });
  assert.deepEqual(desk.roster('s'), before);
  const attendance = attendanceEmails(desk, 's');
  attendance.push('changed@example.com');
  desk.cancel('s', 'a@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  desk.acceptOffer('s', 'b@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  const otherDesk = make();
  assert.deepEqual(otherDesk.roster('s').enrollments, []);
});

test('portal accepts boolean opt-in and reports the resulting status', () => {
  const desk = make();
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'a@example.com', waitlist: false }), { ok: true, status: 'confirmed' });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'b@example.com', waitlist: false }), { ok: false, code: 'FULL' });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: ' B@EXAMPLE.COM ', waitlist: true, extra: 'ignored' }), { ok: true, status: 'waitlisted' });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'b@example.com', waitlist: true }), { ok: false, code: 'ALREADY_ENROLLED' });
  desk.cancel('s', 'a@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  desk.acceptOffer('s', 'b@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
});

test('portal rejects every nonboolean waitlist field before any state change', () => {
  const desk = make();
  for (const waitlist of [undefined, null, 0, 1, '', 'true', [], {}]) {
    assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'a@example.com', waitlist }), { ok: false, code: 'BAD_REQUEST' });
    assert.deepEqual(desk.roster('s').enrollments, []);
  }
  desk.enroll('s', 'a@example.com');
  const before = desk.roster('s');
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'b@example.com', waitlist: 'true' }), { ok: false, code: 'BAD_REQUEST' });
  assert.deepEqual(desk.roster('s'), before);
});
