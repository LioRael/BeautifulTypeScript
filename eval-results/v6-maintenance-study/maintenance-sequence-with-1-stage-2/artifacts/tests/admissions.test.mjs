import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';

const make = () => new TrainingDesk([
  { id: 's', title: 'First aid', capacity: 2 },
  { id: 'other', title: 'Safety', capacity: 1 },
]);

test('sessions start open; closure precedes email and duplicate checks without mutation', () => {
  const desk = make();
  assert.equal(desk.roster('s').admissionsOpen, true);
  desk.enroll('s', 'a@example.com');
  desk.setAdmissions('s', false);
  const before = desk.roster('s');
  assert.equal(before.admissionsOpen, false);
  for (const email of ['bad', ' A@EXAMPLE.COM ', 'b@example.com']) {
    for (const options of [undefined, { waitlist: false }, { waitlist: true }]) {
      assert.throws(() => desk.enroll('s', email, options), { code: 'ADMISSIONS_CLOSED' });
    }
  }
  desk.setAdmissions('s', false);
  assert.deepEqual(desk.roster('s'), before);
  assert.throws(() => desk.enroll('missing', 'bad'), { code: 'NOT_FOUND' });
  assert.throws(() => desk.setAdmissions('missing', false), { code: 'NOT_FOUND' });
  assert.deepEqual(desk.roster('s'), before);
});

test('paused cancellations preserve the queue; reopening fills every vacancy in FIFO order', () => {
  const desk = make();
  for (const name of ['a', 'b', 'c', 'd', 'e', 'f']) {
    desk.enroll('s', `${name}@example.com`, { waitlist: true });
  }
  desk.setAdmissions('s', false);
  desk.cancel('s', ' A@EXAMPLE.COM ');
  desk.cancel('s', 'b@example.com');
  desk.cancel('s', ' C@EXAMPLE.COM ');
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  assert.deepEqual(desk.roster('s').enrollments, [
    { email: 'd@example.com', status: 'waitlisted' },
    { email: 'e@example.com', status: 'waitlisted' },
    { email: 'f@example.com', status: 'waitlisted' },
  ]);
  const paused = desk.roster('s');
  assert.throws(() => desk.cancel('s', 'bad'), { code: 'INVALID_EMAIL' });
  assert.throws(() => desk.cancel('s', 'absent@example.com'), { code: 'NOT_ENROLLED' });
  assert.deepEqual(desk.roster('s'), paused);
  desk.setAdmissions('s', true);
  assert.deepEqual(attendanceEmails(desk, 's'), ['d@example.com', 'e@example.com']);
  const reopened = desk.roster('s');
  desk.setAdmissions('s', true);
  assert.deepEqual(desk.roster('s'), reopened);
  assert.throws(() => desk.enroll('s', 'new@example.com'), { code: 'FULL' });
  assert.equal(desk.enroll('s', 'new@example.com', { waitlist: true }).status, 'waitlisted');
  desk.cancel('s', 'd@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['e@example.com', 'f@example.com']);
  assert.deepEqual(paused.enrollments.map(entry => entry.status), ['waitlisted', 'waitlisted', 'waitlisted']);
});

test('reopening with fewer waiters than vacancies leaves seats for new arrivals', () => {
  const desk = make();
  for (const name of ['a', 'b', 'c']) desk.enroll('s', `${name}@example.com`, { waitlist: true });
  desk.setAdmissions('s', false);
  desk.cancel('s', 'a@example.com');
  desk.cancel('s', 'b@example.com');
  desk.setAdmissions('s', true);
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com']);
  assert.equal(desk.enroll('s', 'd@example.com').status, 'confirmed');
});

test('admissions state belongs to its session and desk, and roster snapshots are detached', () => {
  const desk = make();
  const snapshot = desk.roster('s');
  snapshot.admissionsOpen = false;
  assert.equal(desk.roster('s').admissionsOpen, true);
  desk.setAdmissions('s', false);
  assert.equal(desk.roster('other').admissionsOpen, true);
  assert.equal(desk.enroll('other', 'a@example.com').status, 'confirmed');
  assert.equal(make().roster('s').admissionsOpen, true);
  desk.setAdmissions('other', false);
  desk.setAdmissions('s', true);
  assert.equal(desk.roster('other').admissionsOpen, false);
});

test('portal translates admissions errors while retaining JSON boundary validation', () => {
  const desk = make();
  desk.setAdmissions('s', false);
  const before = desk.roster('s');
  for (const extra of [{}, { waitlist: false }, { waitlist: true }]) {
    assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'bad', ...extra }), {
      ok: false, code: 'ADMISSIONS_CLOSED',
    });
  }
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'a@example.com', waitlist: 'true' }), {
    ok: false, code: 'BAD_REQUEST',
  });
  assert.deepEqual(desk.roster('s'), before);
  desk.setAdmissions('s', true);
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: ' A@EXAMPLE.COM ' }), {
    ok: true, status: 'confirmed',
  });
});
