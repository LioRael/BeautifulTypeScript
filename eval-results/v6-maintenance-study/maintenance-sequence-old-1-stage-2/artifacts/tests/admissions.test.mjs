import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';

const make = (capacity = 2) => new TrainingDesk([
  { id: 's', title: 'First aid', capacity },
  { id: 'other', title: 'Safety', capacity: 1 },
]);
const enroll = (desk, name) => desk.enroll('s', `${name}@example.com`, { waitlist: true });

test('closed admissions reject all new requests before email and duplicate checks', () => {
  const desk = make();
  assert.equal(desk.roster('s').admissionsOpen, true);
  enroll(desk, 'a');
  desk.setAdmissions('s', false);
  desk.setAdmissions('s', false);
  const before = desk.roster('s');
  for (const email of ['bad', ' A@EXAMPLE.COM ', 'new@example.com']) {
    for (const options of [undefined, { waitlist: false }, { waitlist: true }]) {
      assert.throws(() => desk.enroll('s', email, options), { code: 'ADMISSIONS_CLOSED' });
      assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email, ...options }),
        { ok: false, code: 'ADMISSIONS_CLOSED' });
    }
  }
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'a@example.com', waitlist: 'true' }),
    { ok: false, code: 'BAD_REQUEST' });
  assert.throws(() => desk.enroll('missing', 'bad'), { code: 'NOT_FOUND' });
  assert.throws(() => desk.setAdmissions('missing', false), { code: 'NOT_FOUND' });
  assert.deepEqual(desk.roster('s'), before);
  desk.setAdmissions('s', true);
  assert.throws(() => desk.enroll('s', 'bad'), { code: 'INVALID_EMAIL' });
  assert.throws(() => desk.enroll('s', 'a@example.com'), { code: 'ALREADY_ENROLLED' });
});

test('paused cancellations retain FIFO and reopening fills all vacancies before new arrivals', () => {
  const desk = make();
  for (const name of ['a', 'b', 'c', 'd', 'e', 'f']) enroll(desk, name);
  desk.setAdmissions('s', false);
  desk.cancel('s', ' A@EXAMPLE.COM ');
  desk.cancel('s', 'b@example.com');
  desk.cancel('s', 'd@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  assert.deepEqual(desk.roster('s').enrollments, ['c', 'e', 'f'].map(name => ({
    email: `${name}@example.com`, status: 'waitlisted',
  })));
  const paused = desk.roster('s');
  assert.throws(() => desk.cancel('s', 'missing@example.com'), { code: 'NOT_ENROLLED' });
  assert.throws(() => desk.cancel('s', 'bad'), { code: 'INVALID_EMAIL' });
  assert.deepEqual(desk.roster('s'), paused);
  desk.setAdmissions('s', true);
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com', 'e@example.com']);
  const reopened = desk.roster('s');
  desk.setAdmissions('s', true);
  assert.deepEqual(desk.roster('s'), reopened);
  assert.throws(() => desk.enroll('s', 'new@example.com'), { code: 'FULL' });
  assert.equal(enroll(desk, 'new').status, 'waitlisted');
  desk.cancel('s', 'c@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['e@example.com', 'f@example.com']);
  assert.equal(paused.admissionsOpen, false);
  assert.ok(paused.enrollments.every(entry => entry.status === 'waitlisted'));
});

test('reopening with fewer waiting employees leaves free seats and preserves isolation and ownership', () => {
  const desk = make();
  const independent = make();
  for (const name of ['a', 'b', 'c']) enroll(desk, name);
  desk.setAdmissions('s', false);
  const snapshot = desk.roster('s');
  snapshot.admissionsOpen = true;
  assert.equal(desk.roster('s').admissionsOpen, false);
  assert.equal(desk.roster('other').admissionsOpen, true);
  assert.equal(independent.roster('s').admissionsOpen, true);
  assert.equal(desk.enroll('other', 'a@example.com').status, 'confirmed');
  desk.cancel('s', 'a@example.com');
  desk.cancel('s', 'b@example.com');
  desk.setAdmissions('s', true);
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com']);
  assert.equal(desk.enroll('s', 'd@example.com').status, 'confirmed');
  assert.deepEqual(attendanceEmails(desk, 'other'), ['a@example.com']);
});
