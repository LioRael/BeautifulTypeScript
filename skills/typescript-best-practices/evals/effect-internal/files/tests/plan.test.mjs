import test from 'node:test';
import assert from 'node:assert/strict';
import { deskSummary, roomLabel } from '../dist/plan.js';
test('desk summary counts only confirmed rehearsal minutes', () => {
 const plan = {date:'2026-11-01',rooms:[{id:'r',label:'Studio',turnaroundMinutes:10}],bookings:[
 {id:'a',roomId:'r',production:'Orchard',durationMinutes:30,status:'confirmed'},
 {id:'b',roomId:'r',production:'Orchard',durationMinutes:90,status:'tentative'}]};
 assert.deepEqual(deskSummary(plan),{date:plan.date,roomCount:1,confirmedCount:1,rehearsalMinutes:30});
 assert.equal(roomLabel(plan,'r'),'Studio');
 assert.equal(roomLabel(plan,'missing'),undefined);
});
