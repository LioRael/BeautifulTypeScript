import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';

const make = (capacity = 1) => new TrainingDesk([
  { id: 's', title: 'First aid', capacity },
  { id: 'other', title: 'Safety', capacity: 1 },
]);
const join = (desk, name) => desk.enroll('s', `${name}@example.com`, { waitlist: true });
const statuses = desk => desk.roster('s').enrollments.map(({ email, status }) => [email, status]);

test('offers reserve seats until explicit acceptance and preserve snapshot ownership', () => {
  const desk = make();
  join(desk, 'a');
  join(desk, 'b');
  join(desk, 'c');
  const before = desk.roster('s');
  desk.cancel('s', 'a@example.com');
  assert.deepEqual(statuses(desk), [['b@example.com', 'offered'], ['c@example.com', 'waitlisted']]);
  assert.equal(before.enrollments[1].status, 'waitlisted');
  const offered = desk.roster('s');
  offered.enrollments[0].status = 'confirmed';
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'new@example.com' }),
    { ok: false, code: 'FULL' });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: ' B@EXAMPLE.COM ', waitlist: true }),
    { ok: false, code: 'ALREADY_ENROLLED' });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'new@example.com', waitlist: true }),
    { ok: true, status: 'waitlisted' });
  desk.setAdmissions('s', false);
  const accepted = desk.acceptOffer('s', ' B@EXAMPLE.COM ');
  assert.deepEqual(accepted, { email: 'b@example.com', status: 'confirmed' });
  accepted.email = 'changed@example.com';
  accepted.status = 'waitlisted';
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  assert.equal(offered.enrollments[0].email, 'b@example.com');
  assert.deepEqual(desk.roster('other').enrollments, []);
  assert.deepEqual(make().roster('s').enrollments, []);
});

test('declining and cancelling offers release seats in FIFO order, respecting a pause', () => {
  const desk = make();
  for (const name of ['a', 'b', 'c', 'd', 'e']) join(desk, name);
  desk.cancel('s', 'a@example.com');
  assert.equal(desk.declineOffer('s', ' B@EXAMPLE.COM '), undefined);
  assert.deepEqual(statuses(desk), [
    ['c@example.com', 'offered'], ['d@example.com', 'waitlisted'], ['e@example.com', 'waitlisted'],
  ]);
  desk.cancel('s', ' C@EXAMPLE.COM ');
  assert.deepEqual(statuses(desk), [['d@example.com', 'offered'], ['e@example.com', 'waitlisted']]);
  desk.setAdmissions('s', false);
  desk.declineOffer('s', 'd@example.com');
  assert.deepEqual(statuses(desk), [['e@example.com', 'waitlisted']]);
  desk.setAdmissions('s', true);
  assert.deepEqual(statuses(desk), [['e@example.com', 'offered']]);
  desk.setAdmissions('s', false);
  desk.cancel('s', 'e@example.com');
  desk.setAdmissions('s', true);
  assert.equal(join(desk, 'new').status, 'confirmed');
});

test('reopening offers all free seats once and later acceptance cannot create capacity', () => {
  const desk = make(3);
  for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) join(desk, name);
  desk.cancel('s', 'a@example.com'); // d already holds an offer at pause time
  desk.setAdmissions('s', false);
  desk.cancel('s', 'b@example.com');
  desk.cancel('s', 'c@example.com');
  desk.setAdmissions('s', true);
  assert.deepEqual(statuses(desk), [
    ['d@example.com', 'offered'], ['e@example.com', 'offered'],
    ['f@example.com', 'offered'], ['g@example.com', 'waitlisted'],
  ]);
  const before = desk.roster('s');
  desk.setAdmissions('s', true);
  assert.deepEqual(desk.roster('s'), before);
  desk.acceptOffer('s', 'f@example.com');
  desk.acceptOffer('s', 'd@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['d@example.com', 'f@example.com']);
  assert.throws(() => desk.enroll('s', 'new@example.com'), { code: 'FULL' });
  desk.setAdmissions('s', true);
  assert.equal(desk.roster('s').enrollments[3].status, 'waitlisted');
});

test('offer operations preserve error precedence and leave failures atomic', () => {
  const desk = make();
  join(desk, 'a');
  join(desk, 'b');
  for (const operation of ['acceptOffer', 'declineOffer']) {
    const before = desk.roster('s');
    assert.throws(() => desk[operation]('missing', 'bad'), { code: 'NOT_FOUND' });
    assert.throws(() => desk[operation]('s', 'bad'), { code: 'INVALID_EMAIL' });
    assert.throws(() => desk[operation]('s', 'missing@example.com'), { code: 'NOT_ENROLLED' });
    for (const email of [' A@EXAMPLE.COM ', ' B@EXAMPLE.COM ']) {
      assert.throws(() => desk[operation]('s', email), { code: 'NOT_OFFERED' });
    }
    assert.deepEqual(desk.roster('s'), before);
  }
  desk.cancel('s', 'a@example.com');
  desk.acceptOffer('s', 'b@example.com');
  const before = desk.roster('s');
  assert.throws(() => desk.acceptOffer('s', 'b@example.com'), { code: 'NOT_OFFERED' });
  assert.throws(() => desk.declineOffer('s', 'b@example.com'), { code: 'NOT_OFFERED' });
  assert.deepEqual(desk.roster('s'), before);
});
