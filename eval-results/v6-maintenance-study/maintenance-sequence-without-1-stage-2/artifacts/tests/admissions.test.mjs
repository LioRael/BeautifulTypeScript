import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';

const make = (capacity = 1) => new TrainingDesk([
  { id: 's', title: 'First aid', capacity },
  { id: 'other', title: 'Safety', capacity: 1 },
]);

test('sessions start open and paused enrollment errors precede email and duplicate checks', () => {
  const desk = make(2);
  assert.equal(desk.roster('s').admissionsOpen, true);
  desk.enroll('s', 'a@example.com');
  desk.setAdmissions('s', false);
  const before = desk.roster('s');
  for (const email of ['bad', ' A@EXAMPLE.COM ', 'new@example.com']) {
    for (const options of [undefined, { waitlist: false }, { waitlist: true }]) {
      assert.throws(() => desk.enroll('s', email, options), { code: 'ADMISSIONS_CLOSED' });
    }
  }
  assert.throws(() => desk.enroll('missing', 'bad'), { code: 'NOT_FOUND' });
  assert.deepEqual(desk.roster('s'), before);
  desk.setAdmissions('s', false);
  assert.deepEqual(desk.roster('s'), before);
  desk.setAdmissions('s', true);
  assert.throws(() => desk.enroll('s', 'bad'), { code: 'INVALID_EMAIL' });
  assert.throws(() => desk.enroll('s', 'a@example.com'), { code: 'ALREADY_ENROLLED' });
  assert.equal(desk.enroll('s', 'new@example.com').status, 'confirmed');
});

test('pause preserves FIFO while cancellations leave seats empty until reopening', () => {
  const desk = make(3);
  for (const name of ['a', 'b', 'c']) desk.enroll('s', `${name}@example.com`);
  for (const name of ['d', 'e', 'f', 'g']) desk.enroll('s', `${name}@example.com`, { waitlist: true });
  desk.setAdmissions('s', false);
  desk.cancel('s', ' A@EXAMPLE.COM ');
  desk.cancel('s', 'b@example.com');
  desk.cancel('s', ' E@EXAMPLE.COM ');
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com']);
  assert.deepEqual(desk.roster('s').enrollments.map(entry => entry.status), [
    'confirmed', 'waitlisted', 'waitlisted', 'waitlisted',
  ]);
  const paused = desk.roster('s');
  assert.throws(() => desk.cancel('s', 'missing@example.com'), { code: 'NOT_ENROLLED' });
  assert.throws(() => desk.cancel('s', 'bad'), { code: 'INVALID_EMAIL' });
  assert.deepEqual(desk.roster('s'), paused);
  desk.setAdmissions('s', true);
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com', 'd@example.com', 'f@example.com']);
  assert.equal(desk.roster('s').enrollments.at(-1).status, 'waitlisted');
  const reopened = desk.roster('s');
  desk.setAdmissions('s', true);
  assert.deepEqual(desk.roster('s'), reopened);
  assert.throws(() => desk.enroll('s', 'new@example.com'), { code: 'FULL' });
  assert.equal(desk.enroll('s', 'new@example.com', { waitlist: true }).status, 'waitlisted');
  desk.cancel('s', 'c@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['d@example.com', 'f@example.com', 'g@example.com']);
});

test('reopening can exhaust the queue and allows arrivals into remaining seats', () => {
  const desk = make(2);
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com');
  desk.enroll('s', 'c@example.com', { waitlist: true });
  desk.setAdmissions('s', false);
  desk.cancel('s', 'a@example.com');
  desk.cancel('s', 'b@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  desk.setAdmissions('s', true);
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com']);
  assert.equal(desk.enroll('s', 'a@example.com').status, 'confirmed');
});

test('portal translates closure errors and still validates untrusted input first', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com', { waitlist: true });
  desk.setAdmissions('s', false);
  const before = desk.roster('s');
  for (const email of ['bad', 'a@example.com', 'b@example.com', 'new@example.com']) {
    for (const extra of [{}, { waitlist: false }, { waitlist: true }]) {
      assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email, ...extra }), {
        ok: false, code: 'ADMISSIONS_CLOSED',
      });
    }
  }
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'new@example.com', waitlist: 'true' }), {
    ok: false, code: 'BAD_REQUEST',
  });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 'missing', email: 'bad' }), {
    ok: false, code: 'NOT_FOUND',
  });
  assert.deepEqual(desk.roster('s'), before);
});

test('admissions changes are isolated and roster state is detached', () => {
  const desk = make();
  desk.setAdmissions('s', false);
  const snapshot = desk.roster('s');
  snapshot.admissionsOpen = true;
  assert.equal(desk.roster('s').admissionsOpen, false);
  assert.equal(desk.roster('other').admissionsOpen, true);
  assert.equal(desk.enroll('other', 'a@example.com').status, 'confirmed');
  assert.equal(make().roster('s').admissionsOpen, true);
  assert.throws(() => desk.setAdmissions('missing', false), { code: 'NOT_FOUND' });
  assert.deepEqual(desk.roster('s').enrollments, []);
  desk.setAdmissions('s', true);
  assert.deepEqual(attendanceEmails(desk, 'other'), ['a@example.com']);
});
