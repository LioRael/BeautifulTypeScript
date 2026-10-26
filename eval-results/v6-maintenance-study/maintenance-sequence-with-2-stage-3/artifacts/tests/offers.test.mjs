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
  for (const name of ['z', 'y', 'x']) {
    desk.enroll('s', `${name}@example.com`, { waitlist: true });
  }
};
const statuses = desk => desk.roster('s').enrollments.map(({ email, status }) => [email, status]);

test('offers reserve seats; acceptance is explicit, normalized and owns its result', () => {
  const desk = make();
  queue(desk);
  desk.cancel('s', 'a@example.com');
  const offered = desk.roster('s');
  assert.deepEqual(statuses(desk), [
    ['z@example.com', 'offered'], ['y@example.com', 'waitlisted'], ['x@example.com', 'waitlisted'],
  ]);
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'new@example.com' }),
    { ok: false, code: 'FULL' });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'new@example.com', waitlist: true }),
    { ok: true, status: 'waitlisted' });
  assert.throws(() => desk.enroll('s', ' Z@EXAMPLE.COM ', { waitlist: true }), { code: 'ALREADY_ENROLLED' });
  offered.enrollments[0].status = 'confirmed';
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  desk.setAdmissions('s', false);
  const beforeAcceptance = desk.roster('s');
  const result = desk.acceptOffer('s', ' Z@EXAMPLE.COM ');
  assert.deepEqual(result, { email: 'z@example.com', status: 'confirmed' });
  assert.equal(beforeAcceptance.enrollments[0].status, 'offered');
  result.email = 'changed@example.com';
  result.status = 'waitlisted';
  assert.deepEqual(attendanceEmails(desk, 's'), ['z@example.com']);
  assert.throws(() => desk.acceptOffer('s', 'z@example.com'), { code: 'NOT_OFFERED' });
  assert.deepEqual(desk.roster('other').enrollments, []);
});

test('decline and offered cancellation release seats in FIFO order', () => {
  const desk = make();
  queue(desk);
  desk.cancel('s', 'a@example.com');
  assert.equal(desk.declineOffer('s', ' Z@EXAMPLE.COM '), undefined);
  assert.deepEqual(statuses(desk), [['y@example.com', 'offered'], ['x@example.com', 'waitlisted']]);
  desk.cancel('s', ' Y@EXAMPLE.COM ');
  assert.deepEqual(statuses(desk), [['x@example.com', 'offered']]);
  desk.declineOffer('s', 'x@example.com');
  assert.deepEqual(desk.roster('s').enrollments, []);
  assert.equal(desk.enroll('s', 'z@example.com').status, 'confirmed');
});

test('paused decline and cancellation defer offers; reopening cannot overbook reservations', () => {
  const desk = new TrainingDesk([{ id: 's', title: 'Safety', capacity: 2 }]);
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com');
  for (const name of ['z', 'y', 'x', 'w']) desk.enroll('s', `${name}@example.com`, { waitlist: true });
  desk.cancel('s', 'a@example.com');
  desk.cancel('s', 'b@example.com');
  desk.setAdmissions('s', false);
  desk.declineOffer('s', 'z@example.com');
  desk.cancel('s', 'y@example.com');
  assert.deepEqual(statuses(desk), [['x@example.com', 'waitlisted'], ['w@example.com', 'waitlisted']]);
  desk.setAdmissions('s', true);
  assert.deepEqual(statuses(desk), [['x@example.com', 'offered'], ['w@example.com', 'offered']]);
  const reopened = desk.roster('s');
  desk.setAdmissions('s', true);
  desk.setAdmissions('s', false);
  desk.setAdmissions('s', true);
  assert.deepEqual(desk.roster('s'), reopened);
  assert.throws(() => desk.enroll('s', 'new@example.com'), { code: 'FULL' });
  desk.acceptOffer('s', 'w@example.com');
  desk.acceptOffer('s', 'x@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['x@example.com', 'w@example.com']);
});

test('offer operations preserve error precedence and never mutate on failure', () => {
  const desk = make();
  queue(desk);
  for (const open of [true, false]) {
    desk.setAdmissions('s', open);
    for (const method of ['acceptOffer', 'declineOffer']) {
      const before = desk.roster('s');
      assert.throws(() => desk[method]('missing', 'bad'), { code: 'NOT_FOUND' });
      assert.throws(() => desk[method]('s', 'bad'), { code: 'INVALID_EMAIL' });
      assert.throws(() => desk[method]('s', 'absent@example.com'), { code: 'NOT_ENROLLED' });
      for (const email of [' A@EXAMPLE.COM ', ' Z@EXAMPLE.COM ']) {
        assert.throws(() => desk[method]('s', email), { code: 'NOT_OFFERED' });
      }
      assert.deepEqual(desk.roster('s'), before);
    }
  }
});
