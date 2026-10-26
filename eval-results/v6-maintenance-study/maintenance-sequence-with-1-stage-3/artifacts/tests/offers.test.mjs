import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';

const make = () => new TrainingDesk([
  { id: 's', title: 'First aid', capacity: 1 },
  { id: 'other', title: 'Safety', capacity: 1 },
]);
const queue = desk => {
  for (const name of ['a', 'b', 'c', 'd']) {
    desk.enroll('s', `${name}@example.com`, { waitlist: true });
  }
  desk.cancel('s', 'a@example.com');
};

test('offers reserve seats, require acceptance for attendance, and preserve ownership', () => {
  const desk = make();
  queue(desk);
  const snapshot = desk.roster('s');
  assert.deepEqual(snapshot.enrollments, [
    { email: 'b@example.com', status: 'offered' },
    { email: 'c@example.com', status: 'waitlisted' },
    { email: 'd@example.com', status: 'waitlisted' },
  ]);
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'new@example.com' }), {
    ok: false, code: 'FULL',
  });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'new@example.com', waitlist: true }), {
    ok: true, status: 'waitlisted',
  });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: ' B@EXAMPLE.COM ' }), {
    ok: false, code: 'ALREADY_ENROLLED',
  });
  desk.setAdmissions('s', false);
  const accepted = desk.acceptOffer('s', ' B@EXAMPLE.COM ');
  assert.deepEqual(accepted, { email: 'b@example.com', status: 'confirmed' });
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  accepted.status = 'waitlisted';
  accepted.email = 'changed@example.com';
  snapshot.enrollments[0].email = 'changed@example.com';
  assert.equal(snapshot.enrollments[0].status, 'offered');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  assert.equal(desk.roster('s').admissionsOpen, false);
  assert.equal(desk.enroll('other', 'b@example.com').status, 'confirmed');
});

test('declining and cancelling offered entries pass the reservation along FIFO only while open', () => {
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
  desk.enroll('s', 'f@example.com', { waitlist: true });
  desk.setAdmissions('s', false);
  desk.declineOffer('s', 'd@example.com');
  assert.deepEqual(desk.roster('s').enrollments.map(entry => entry.status), ['waitlisted', 'waitlisted']);
  desk.setAdmissions('s', true);
  desk.setAdmissions('s', true);
  assert.deepEqual(desk.roster('s').enrollments.map(entry => entry.status), ['offered', 'waitlisted']);
  desk.setAdmissions('s', false);
  desk.cancel('s', 'e@example.com');
  assert.equal(desk.roster('s').enrollments[0].status, 'waitlisted');
  desk.setAdmissions('s', true);
  assert.equal(desk.roster('s').enrollments[0].status, 'offered');
  desk.acceptOffer('s', 'f@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['f@example.com']);
});

test('offer operations preserve error precedence and leave failures atomic in every status', () => {
  const desk = make();
  queue(desk);
  desk.enroll('other', 'confirmed@example.com');
  for (const open of [true, false]) {
    desk.setAdmissions('s', open);
    for (const method of ['acceptOffer', 'declineOffer']) {
      const before = desk.roster('s');
      assert.throws(() => desk[method]('missing', 'bad'), { code: 'NOT_FOUND' });
      assert.throws(() => desk[method]('s', 'bad'), { code: 'INVALID_EMAIL' });
      assert.throws(() => desk[method]('s', 'absent@example.com'), { code: 'NOT_ENROLLED' });
      assert.throws(() => desk[method]('s', ' C@EXAMPLE.COM '), { code: 'NOT_OFFERED' });
      assert.throws(() => desk[method]('other', 'confirmed@example.com'), { code: 'NOT_OFFERED' });
      assert.deepEqual(desk.roster('s'), before);
      assert.deepEqual(attendanceEmails(desk, 'other'), ['confirmed@example.com']);
    }
  }
  desk.acceptOffer('s', 'b@example.com');
  const before = desk.roster('s');
  assert.throws(() => desk.acceptOffer('s', 'b@example.com'), { code: 'NOT_OFFERED' });
  assert.throws(() => desk.declineOffer('s', 'b@example.com'), { code: 'NOT_OFFERED' });
  assert.deepEqual(desk.roster('s'), before);
});

test('reopening reserves every free seat once, keeps FIFO, and isolates sessions', () => {
  const desk = new TrainingDesk([
    { id: 's', title: 'First aid', capacity: 3 },
    { id: 'other', title: 'Safety', capacity: 1 },
  ]);
  for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
    desk.enroll('s', `${name}@example.com`, { waitlist: true });
  }
  desk.setAdmissions('s', false);
  for (const name of ['a', 'b', 'c']) desk.cancel('s', `${name}@example.com`);
  desk.setAdmissions('s', true);
  const reopened = desk.roster('s');
  assert.deepEqual(reopened.enrollments.map(entry => entry.status), ['offered', 'offered', 'offered', 'waitlisted']);
  desk.acceptOffer('s', 'e@example.com');
  desk.setAdmissions('s', true);
  desk.setAdmissions('s', true);
  assert.deepEqual(desk.roster('s').enrollments.map(entry => entry.status), ['offered', 'confirmed', 'offered', 'waitlisted']);
  assert.deepEqual(attendanceEmails(desk, 's'), ['e@example.com']);
  desk.acceptOffer('s', 'd@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['d@example.com', 'e@example.com']);
  assert.equal(reopened.enrollments[0].status, 'offered');
  assert.throws(() => desk.enroll('s', 'new@example.com'), { code: 'FULL' });
  assert.equal(desk.enroll('other', 'g@example.com').status, 'confirmed');
});
