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

test('room workloads preserve room order and count only confirmed bookings and their gaps', () => {
 const plan = {date:'2026-11-01',rooms:[
  {id:'unused',label:'Unused',turnaroundMinutes:20},
  {id:'b',label:'B',turnaroundMinutes:7.5},
  {id:'a',label:'A',turnaroundMinutes:10},
  {id:'zero',label:'Zero',turnaroundMinutes:0},
 ],bookings:[
  {id:'1',roomId:'a',production:'Orchard',durationMinutes:30,status:'confirmed'},
  {id:'2',roomId:'b',production:'Orchard',durationMinutes:12.5,status:'confirmed'},
  {id:'3',roomId:'a',production:'Orchard',durationMinutes:90,status:'tentative'},
  {id:'4',roomId:'unused',production:'Orchard',durationMinutes:90,status:'cancelled'},
  {id:'5',roomId:'a',production:'Orchard',durationMinutes:45,status:'confirmed'},
  {id:'6',roomId:'a',production:'Orchard',durationMinutes:15,status:'confirmed'},
  {id:'7',roomId:'zero',production:'Orchard',durationMinutes:10,status:'confirmed'},
  {id:'8',roomId:'zero',production:'Orchard',durationMinutes:20,status:'confirmed'},
 ]};
 const before = structuredClone(plan);
 for (const item of [...plan.rooms, ...plan.bookings]) Object.freeze(item);
 Object.freeze(plan.rooms);
 Object.freeze(plan.bookings);
 Object.freeze(plan);
 const expected = [
  {roomId:'unused',bookingCount:0,rehearsalMinutes:0,occupiedMinutes:0},
  {roomId:'b',bookingCount:1,rehearsalMinutes:12.5,occupiedMinutes:12.5},
  {roomId:'a',bookingCount:3,rehearsalMinutes:90,occupiedMinutes:110},
  {roomId:'zero',bookingCount:2,rehearsalMinutes:30,occupiedMinutes:30},
 ];
 assert.deepEqual(roomWorkloads(plan), expected);
 assert.deepEqual(plan, before);
 assert.deepEqual(roomWorkloads({...plan, bookings:[...plan.bookings].reverse()}), expected);
});

test('room workloads include rooms in an empty day and handle no configured rooms', () => {
 assert.deepEqual(roomWorkloads({date:'2026-11-01',rooms:[],bookings:[]}), []);
 assert.deepEqual(roomWorkloads({date:'2026-11-01',rooms:[
  {id:'r',label:'Studio',turnaroundMinutes:10},
 ],bookings:[]}), [
  {roomId:'r',bookingCount:0,rehearsalMinutes:0,occupiedMinutes:0},
 ]);
});
