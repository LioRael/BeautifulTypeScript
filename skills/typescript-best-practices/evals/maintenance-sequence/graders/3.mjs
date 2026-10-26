import { assert, load, grade, factory, email, join, statuses, code } from './helper.mjs';
let api, importError;
try { api = await load(process.argv[2]); } catch (error) { importError = error; }
const fresh = capacity => { if (importError) throw importError; return factory(api.TrainingDesk, capacity); };
const offered = () => { const d = fresh(); for (const n of ['a','b','c']) join(d,n); d.cancel('s',email('a')); return d; };
await grade([
  ['offer_replaces_automatic_confirmation', () => {
    const d = offered();
    assert.deepEqual(statuses(d), { [email('b')]:'offered', [email('c')]:'waitlisted' });
    assert.deepEqual(api.attendanceEmails(d,'s'), []);
    code(() => d.enroll('s',email('new')), 'FULL');
    assert.deepEqual(api.submitEnrollment(d, {sessionId:'s',email:email('new'),waitlist:true}), {ok:true,status:'waitlisted'});
    assert.deepEqual(api.attendanceEmails(d,'s'), []);
  }],
  ['acceptance_and_ownership', () => {
    const d = offered(); d.setAdmissions('s',false);
    const result = d.acceptOffer('s',' B@EXAMPLE.COM ');
    assert.equal(result.status,'confirmed'); assert.equal(result.email,email('b'));
    result.email = email('corrupted');
    const r = d.roster('s'); r.enrollments[0].status = 'waitlisted';
    assert.deepEqual(api.attendanceEmails(d,'s'), [email('b')]);
    code(() => d.acceptOffer('s',email('b')), 'NOT_OFFERED');
    code(() => d.acceptOffer('s',email('c')), 'NOT_OFFERED');
    assert.equal(d.roster('s').admissionsOpen,false);
  }],
  ['decline_and_cancel_release_reservations', () => {
    const d = offered(); join(d,'d');
    d.declineOffer('s',' B@EXAMPLE.COM ');
    assert.deepEqual(statuses(d), { [email('c')]:'offered', [email('d')]:'waitlisted' });
    d.cancel('s',email('c'));
    assert.deepEqual(statuses(d), { [email('d')]:'offered' });
    assert.deepEqual(api.attendanceEmails(d,'s'), []);
    d.declineOffer('s',email('d'));
    assert.equal(join(d,'e').status,'confirmed');
    assert.deepEqual(d.roster('t').enrollments,[]);
  }],
  ['pause_reopen_reservations_and_fifo', () => {
    const d = fresh(2); for (const n of ['a','b','c','d','e']) join(d,n);
    d.cancel('s',email('a')); d.setAdmissions('s',false);
    d.declineOffer('s',email('c')); d.cancel('s',email('b'));
    assert.deepEqual(statuses(d),{ [email('d')]:'waitlisted', [email('e')]:'waitlisted' });
    code(() => join(d,'x'),'ADMISSIONS_CLOSED');
    d.setAdmissions('s',true); d.setAdmissions('s',true);
    assert.deepEqual(statuses(d),{ [email('d')]:'offered', [email('e')]:'offered' });
    assert.equal(join(d,'f').status,'waitlisted');
    assert.deepEqual(api.attendanceEmails(d,'s'),[]);
    d.acceptOffer('s',email('e'));
    assert.deepEqual(api.attendanceEmails(d,'s'),[email('e')]);
    d.setAdmissions('s',false); d.setAdmissions('s',true);
    assert.deepEqual(statuses(d),{ [email('d')]:'offered', [email('e')]:'confirmed', [email('f')]:'waitlisted' });
  }],
  ['offer_errors_are_atomic_and_normalized', () => {
    const d = offered();
    for (const method of ['acceptOffer','declineOffer']) {
      code(() => d[method]('missing','bad'),'NOT_FOUND');
      code(() => d[method]('s','bad'),'INVALID_EMAIL');
      code(() => d[method]('s',email('absent')),'NOT_ENROLLED');
      code(() => d[method]('s',email('c')),'NOT_OFFERED');
    }
    code(() => d.enroll('s',' B@EXAMPLE.COM ',{waitlist:true}),'ALREADY_ENROLLED');
    assert.deepEqual(statuses(d),{ [email('b')]:'offered', [email('c')]:'waitlisted' });
    assert.deepEqual(api.submitEnrollment(d,{sessionId:'s',email:email('x'),waitlist:0}),{ok:false,code:'BAD_REQUEST'});
  }],
]);
