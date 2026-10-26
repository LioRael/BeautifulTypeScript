import test from 'node:test';
import assert from 'node:assert/strict';
import { deskSummary, roomLabel, roomWorkloads } from '../dist/plan.js';
test('desk summary counts only confirmed rehearsal minutes', () => {
 const plan = {date:'2026-11-01',rooms:[{id:'r',label:'Studio',turnaroundMinutes:10}],bookings:[
 {id:'a',roomId:'r',production:'Orchard',durationMinutes:30,status:'confirmed'},
 {id:'b',roomId:'r',production:'Orchard',durationMinutes:90,status:'tentative'}]};
 assert.deepEqual(deskSummary(plan),{date:plan.date,roomCount:1,confirmedCount:1,rehearsalMinutes:30});
 assert.equal(roomLabel(plan,'r'),'Studio');
 assert.equal(roomLabel(plan,'missing'),undefined);
});

test('room workloads preserve room order and include only confirmed bookings', () => {
 const plan = {date:'2026-11-01',rooms:[
  {id:'unused',label:'Unused',turnaroundMinutes:20},
  {id:'b',label:'B',turnaroundMinutes:7.5},
  {id:'a',label:'A',turnaroundMinutes:15},
  {id:'zero',label:'Zero',turnaroundMinutes:0},
 ],bookings:[
  {id:'1',roomId:'a',production:'Orchard',durationMinutes:30,status:'confirmed'},
  {id:'2',roomId:'b',production:'Orchard',durationMinutes:20.5,status:'confirmed'},
  {id:'3',roomId:'unused',production:'Orchard',durationMinutes:90,status:'tentative'},
  {id:'4',roomId:'b',production:'Orchard',durationMinutes:40,status:'confirmed'},
  {id:'5',roomId:'b',production:'Orchard',durationMinutes:100,status:'cancelled'},
  {id:'6',roomId:'b',production:'Orchard',durationMinutes:10,status:'confirmed'},
  {id:'7',roomId:'zero',production:'Orchard',durationMinutes:5,status:'confirmed'},
  {id:'8',roomId:'zero',production:'Orchard',durationMinutes:10,status:'confirmed'},
 ]};
 const original = structuredClone(plan);
 for (const item of [...plan.rooms, ...plan.bookings]) Object.freeze(item);
 Object.freeze(plan.rooms);
 Object.freeze(plan.bookings);
 Object.freeze(plan);
 const expected = [
  {roomId:'unused',bookingCount:0,rehearsalMinutes:0,occupiedMinutes:0},
  {roomId:'b',bookingCount:3,rehearsalMinutes:70.5,occupiedMinutes:85.5},
  {roomId:'a',bookingCount:1,rehearsalMinutes:30,occupiedMinutes:30},
  {roomId:'zero',bookingCount:2,rehearsalMinutes:15,occupiedMinutes:15},
 ];
 assert.deepEqual(roomWorkloads(plan), expected);
 assert.deepEqual(roomWorkloads({...plan, bookings:[...plan.bookings].reverse()}), expected);
 assert.deepEqual(plan, original);
});

test('room workloads handle empty plans and rooms with no bookings', () => {
 assert.deepEqual(roomWorkloads({date:'2026-11-01',rooms:[],bookings:[]}), []);
 assert.deepEqual(roomWorkloads({date:'2026-11-01',rooms:[
  {id:'r',label:'Studio',turnaroundMinutes:10},
 ],bookings:[]}), [
  {roomId:'r',bookingCount:0,rehearsalMinutes:0,occupiedMinutes:0},
 ]);
});
