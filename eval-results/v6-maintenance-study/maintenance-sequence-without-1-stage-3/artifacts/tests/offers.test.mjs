import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { attendanceEmails, submitEnrollment } from '../dist/portal.js';

const make = (capacity = 1) => new TrainingDesk([
  { id: 's', title: 'First aid', capacity },
  { id: 'other', title: 'Safety', capacity: 1 },
]);
const queue = (desk, names) => {
  for (const name of names) desk.enroll('s', `${name}@example.com`, { waitlist: true });
};

test('offers reserve seats, require acceptance for attendance and preserve identity and snapshots', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  queue(desk, ['b', 'c']);
  desk.cancel('s', 'a@example.com');
  assert.deepEqual(desk.roster('s').enrollments, [
    { email: 'b@example.com', status: 'offered' },
    { email: 'c@example.com', status: 'waitlisted' },
  ]);
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'new@example.com' }), { ok: false, code: 'FULL' });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: ' B@EXAMPLE.COM ', waitlist: true }), { ok: false, code: 'ALREADY_ENROLLED' });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'd@example.com', waitlist: true }), { ok: true, status: 'waitlisted' });
  const snapshot = desk.roster('s');
  snapshot.enrollments[0].status = 'confirmed';
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  const accepted = desk.acceptOffer('s', ' B@EXAMPLE.COM ');
  assert.deepEqual(accepted, { email: 'b@example.com', status: 'confirmed' });
  accepted.status = 'waitlisted';
  accepted.email = 'changed@example.com';
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  assert.deepEqual(desk.roster('other').enrollments, []);
});

test('decline and cancellation release offered seats in FIFO order, with rejoining at the back', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  queue(desk, ['b', 'c', 'd']);
  desk.cancel('s', 'a@example.com');
  assert.equal(desk.declineOffer('s', ' B@EXAMPLE.COM '), undefined);
  desk.enroll('s', 'b@example.com', { waitlist: true });
  assert.deepEqual(desk.roster('s').enrollments.map(entry => entry.status), ['offered', 'waitlisted', 'waitlisted']);
  desk.cancel('s', ' C@EXAMPLE.COM ');
  assert.deepEqual(desk.roster('s').enrollments, [
    { email: 'd@example.com', status: 'offered' },
    { email: 'b@example.com', status: 'waitlisted' },
  ]);
  desk.declineOffer('s', 'd@example.com');
  desk.declineOffer('s', 'b@example.com');
  assert.equal(desk.enroll('s', 'new@example.com').status, 'confirmed');
});

test('paused offers can be accepted, declined or cancelled; reopening reserves only free seats', () => {
  const desk = make(3);
  queue(desk, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  for (const name of ['a', 'b', 'c']) desk.cancel('s', `${name}@example.com`);
  assert.deepEqual(desk.roster('s').enrollments.map(entry => entry.status), ['offered', 'offered', 'offered', 'waitlisted']);
  desk.setAdmissions('s', false);
  assert.equal(desk.acceptOffer('s', ' D@EXAMPLE.COM ').status, 'confirmed');
  desk.declineOffer('s', 'e@example.com');
  desk.cancel('s', 'f@example.com');
  assert.deepEqual(desk.roster('s').enrollments, [
    { email: 'd@example.com', status: 'confirmed' },
    { email: 'g@example.com', status: 'waitlisted' },
  ]);
  desk.setAdmissions('s', true);
  const reopened = desk.roster('s');
  assert.equal(reopened.enrollments[1].status, 'offered');
  desk.setAdmissions('s', true);
  assert.deepEqual(desk.roster('s'), reopened);
  assert.equal(desk.enroll('s', 'h@example.com').status, 'confirmed');
  assert.throws(() => desk.enroll('s', 'i@example.com'), { code: 'FULL' });
  assert.deepEqual(attendanceEmails(desk, 's'), ['d@example.com', 'h@example.com']);
  assert.deepEqual(desk.roster('other').enrollments, []);
});

test('offer operations validate session, email, enrollment and status without changing state', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  queue(desk, ['b', 'c']);
  for (const method of ['acceptOffer', 'declineOffer']) {
    for (const open of [true, false]) {
      desk.setAdmissions('s', open);
      const before = desk.roster('s');
      for (const [session, email, code] of [
        ['missing', 'bad', 'NOT_FOUND'],
        ['s', 'bad', 'INVALID_EMAIL'],
        ['s', 'missing@example.com', 'NOT_ENROLLED'],
        ['s', ' A@EXAMPLE.COM ', 'NOT_OFFERED'],
        ['s', ' B@EXAMPLE.COM ', 'NOT_OFFERED'],
      ]) {
        assert.throws(() => desk[method](session, email), { code });
        assert.deepEqual(desk.roster('s'), before);
      }
    }
  }
  desk.setAdmissions('s', true);
  desk.cancel('s', 'a@example.com');
  desk.acceptOffer('s', 'b@example.com');
  const before = desk.roster('s');
  assert.throws(() => desk.acceptOffer('s', 'b@example.com'), { code: 'NOT_OFFERED' });
  assert.throws(() => desk.declineOffer('s', 'b@example.com'), { code: 'NOT_OFFERED' });
  assert.deepEqual(desk.roster('s'), before);
});
