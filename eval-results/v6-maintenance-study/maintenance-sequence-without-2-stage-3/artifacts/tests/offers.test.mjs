import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { attendanceEmails, submitEnrollment } from '../dist/portal.js';

const make = () => new TrainingDesk([
  { id: 's', title: 'First aid', capacity: 1 },
  { id: 'other', title: 'Safety', capacity: 1 },
]);
const queue = desk => {
  desk.enroll('s', 'a@example.com');
  for (const name of ['b', 'c', 'd']) desk.enroll('s', `${name}@example.com`, { waitlist: true });
  desk.cancel('s', 'a@example.com');
};

test('offers reserve seats, exclude attendance, and accept with normalized identity during a pause', () => {
  const desk = make();
  queue(desk);
  const offeredSnapshot = desk.roster('s');
  assert.deepEqual(offeredSnapshot.enrollments.map(e => e.status), ['offered', 'waitlisted', 'waitlisted']);
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'new@example.com' }), { ok: false, code: 'FULL' });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'new@example.com', waitlist: true }), { ok: true, status: 'waitlisted' });
  assert.throws(() => desk.enroll('s', ' B@EXAMPLE.COM '), { code: 'ALREADY_ENROLLED' });
  desk.setAdmissions('s', false);
  const accepted = desk.acceptOffer('s', ' B@EXAMPLE.COM ');
  assert.deepEqual(accepted, { email: 'b@example.com', status: 'confirmed' });
  accepted.email = 'changed@example.com';
  accepted.status = 'waitlisted';
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  const attendance = attendanceEmails(desk, 's');
  attendance.length = 0;
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  assert.equal(offeredSnapshot.enrollments[0].status, 'offered');
  assert.deepEqual(desk.roster('other').enrollments, []);
});

test('declining and cancelling offers release seats in FIFO order and respect pauses', () => {
  const desk = make();
  queue(desk);
  assert.equal(desk.declineOffer('s', ' B@EXAMPLE.COM '), undefined);
  assert.deepEqual(desk.roster('s').enrollments, [
    { email: 'c@example.com', status: 'offered' },
    { email: 'd@example.com', status: 'waitlisted' },
  ]);
  desk.cancel('s', ' C@EXAMPLE.COM ');
  assert.deepEqual(desk.roster('s').enrollments, [{ email: 'd@example.com', status: 'offered' }]);
  desk.enroll('s', 'e@example.com', { waitlist: true });
  desk.setAdmissions('s', false);
  desk.declineOffer('s', 'd@example.com');
  assert.equal(desk.roster('s').enrollments[0].status, 'waitlisted');
  desk.setAdmissions('s', true);
  const reopened = desk.roster('s');
  desk.setAdmissions('s', true);
  assert.deepEqual(desk.roster('s'), reopened);
  assert.equal(reopened.enrollments[0].status, 'offered');
  desk.enroll('s', 'f@example.com', { waitlist: true });
  desk.setAdmissions('s', false);
  desk.cancel('s', 'e@example.com');
  assert.equal(desk.roster('s').enrollments[0].status, 'waitlisted');
  desk.setAdmissions('s', true);
  desk.acceptOffer('s', 'f@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['f@example.com']);
});

test('offer failures check session then email then entry and leave all state intact', () => {
  const desk = make();
  queue(desk);
  desk.enroll('other', 'confirmed@example.com');
  for (const method of ['acceptOffer', 'declineOffer']) {
    const before = desk.roster('s');
    const other = desk.roster('other');
    assert.throws(() => desk[method]('missing', 'bad'), { code: 'NOT_FOUND' });
    assert.throws(() => desk[method]('s', 'bad'), { code: 'INVALID_EMAIL' });
    assert.throws(() => desk[method]('s', 'missing@example.com'), { code: 'NOT_ENROLLED' });
    assert.throws(() => desk[method]('s', ' C@EXAMPLE.COM '), { code: 'NOT_OFFERED' });
    assert.throws(() => desk[method]('other', 'confirmed@example.com'), { code: 'NOT_OFFERED' });
    assert.deepEqual(desk.roster('s'), before);
    assert.deepEqual(desk.roster('other'), other);
  }
  desk.acceptOffer('s', 'b@example.com');
  assert.throws(() => desk.acceptOffer('s', 'b@example.com'), { code: 'NOT_OFFERED' });
  assert.throws(() => desk.declineOffer('s', 'b@example.com'), { code: 'NOT_OFFERED' });
});
