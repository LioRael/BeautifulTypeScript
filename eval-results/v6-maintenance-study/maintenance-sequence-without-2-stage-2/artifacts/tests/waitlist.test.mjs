import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';

const make = () => new TrainingDesk([{ id: 's', title: 'First aid', capacity: 1 }]);

test('opt-in confirms free seats and queues full sessions in join order', () => {
  const desk = make();
  assert.equal(desk.enroll('s', ' A@EXAMPLE.COM ', { waitlist: true }).status, 'confirmed');
  assert.throws(() => desk.enroll('s', 'b@example.com'), { code: 'FULL' });
  assert.throws(() => desk.enroll('s', 'b@example.com', { waitlist: false }), { code: 'FULL' });
  assert.deepEqual(desk.enroll('s', ' B@EXAMPLE.COM ', { waitlist: true }), {
    email: 'b@example.com', status: 'waitlisted',
  });
  desk.enroll('s', 'c@example.com', { waitlist: true });
  for (const email of [' A@example.com ', ' B@example.com ']) {
    assert.throws(() => desk.enroll('s', email, { waitlist: true }), { code: 'ALREADY_ENROLLED' });
    assert.throws(() => desk.enroll('s', email), { code: 'ALREADY_ENROLLED' });
  }
  assert.deepEqual(desk.roster('s').enrollments.map(e => e.status), ['confirmed', 'waitlisted', 'waitlisted']);
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com']);
  desk.cancel('s', ' A@example.com ');
  assert.deepEqual(desk.roster('s').enrollments, [
    { email: 'b@example.com', status: 'confirmed' },
    { email: 'c@example.com', status: 'waitlisted' },
  ]);
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  desk.cancel('s', 'b@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com']);
});

test('cancelling a waiting employee removes them and rejoining goes to the end', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  desk.enroll('s', 'b@example.com', { waitlist: true });
  desk.enroll('s', 'c@example.com', { waitlist: true });
  desk.cancel('s', ' B@EXAMPLE.COM ');
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com']);
  desk.enroll('s', 'b@example.com', { waitlist: true });
  desk.cancel('s', 'a@example.com');
  assert.deepEqual(desk.roster('s').enrollments, [
    { email: 'c@example.com', status: 'confirmed' },
    { email: 'b@example.com', status: 'waitlisted' },
  ]);
});

test('portal validates optional waitlist before mutation and returns actual status', () => {
  const desk = make();
  const input = { sessionId: 's', email: 'a@example.com' };
  for (const waitlist of [undefined, null, 0, 1, 'true', [], {}]) {
    assert.deepEqual(submitEnrollment(desk, { ...input, waitlist }), { ok: false, code: 'BAD_REQUEST' });
    assert.deepEqual(desk.roster('s').enrollments, []);
  }
  assert.deepEqual(submitEnrollment(desk, { ...input, waitlist: true, extra: 1 }), { ok: true, status: 'confirmed' });
  const waiting = { sessionId: 's', email: ' B@EXAMPLE.COM ' };
  assert.deepEqual(submitEnrollment(desk, { ...waiting, waitlist: false }), { ok: false, code: 'FULL' });
  assert.deepEqual(submitEnrollment(desk, { ...waiting, waitlist: true }), { ok: true, status: 'waitlisted' });
  assert.deepEqual(submitEnrollment(desk, waiting), { ok: false, code: 'ALREADY_ENROLLED' });
});

test('waitlist snapshots, failures and desk instances preserve ownership', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  const waiting = desk.enroll('s', 'b@example.com', { waitlist: true });
  const roster = desk.roster('s');
  waiting.status = 'confirmed';
  roster.enrollments[1].email = 'changed@example.com';
  roster.enrollments[1].status = 'confirmed';
  const before = desk.roster('s');
  assert.throws(() => desk.cancel('s', 'missing@example.com'), { code: 'NOT_ENROLLED' });
  assert.throws(() => desk.enroll('missing', 'bad', { waitlist: true }), { code: 'NOT_FOUND' });
  assert.throws(() => desk.enroll('s', 'bad', { waitlist: true }), { code: 'INVALID_EMAIL' });
  assert.deepEqual(desk.roster('s'), before);
  assert.deepEqual(make().roster('s').enrollments, []);
  desk.cancel('s', 'a@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['b@example.com']);
  assert.deepEqual(roster.enrollments.map(e => e.email), ['a@example.com', 'changed@example.com']);
});

test('multiple confirmed seats promote one waiter per cancellation', () => {
  const desk = new TrainingDesk([{ id: 's', title: 'First aid', capacity: 2 }]);
  for (const email of ['a@example.com', 'b@example.com', 'c@example.com', 'd@example.com']) {
    desk.enroll('s', email, { waitlist: true });
  }
  desk.cancel('s', 'b@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com', 'c@example.com']);
  assert.equal(desk.roster('s').enrollments.at(-1).status, 'waitlisted');
  desk.cancel('s', 'a@example.com');
  assert.deepEqual(attendanceEmails(desk, 's'), ['c@example.com', 'd@example.com']);
});
