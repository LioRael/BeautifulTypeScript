import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';

const make = () => new TrainingDesk([
  { id: 's', title: 'First aid', capacity: 2 },
  { id: 'other', title: 'Safety', capacity: 1 },
]);

test('sessions start open; paused admissions precede email and duplicate checks', () => {
  const desk = make();
  assert.equal(desk.roster('s').admissionsOpen, true);
  desk.enroll('s', 'a@example.com');
  desk.setAdmissions('s', false);
  desk.setAdmissions('s', false);
  const before = desk.roster('s');
  for (const email of ['bad', ' A@EXAMPLE.COM ', 'b@example.com']) {
    for (const options of [undefined, { waitlist: false }, { waitlist: true }]) {
      assert.throws(() => desk.enroll('s', email, options), { code: 'ADMISSIONS_CLOSED' });
    }
  }
  assert.deepEqual(desk.roster('s'), before);
  assert.throws(() => desk.enroll('missing', 'bad'), { code: 'NOT_FOUND' });
  assert.throws(() => desk.setAdmissions('missing', false), { code: 'NOT_FOUND' });
  desk.setAdmissions('s', true);
  assert.throws(() => desk.enroll('s', 'bad'), { code: 'INVALID_EMAIL' });
  assert.throws(() => desk.enroll('s', ' A@EXAMPLE.COM '), { code: 'ALREADY_ENROLLED' });
  assert.equal(desk.enroll('s', 'b@example.com').status, 'confirmed');
});

test('pause preserves FIFO through cancellations and reopening fills every vacancy', () => {
  const desk = make();
  for (const name of ['a', 'b', 'c', 'd', 'e', 'f']) {
    desk.enroll('s', `${name}@example.com`, { waitlist: true });
  }
  desk.setAdmissions('s', false);
  desk.cancel('s', ' A@EXAMPLE.COM ');
  desk.cancel('s', 'b@example.com');
  desk.cancel('s', 'd@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  assert.deepEqual(desk.roster('s').enrollments, ['c', 'e', 'f'].map(name => ({
    email: `${name}@example.com`, status: 'waitlisted',
  })));
  const paused = desk.roster('s');
  assert.throws(() => desk.cancel('s', 'bad'), { code: 'INVALID_EMAIL' });
  assert.throws(() => desk.cancel('s', 'absent@example.com'), { code: 'NOT_ENROLLED' });
  assert.deepEqual(desk.roster('s'), paused);

  desk.setAdmissions('s', true);
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com', 'e@example.com']);
  assert.equal(paused.admissionsOpen, false);
  assert.ok(paused.enrollments.every(entry => entry.status === 'waitlisted'));
  const reopened = desk.roster('s');
  desk.setAdmissions('s', true);
  assert.deepEqual(desk.roster('s'), reopened);
  assert.throws(() => desk.enroll('s', 'new@example.com'), { code: 'FULL' });
  assert.equal(desk.enroll('s', 'new@example.com', { waitlist: true }).status, 'waitlisted');
  desk.cancel('s', 'c@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['e@example.com', 'f@example.com']);
  desk.cancel('s', 'e@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['f@example.com', 'new@example.com']);
});

test('reopening with spare capacity exhausts the queue before admitting new arrivals', () => {
  const desk = make();
  for (const name of ['a', 'b', 'c']) {
    desk.enroll('s', `${name}@example.com`, { waitlist: true });
  }
  desk.setAdmissions('s', false);
  desk.cancel('s', 'a@example.com');
  desk.cancel('s', 'b@example.com');
  desk.setAdmissions('s', true);
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com']);
  assert.equal(desk.enroll('s', 'd@example.com').status, 'confirmed');
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com', 'd@example.com']);
});

test('admissions state belongs to each session and desk, independently of roster snapshots', () => {
  const desk = make();
  const otherDesk = make();
  const snapshot = desk.roster('s');
  snapshot.admissionsOpen = false;
  assert.equal(desk.roster('s').admissionsOpen, true);
  desk.setAdmissions('s', false);
  assert.equal(desk.roster('other').admissionsOpen, true);
  assert.equal(otherDesk.roster('s').admissionsOpen, true);
  assert.equal(desk.enroll('other', 'a@example.com').status, 'confirmed');
  assert.equal(otherDesk.enroll('s', 'a@example.com').status, 'confirmed');
  desk.setAdmissions('s', true);
  assert.deepEqual(attendanceEmails(desk, 'other'), ['a@example.com']);
});

test('portal translates closed admissions while retaining boundary validation', () => {
  const desk = make();
  desk.setAdmissions('s', false);
  for (const options of [{}, { waitlist: false }, { waitlist: true }]) {
    assert.deepEqual(submitEnrollment(desk, {
      sessionId: 's', email: 'bad', ...options,
    }), { ok: false, code: 'ADMISSIONS_CLOSED' });
  }
  assert.deepEqual(submitEnrollment(desk, {
    sessionId: 's', email: 'a@example.com', waitlist: 'true',
  }), { ok: false, code: 'BAD_REQUEST' });
  assert.deepEqual(submitEnrollment(desk, {
    sessionId: 's', email: null, waitlist: true,
  }), { ok: false, code: 'BAD_REQUEST' });
  assert.deepEqual(desk.roster('s').enrollments, []);
  desk.setAdmissions('s', true);
  assert.deepEqual(submitEnrollment(desk, {
    sessionId: 's', email: ' A@EXAMPLE.COM ', waitlist: true,
  }), { ok: true, status: 'confirmed' });
});
