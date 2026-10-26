import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';

const make = () => new TrainingDesk([{ id: 's', title: 'First aid', capacity: 2 }]);

test('free seats confirm opt-ins; full sessions require explicit opt-in', () => {
  const desk = make();
  assert.equal(desk.enroll('s', 'a@example.com', { waitlist: true }).status, 'confirmed');
  assert.equal(desk.enroll('s', 'b@example.com', { waitlist: false }).status, 'confirmed');
  const before = desk.roster('s');
  for (const options of [undefined, { waitlist: false }]) {
    assert.throws(() => desk.enroll('s', 'c@example.com', options), { code: 'FULL' });
    assert.deepEqual(desk.roster('s'), before);
  }
  assert.deepEqual(desk.enroll('s', ' C@EXAMPLE.COM ', { waitlist: true }), {
    email: 'c@example.com', status: 'waitlisted',
  });
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com', 'b@example.com']);
  for (const email of [' A@EXAMPLE.COM ', ' C@EXAMPLE.COM ']) {
    for (const options of [undefined, { waitlist: true }]) {
      assert.throws(() => desk.enroll('s', email, options), { code: 'ALREADY_ENROLLED' });
    }
  }
  assert.equal(desk.roster('s').enrollments.length, 3);
});

test('cancellation removes waiting employees and offers seats to remaining employees in join order', () => {
  const desk = make();
  for (const name of ['a', 'b', 'c', 'd', 'e']) {
    desk.enroll('s', `${name}@example.com`, { waitlist: true });
  }
  desk.cancel('s', ' C@EXAMPLE.COM ');
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com', 'b@example.com']);
  desk.enroll('s', 'c@example.com', { waitlist: true });
  desk.cancel('s', ' A@EXAMPLE.COM ');
  assert.deepEqual(desk.roster('s').enrollments, [
    { email: 'b@example.com', status: 'confirmed' },
    { email: 'd@example.com', status: 'offered' },
    { email: 'e@example.com', status: 'waitlisted' },
    { email: 'c@example.com', status: 'waitlisted' },
  ]);
  assert.throws(() => desk.enroll('s', 'f@example.com'), { code: 'FULL' });
  desk.cancel('s', 'd@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  desk.cancel('s', 'b@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), []);
  desk.cancel('s', 'e@example.com');
  assert.equal(desk.enroll('s', 'f@example.com').status, 'confirmed');
});

test('waitlist snapshots and desk instances retain independent ownership', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com');
  const entry = desk.enroll('s', 'c@example.com', { waitlist: true });
  const snapshot = desk.roster('s');
  entry.email = 'changed@example.com';
  entry.status = 'confirmed';
  snapshot.enrollments[2].status = 'confirmed';
  snapshot.enrollments.push({ email: 'extra@example.com', status: 'confirmed' });
  const attendance = attendanceEmails(desk, 's');
  attendance.length = 0;
  assert.deepEqual(desk.roster('s').enrollments[2], {
    email: 'c@example.com', status: 'waitlisted',
  });
  desk.cancel('s', 'a@example.com');
  assert.equal(snapshot.enrollments[0].email, 'a@example.com');
  assert.equal(entry.status, 'confirmed');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  assert.equal(desk.roster('s').enrollments.find(entry => entry.email === 'c@example.com').status, 'offered');
  assert.deepEqual(make().roster('s').enrollments, []);
});

test('portal accepts boolean waitlist and returns the resulting enrollment status', () => {
  const desk = make();
  for (const [email, waitlist] of [['a@example.com', true], ['b@example.com', false]]) {
    assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email, waitlist, extra: 1 }), {
      ok: true, status: 'confirmed',
    });
  }
  for (const extra of [{}, { waitlist: false }]) {
    assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'c@example.com', ...extra }), {
      ok: false, code: 'FULL',
    });
  }
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: ' C@EXAMPLE.COM ', waitlist: true }), {
    ok: true, status: 'waitlisted',
  });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'c@example.com', waitlist: true }), {
    ok: false, code: 'ALREADY_ENROLLED',
  });
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com', 'b@example.com']);
  desk.cancel('s', 'a@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  assert.equal(desk.roster('s').enrollments.find(entry => entry.email === 'c@example.com').status, 'offered');
});

test('portal rejects every nonboolean waitlist value before mutating or checking domain data', () => {
  const desk = make();
  for (const waitlist of [undefined, null, 0, 1, '', 'true', [], {}]) {
    for (const sessionId of ['s', 'missing']) {
      assert.deepEqual(submitEnrollment(desk, { sessionId, email: 'a@example.com', waitlist }), {
        ok: false, code: 'BAD_REQUEST',
      });
      assert.deepEqual(desk.roster('s').enrollments, []);
    }
  }
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'a@example.com' }), {
    ok: true, status: 'confirmed',
  });
});

test('waitlist preserves domain error precedence and failed-operation atomicity', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com');
  desk.enroll('s', 'c@example.com', { waitlist: true });
  const before = desk.roster('s');
  assert.throws(() => desk.enroll('missing', 'bad', { waitlist: true }), { code: 'NOT_FOUND' });
  assert.throws(() => desk.enroll('s', 'bad', { waitlist: true }), { code: 'INVALID_EMAIL' });
  assert.throws(() => desk.cancel('missing', 'bad'), { code: 'NOT_FOUND' });
  assert.throws(() => desk.cancel('s', 'bad'), { code: 'INVALID_EMAIL' });
  assert.throws(() => desk.cancel('s', 'absent@example.com'), { code: 'NOT_ENROLLED' });
  assert.deepEqual(desk.roster('s'), before);
  assert.deepEqual(submitEnrollment(desk, { sessionId: 'missing', email: 'bad', waitlist: true }), {
    ok: false, code: 'NOT_FOUND',
  });
  const programmingError = new Error('unexpected');
  assert.throws(() => submitEnrollment({ enroll() { throw programmingError; } }, {
    sessionId: 's', email: 'a@example.com', waitlist: true,
  }), error => error === programmingError);
});
