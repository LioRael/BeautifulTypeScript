import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';

const make = () => new TrainingDesk([
  { id: 's', title: 'First aid', capacity: 2 },
  { id: 'other', title: 'Safety', capacity: 1 },
]);
const entry = (name, status) => ({ email: `${name}@example.com`, status });

test('admissions start open; closure takes precedence and failures preserve state', () => {
  const desk = make();
  assert.equal(desk.roster('s').admissionsOpen, true);
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com');
  desk.enroll('s', 'c@example.com', { waitlist: true });
  desk.setAdmissions('s', false);
  const before = desk.roster('s');
  for (const email of ['bad', ' A@EXAMPLE.COM ', ' C@EXAMPLE.COM ', 'new@example.com']) {
    for (const options of [undefined, { waitlist: false }, { waitlist: true }]) {
      assert.throws(() => desk.enroll('s', email, options), { code: 'ADMISSIONS_CLOSED' });
    }
  }
  desk.setAdmissions('s', false);
  assert.deepEqual(desk.roster('s'), before);
  assert.throws(() => desk.enroll('missing', 'bad'), { code: 'NOT_FOUND' });
  for (const open of [true, false]) {
    assert.throws(() => desk.setAdmissions('missing', open), { code: 'NOT_FOUND' });
  }
  assert.deepEqual(desk.roster('s'), before);
  assert.equal(desk.enroll('other', 'a@example.com').status, 'confirmed');
  assert.equal(desk.roster('other').admissionsOpen, true);
  assert.equal(make().roster('s').admissionsOpen, true);
});

test('paused cancellation preserves FIFO; reopening fills every seat before arrivals', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com');
  for (const name of ['z', 'y', 'x', 'w']) {
    desk.enroll('s', `${name}@example.com`, { waitlist: true });
  }
  const oldRoster = desk.roster('s');
  desk.setAdmissions('s', false);
  desk.cancel('s', ' A@EXAMPLE.COM ');
  desk.cancel('s', 'b@example.com');
  desk.cancel('s', ' Y@EXAMPLE.COM ');
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  assert.deepEqual(desk.roster('s').enrollments, [
    entry('z', 'waitlisted'), entry('x', 'waitlisted'), entry('w', 'waitlisted'),
  ]);
  const paused = desk.roster('s');
  assert.throws(() => desk.cancel('s', 'bad'), { code: 'INVALID_EMAIL' });
  assert.throws(() => desk.cancel('s', 'absent@example.com'), { code: 'NOT_ENROLLED' });
  assert.deepEqual(desk.roster('s'), paused);
  desk.setAdmissions('s', true);
  assert.equal(desk.roster('s').admissionsOpen, true);
  assert.deepEqual(desk.roster('s').enrollments, [
    entry('z', 'offered'), entry('x', 'offered'), entry('w', 'waitlisted'),
  ]);
  const reopened = desk.roster('s');
  desk.setAdmissions('s', true);
  assert.deepEqual(desk.roster('s'), reopened);
  assert.throws(() => desk.enroll('s', 'new@example.com'), { code: 'FULL' });
  assert.equal(desk.enroll('s', 'new@example.com', { waitlist: true }).status, 'waitlisted');
  desk.cancel('s', 'z@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  desk.cancel('s', 'x@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  assert.equal(oldRoster.admissionsOpen, true);
  assert.equal(oldRoster.enrollments[2].status, 'waitlisted');
  assert.equal(paused.admissionsOpen, false);
  desk.setAdmissions('s', false);
  const snapshot = desk.roster('s');
  snapshot.admissionsOpen = true;
  assert.equal(desk.roster('s').admissionsOpen, false);
});

test('reopening a short queue leaves remaining seats available with normal rules', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com');
  desk.enroll('s', 'z@example.com', { waitlist: true });
  desk.setAdmissions('s', false);
  desk.cancel('s', 'a@example.com');
  desk.cancel('s', 'b@example.com');
  desk.setAdmissions('s', true);
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  assert.equal(desk.roster('s').enrollments[0].status, 'offered');
  assert.throws(() => desk.enroll('s', ' Z@EXAMPLE.COM '), { code: 'ALREADY_ENROLLED' });
  assert.throws(() => desk.enroll('s', 'bad'), { code: 'INVALID_EMAIL' });
  assert.equal(desk.enroll('s', 'new@example.com').status, 'confirmed');
});

test('portal translates admissions errors while retaining JSON boundary validation', () => {
  const desk = make();
  desk.setAdmissions('s', false);
  for (const fields of [{}, { waitlist: false }, { waitlist: true }]) {
    assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'bad', ...fields }),
      { ok: false, code: 'ADMISSIONS_CLOSED' });
  }
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'a@example.com', waitlist: 'true' }),
    { ok: false, code: 'BAD_REQUEST' });
  assert.deepEqual(desk.roster('s').enrollments, []);
  desk.setAdmissions('s', true);
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: ' A@EXAMPLE.COM ' }),
    { ok: true, status: 'confirmed' });
});
