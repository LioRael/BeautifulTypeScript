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

test('room workloads preserve room order and count only confirmed bookings', () => {
  const plan = {
    date: '2026-11-01',
    rooms: [
      { id: 'b', label: 'Main', turnaroundMinutes: 10 },
      { id: 'unused', label: 'Spare', turnaroundMinutes: 15 },
      { id: 'a', label: 'Studio', turnaroundMinutes: 0 },
      { id: 'solo', label: 'Small', turnaroundMinutes: 20 },
    ],
    bookings: [
      { id: '1', roomId: 'a', production: 'Orchard', durationMinutes: 12.5, status: 'confirmed' },
      { id: '2', roomId: 'b', production: 'Orchard', durationMinutes: 30, status: 'confirmed' },
      { id: '3', roomId: 'unused', production: 'Orchard', durationMinutes: 90, status: 'tentative' },
      { id: '4', roomId: 'b', production: 'Orchard', durationMinutes: 100, status: 'cancelled' },
      { id: '5', roomId: 'b', production: 'Orchard', durationMinutes: 45, status: 'confirmed' },
      { id: '6', roomId: 'a', production: 'Orchard', durationMinutes: 20, status: 'confirmed' },
      { id: '7', roomId: 'solo', production: 'Orchard', durationMinutes: 15, status: 'confirmed' },
      { id: '8', roomId: 'b', production: 'Orchard', durationMinutes: 15, status: 'confirmed' },
    ],
  };
  const original = structuredClone(plan);
  for (const room of plan.rooms) Object.freeze(room);
  for (const booking of plan.bookings) Object.freeze(booking);
  Object.freeze(plan.rooms);
  Object.freeze(plan.bookings);
  Object.freeze(plan);

  assert.deepEqual(roomWorkloads(plan), [
    { roomId: 'b', bookingCount: 3, rehearsalMinutes: 90, occupiedMinutes: 110 },
    { roomId: 'unused', bookingCount: 0, rehearsalMinutes: 0, occupiedMinutes: 0 },
    { roomId: 'a', bookingCount: 2, rehearsalMinutes: 32.5, occupiedMinutes: 32.5 },
    { roomId: 'solo', bookingCount: 1, rehearsalMinutes: 15, occupiedMinutes: 15 },
  ]);
  assert.deepEqual(plan, original);
});

test('room workloads handle empty day plans', () => {
  assert.deepEqual(roomWorkloads({ date: '2026-11-01', rooms: [], bookings: [] }), []);
  assert.deepEqual(roomWorkloads({
    date: '2026-11-01',
    rooms: [{ id: 'r', label: 'Studio', turnaroundMinutes: 10 }],
    bookings: [],
  }), [{ roomId: 'r', bookingCount: 0, rehearsalMinutes: 0, occupiedMinutes: 0 }]);
});
