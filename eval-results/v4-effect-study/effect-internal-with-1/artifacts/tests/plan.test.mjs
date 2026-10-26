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

test('room workloads count confirmed bookings in room display order without mutating the plan', () => {
 const plan = {date:'2026-11-01',rooms:[
 {id:'z',label:'Main',turnaroundMinutes:7.5},
 {id:'unused',label:'Spare',turnaroundMinutes:15},
 {id:'single',label:'Solo',turnaroundMinutes:20},
 {id:'zero',label:'Open',turnaroundMinutes:0}],bookings:[
 {id:'a',roomId:'single',production:'Orchard',durationMinutes:12.5,status:'confirmed'},
 {id:'b',roomId:'z',production:'Orchard',durationMinutes:30,status:'confirmed'},
 {id:'c',roomId:'z',production:'Orchard',durationMinutes:90,status:'tentative'},
 {id:'d',roomId:'zero',production:'Orchard',durationMinutes:10,status:'confirmed'},
 {id:'e',roomId:'z',production:'Orchard',durationMinutes:45.5,status:'confirmed'},
 {id:'f',roomId:'unused',production:'Orchard',durationMinutes:80,status:'cancelled'},
 {id:'g',roomId:'z',production:'Orchard',durationMinutes:15,status:'confirmed'},
 {id:'h',roomId:'zero',production:'Orchard',durationMinutes:20,status:'confirmed'}]};
 const original = structuredClone(plan);
 for (const room of plan.rooms) Object.freeze(room);
 for (const booking of plan.bookings) Object.freeze(booking);
 Object.freeze(plan.rooms);
 Object.freeze(plan.bookings);
 Object.freeze(plan);
 const expected = [
 {roomId:'z',bookingCount:3,rehearsalMinutes:90.5,occupiedMinutes:105.5},
 {roomId:'unused',bookingCount:0,rehearsalMinutes:0,occupiedMinutes:0},
 {roomId:'single',bookingCount:1,rehearsalMinutes:12.5,occupiedMinutes:12.5},
 {roomId:'zero',bookingCount:2,rehearsalMinutes:30,occupiedMinutes:30}];
 assert.deepEqual(roomWorkloads(plan), expected);
 assert.deepEqual(roomWorkloads({...plan, bookings:[...plan.bookings].reverse()}), expected);
 assert.deepEqual(plan, original);
});

test('room workloads include empty rooms and handle an empty plan', () => {
 assert.deepEqual(roomWorkloads({date:'2026-11-01',rooms:[],bookings:[]}), []);
 assert.deepEqual(roomWorkloads({date:'2026-11-01',rooms:[
 {id:'r',label:'Studio',turnaroundMinutes:10}],bookings:[]}), [
 {roomId:'r',bookingCount:0,rehearsalMinutes:0,occupiedMinutes:0}]);
});
