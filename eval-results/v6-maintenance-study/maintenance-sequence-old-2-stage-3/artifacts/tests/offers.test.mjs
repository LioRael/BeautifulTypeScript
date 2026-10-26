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
};
const statuses = desk => desk.roster('s').enrollments.map(entry => [entry.email, entry.status]);

test('offers reserve seats, require agreement for attendance, and return owned snapshots', () => {
  const desk = make();
  queue(desk);
  const before = desk.roster('s');
  desk.cancel('s', 'a@example.com');
  assert.deepEqual(statuses(desk), [
    ['b@example.com', 'offered'], ['c@example.com', 'waitlisted'], ['d@example.com', 'waitlisted'],
  ]);
  assert.equal(before.enrollments[1].status, 'waitlisted');
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'new@example.com' }), {
    ok: false, code: 'FULL',
  });
  assert.deepEqual(submitEnrollment(desk, {
    sessionId: 's', email: 'new@example.com', waitlist: true,
  }), { ok: true, status: 'waitlisted' });
  assert.throws(() => desk.enroll('s', ' B@EXAMPLE.COM '), { code: 'ALREADY_ENROLLED' });
  desk.setAdmissions('s', false);
  const accepted = desk.acceptOffer('s', ' B@EXAMPLE.COM ');
  assert.deepEqual(accepted, { email: 'b@example.com', status: 'confirmed' });
  accepted.email = 'mutated@example.com';
  accepted.status = 'waitlisted';
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  assert.equal(desk.roster('s').admissionsOpen, false);
  assert.deepEqual(desk.roster('other').enrollments, []);
});

test('declining or cancelling an offered seat advances FIFO only while open', () => {
  const desk = make();
  queue(desk);
  desk.cancel('s', 'a@example.com');
  assert.equal(desk.declineOffer('s', ' B@EXAMPLE.COM '), undefined);
  assert.deepEqual(statuses(desk), [['c@example.com', 'offered'], ['d@example.com', 'waitlisted']]);
  desk.cancel('s', ' C@EXAMPLE.COM ');
  assert.deepEqual(statuses(desk), [['d@example.com', 'offered']]);
  desk.declineOffer('s', 'd@example.com');
  assert.equal(desk.enroll('s', 'new@example.com').status, 'confirmed');
});

test('paused offered cancellations and declines preserve the queue until reopening', () => {
  for (const operation of ['cancel', 'declineOffer']) {
    const desk = make();
    queue(desk);
    desk.cancel('s', 'a@example.com');
    desk.setAdmissions('s', false);
    desk[operation]('s', 'b@example.com');
    assert.deepEqual(statuses(desk), [['c@example.com', 'waitlisted'], ['d@example.com', 'waitlisted']]);
    desk.setAdmissions('s', false);
    desk.setAdmissions('s', true);
    const reopened = desk.roster('s');
    assert.deepEqual(statuses(desk), [['c@example.com', 'offered'], ['d@example.com', 'waitlisted']]);
    for (let i = 0; i < 3; i++) desk.setAdmissions('s', true);
    assert.deepEqual(desk.roster('s'), reopened);
    assert.deepEqual(attendanceEmails(desk, 's'), []);
  }
});

test('offer operations preserve error precedence and leave failed requests unchanged', () => {
  const desk = make();
  queue(desk);
  for (const operation of ['acceptOffer', 'declineOffer']) {
    const before = desk.roster('s');
    assert.throws(() => desk[operation]('missing', 'bad'), { code: 'NOT_FOUND' });
    assert.throws(() => desk[operation]('s', 'bad'), { code: 'INVALID_EMAIL' });
    assert.throws(() => desk[operation]('s', 'absent@example.com'), { code: 'NOT_ENROLLED' });
    for (const email of [' A@EXAMPLE.COM ', ' B@EXAMPLE.COM ']) {
      assert.throws(() => desk[operation]('s', email), { code: 'NOT_OFFERED' });
    }
    assert.deepEqual(desk.roster('s'), before);
  }
  desk.cancel('s', 'a@example.com');
  desk.acceptOffer('s', 'b@example.com');
  const accepted = desk.roster('s');
  assert.throws(() => desk.acceptOffer('s', 'b@example.com'), { code: 'NOT_OFFERED' });
  assert.throws(() => desk.declineOffer('s', 'b@example.com'), { code: 'NOT_OFFERED' });
  assert.deepEqual(desk.roster('s'), accepted);
});

test('reopening counts existing offers and fills all remaining vacancies in FIFO order', () => {
  const desk = new TrainingDesk([{ id: 's', title: 'Safety', capacity: 3 }]);
  for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
    desk.enroll('s', `${name}@example.com`, { waitlist: true });
  }
  desk.cancel('s', 'a@example.com');
  desk.setAdmissions('s', false);
  desk.cancel('s', 'b@example.com');
  desk.cancel('s', 'c@example.com');
  desk.setAdmissions('s', true);
  assert.deepEqual(statuses(desk), [
    ['d@example.com', 'offered'], ['e@example.com', 'offered'],
    ['f@example.com', 'offered'], ['g@example.com', 'waitlisted'],
  ]);
  desk.setAdmissions('s', true);
  assert.throws(() => desk.enroll('s', 'new@example.com'), { code: 'FULL' });
  desk.acceptOffer('s', 'f@example.com');
  desk.acceptOffer('s', 'd@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['d@example.com', 'f@example.com']);
  desk.declineOffer('s', 'e@example.com');
  assert.deepEqual(statuses(desk), [
    ['d@example.com', 'confirmed'], ['f@example.com', 'confirmed'], ['g@example.com', 'offered'],
  ]);
});
