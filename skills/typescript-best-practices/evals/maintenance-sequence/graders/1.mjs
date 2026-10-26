import { assert, load, grade, factory, email, join, statuses, code } from './helper.mjs';
let api, importError;
try { api = await load(process.argv[2]); } catch (error) { importError = error; }
const fresh = capacity => { if (importError) throw importError; return factory(api.TrainingDesk, capacity); };
await grade([
  ['opt_in_and_default', () => {
    const d = fresh();
    assert.equal(join(d, 'a').status, 'confirmed');
    code(() => d.enroll('s', email('b')), 'FULL');
    assert.equal(join(d, 'b').status, 'waitlisted');
    assert.equal(d.roster('s').enrollments.length, 2);
    code(() => join(d, 'b'), 'ALREADY_ENROLLED');
  }],
  ['fifo_cancellation', () => {
    const d = fresh();
    for (const n of ['a', 'b', 'c', 'd']) join(d, n);
    d.cancel('s', email('c'));
    d.cancel('s', email('a'));
    assert.deepEqual(statuses(d), { [email('b')]: 'confirmed', [email('d')]: 'waitlisted' });
    d.cancel('s', email('b'));
    assert.deepEqual(api.attendanceEmails(d, 's'), [email('d')]);
  }],
  ['portal_and_attendance', () => {
    const d = fresh();
    api.submitEnrollment(d, { sessionId: 's', email: email('a') });
    for (const waitlist of [null, 'true', 1, {}]) {
      assert.deepEqual(api.submitEnrollment(d, { sessionId: 's', email: email('b'), waitlist }), { ok: false, code: 'BAD_REQUEST' });
    }
    assert.deepEqual(api.submitEnrollment(d, { sessionId: 's', email: ' B@EXAMPLE.COM ', waitlist: true }), { ok: true, status: 'waitlisted' });
    assert.deepEqual(api.attendanceEmails(d, 's'), [email('a')]);
    assert.deepEqual(api.submitEnrollment(d, { sessionId: 't', email: email('x'), waitlist: false }), { ok: true, status: 'confirmed' });
  }],
  ['identity_errors_and_isolation', () => {
    const d = fresh(); join(d, 'a'); join(d, 'b');
    code(() => d.enroll('s', ' B@EXAMPLE.COM ', { waitlist: true }), 'ALREADY_ENROLLED');
    code(() => d.cancel('missing', 'bad'), 'NOT_FOUND');
    code(() => d.enroll('s', 'bad', { waitlist: true }), 'INVALID_EMAIL');
    code(() => d.cancel('s', email('absent')), 'NOT_ENROLLED');
    assert.deepEqual(d.roster('t').enrollments, []);
    assert.equal(d.roster('s').enrollments.length, 2);
  }],
  ['snapshot_ownership', () => {
    const d = fresh(); join(d, 'a'); const entry = join(d, 'b');
    entry.email = email('corrupted'); entry.status = 'confirmed';
    const roster = d.roster('s'); roster.enrollments[1].email = email('corrupted'); roster.enrollments.splice(0);
    const attendance = api.attendanceEmails(d, 's'); attendance.push(email('corrupted'));
    d.cancel('s', email('a'));
    assert.deepEqual(api.attendanceEmails(d, 's'), [email('b')]);
  }],
]);
