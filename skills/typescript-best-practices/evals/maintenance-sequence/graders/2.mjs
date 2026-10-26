import { assert, load, grade, factory, email, join, statuses, code } from './helper.mjs';
let api, importError;
try { api = await load(process.argv[2]); } catch (error) { importError = error; }
const fresh = capacity => { if (importError) throw importError; return factory(api.TrainingDesk, capacity); };
await grade([
  ['pause_boundary_and_precedence', () => {
    const d = fresh(); assert.equal(d.roster('s').admissionsOpen, true);
    join(d, 'a'); d.setAdmissions('s', false);
    code(() => d.enroll('s', 'bad'), 'ADMISSIONS_CLOSED');
    code(() => join(d, 'a'), 'ADMISSIONS_CLOSED');
    code(() => join(d, 'b'), 'ADMISSIONS_CLOSED');
    assert.deepEqual(api.submitEnrollment(d, { sessionId: 's', email: email('b'), waitlist: true }), { ok: false, code: 'ADMISSIONS_CLOSED' });
    code(() => d.setAdmissions('unknown', true), 'NOT_FOUND');
    assert.equal(d.roster('s').enrollments.length, 1);
  }],
  ['paused_cancellation_and_fifo_reopen', () => {
    const d = fresh(2); for (const n of ['a','b','c','d','e']) join(d,n);
    d.setAdmissions('s', false); d.cancel('s', email('a')); d.cancel('s', email('b'));
    d.cancel('s', email('d'));
    assert.deepEqual(api.attendanceEmails(d, 's'), []);
    assert.deepEqual(statuses(d), { [email('c')]: 'waitlisted', [email('e')]: 'waitlisted' });
    d.setAdmissions('s', true);
    assert.deepEqual(api.attendanceEmails(d, 's'), [email('c'), email('e')]);
    assert.equal(join(d, 'f').status, 'waitlisted');
    d.setAdmissions('s', true);
    assert.deepEqual(api.attendanceEmails(d, 's'), [email('c'), email('e')]);
  }],
  ['isolation_and_roster_ownership', () => {
    const d = fresh(); d.setAdmissions('s', false);
    assert.equal(d.roster('t').admissionsOpen, true);
    assert.equal(d.enroll('t', email('a')).status, 'confirmed');
    const r = d.roster('s'); r.admissionsOpen = true;
    assert.equal(d.roster('s').admissionsOpen, false);
    d.setAdmissions('s', false);
    code(() => join(d, 'a'), 'ADMISSIONS_CLOSED');
    d.setAdmissions('s', true); assert.equal(join(d, 'a').status, 'confirmed');
  }],
  ['open_waitlist_and_current_callers', () => {
    const d = fresh(); join(d,'a'); join(d,'b'); join(d,'c');
    assert.deepEqual(api.submitEnrollment(d, { sessionId:'s', email:email('x') }), { ok:false, code:'FULL' });
    assert.deepEqual(api.submitEnrollment(d, { sessionId:'s', email:email('x'), waitlist:'yes' }), { ok:false, code:'BAD_REQUEST' });
    d.cancel('s', email('a'));
    assert.deepEqual(api.attendanceEmails(d,'s'), [email('b')]);
    code(() => d.enroll('s', ' C@EXAMPLE.COM ', { waitlist:true }), 'ALREADY_ENROLLED');
    code(() => d.cancel('s', email('absent')), 'NOT_ENROLLED');
    code(() => d.enroll('missing', 'bad'), 'NOT_FOUND');
    assert.deepEqual(statuses(d), { [email('b')]:'confirmed', [email('c')]:'waitlisted' });
  }],
]);
