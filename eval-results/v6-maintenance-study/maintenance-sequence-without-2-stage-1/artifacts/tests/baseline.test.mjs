import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingDesk } from '../dist/desk.js';
import { submitEnrollment, attendanceEmails } from '../dist/portal.js';
const make = () => new TrainingDesk([{ id: 's', title: 'First aid', capacity: 1 }]);
test('portal validates unknown data and normalizes directory identity', () => {
  const desk = make();
  assert.deepEqual(submitEnrollment(desk, null), { ok: false, code: 'BAD_REQUEST' });
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: ' A@EXAMPLE.COM ' }), { ok: true, status: 'confirmed' });
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com']);
  assert.deepEqual(submitEnrollment(desk, { sessionId: 's', email: 'a@example.com' }), { ok: false, code: 'ALREADY_ENROLLED' });
});
test('capacity and cancellation preserve atomic failures', () => {
  const desk = make();
  desk.enroll('s', 'a@example.com');
  assert.throws(() => desk.enroll('s', 'b@example.com'), { code: 'FULL' });
  assert.throws(() => desk.cancel('s', 'b@example.com'), { code: 'NOT_ENROLLED' });
  assert.equal(desk.roster('s').enrollments.length, 1);
  desk.cancel('s', ' A@example.com ');
  assert.equal(desk.enroll('s', 'b@example.com').status, 'confirmed');
});
test('snapshots and seeds have independent ownership', () => {
  const seeds = [{ id: 's', title: 'First aid', capacity: 1 }];
  const desk = new TrainingDesk(seeds);
  seeds[0].capacity = 9;
  const entry = desk.enroll('s', 'a@example.com');
  entry.email = 'changed@example.com';
  const roster = desk.roster('s');
  roster.enrollments[0].email = 'changed@example.com';
  roster.enrollments.length = 0;
  assert.equal(desk.roster('s').capacity, 1);
  assert.deepEqual(attendanceEmails(desk, 's'), ['a@example.com']);
});
test('configuration and domain errors', () => {
  assert.throws(() => new TrainingDesk([{ id: 's', title: 'x', capacity: 0 }]), { code: 'INVALID_SESSION' });
  const desk = make();
  assert.throws(() => desk.enroll('missing', 'bad'), { code: 'NOT_FOUND' });
  assert.throws(() => desk.enroll('s', 'bad'), { code: 'INVALID_EMAIL' });
  assert.deepEqual(desk.roster('s').enrollments, []);
});
