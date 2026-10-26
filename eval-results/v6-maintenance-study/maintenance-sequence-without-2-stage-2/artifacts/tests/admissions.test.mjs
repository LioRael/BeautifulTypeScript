import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';

const make = (capacity = 1) => new TrainingDesk([
  { id: 's', title: 'First aid', capacity },
  { id: 'other', title: 'Safety', capacity: 1 },
]);

test('admissions start open and closure takes precedence over email and duplicates', () => {
  const desk = make();
  assert.equal(desk.roster('s').admissionsOpen, true);
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com', { waitlist: true });
  desk.setAdmissions('s', false);
  const before = desk.roster('s');
  for (const email of ['bad', ' A@EXAMPLE.COM ', 'b@example.com', 'new@example.com']) {
    for (const options of [undefined, { waitlist: false }, { waitlist: true }]) {
      assert.throws(() => desk.enroll('s', email, options), { code: 'ADMISSIONS_CLOSED' });
    }
  }
  assert.deepEqual(desk.roster('s'), before);
  assert.throws(() => desk.enroll('missing', 'bad'), { code: 'NOT_FOUND' });
  assert.throws(() => desk.setAdmissions('missing', false), { code: 'NOT_FOUND' });
  assert.equal(desk.enroll('other', 'new@example.com').status, 'confirmed');
  assert.equal(make().roster('s').admissionsOpen, true);
});

test('paused cancellations retain FIFO and reopening fills every free seat', () => {
  const desk = make(2);
  for (const name of ['a', 'b', 'c', 'd', 'e', 'f']) {
    desk.enroll('s', `${name}@example.com`, { waitlist: true });
  }
  desk.setAdmissions('s', false);
  desk.setAdmissions('s', false);
  desk.cancel('s', ' A@EXAMPLE.COM ');
  desk.cancel('s', 'b@example.com');
  desk.cancel('s', ' D@EXAMPLE.COM ');
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  assert.deepEqual(desk.roster('s').enrollments, [
    { email: 'c@example.com', status: 'waitlisted' },
    { email: 'e@example.com', status: 'waitlisted' },
    { email: 'f@example.com', status: 'waitlisted' },
  ]);
  const paused = desk.roster('s');
  assert.throws(() => desk.cancel('s', 'bad'), { code: 'INVALID_EMAIL' });
  assert.throws(() => desk.cancel('s', 'missing@example.com'), { code: 'NOT_ENROLLED' });
  assert.deepEqual(desk.roster('s'), paused);
  desk.setAdmissions('s', true);
  assert.equal(desk.roster('s').admissionsOpen, true);
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com', 'e@example.com']);
  const reopened = desk.roster('s');
  desk.setAdmissions('s', true);
  assert.deepEqual(desk.roster('s'), reopened);
  assert.throws(() => desk.enroll('s', 'new@example.com'), { code: 'FULL' });
  assert.equal(desk.enroll('s', 'new@example.com', { waitlist: true }).status, 'waitlisted');
  desk.cancel('s', 'c@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['e@example.com', 'f@example.com']);
});

test('reopening with spare capacity admits new arrivals after existing waiters', () => {
  const desk = make(2);
  for (const name of ['a', 'b', 'c']) desk.enroll('s', `${name}@example.com`, { waitlist: true });
  desk.setAdmissions('s', false);
  desk.cancel('s', 'a@example.com');
  desk.cancel('s', 'b@example.com');
  desk.setAdmissions('s', true);
  assert.equal(desk.enroll('s', 'd@example.com').status, 'confirmed');
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com', 'd@example.com']);
  const snapshot = desk.roster('s');
  snapshot.admissionsOpen = false;
  assert.equal(desk.roster('s').admissionsOpen, true);
});

test('portal reports closure while preserving boundary validation and reopening behavior', () => {
  const desk = make();
  desk.setAdmissions('s', false);
  for (const waitlist of [true, false]) {
    assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'bad', waitlist }),
      { ok: false, code: 'ADMISSIONS_CLOSED' });
  }
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'a@example.com' }),
    { ok: false, code: 'ADMISSIONS_CLOSED' });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'a@example.com', waitlist: 'true' }),
    { ok: false, code: 'BAD_REQUEST' });
  assert.deepEqual(desk.roster('s').enrollments, []);
  desk.setAdmissions('s', true);
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: ' A@EXAMPLE.COM ' }),
    { ok: true, status: 'confirmed' });
});
