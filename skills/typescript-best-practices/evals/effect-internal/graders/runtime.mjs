import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const results=[];
async function group(id, fn) {
 try { await fn(); results.push({id,pass:true}); }
 catch(e) { results.push({id,pass:false,evidence:e instanceof Error ? e.message : String(e)}); }
}
let mod;
try { mod=await import(pathToFileURL(resolve(process.argv[2], 'dist/plan.js')).href); }
catch(e) { results.push({id:'load',pass:false,evidence:String(e)}); }

if(mod) {

const room=(id,t=10)=>({id,label:id,turnaroundMinutes:t});
const booking=(id,roomId,durationMinutes,status='confirmed')=>({id,roomId,durationMinutes,status,production:'Glasshouse'});
const plan=(rooms,bookings)=>({date:'2026-11-01',rooms,bookings});
await group('room-order-and-unused',()=>{
 assert.deepEqual(mod.roomWorkloads(plan([room('z'),room('a')],[])),[
 {roomId:'z',bookingCount:0,rehearsalMinutes:0,occupiedMinutes:0},
 {roomId:'a',bookingCount:0,rehearsalMinutes:0,occupiedMinutes:0}]);
 assert.deepEqual(mod.roomWorkloads(plan([],[])),[]);
});
await group('status-and-turnaround',()=>{
 const p=plan([room('b',7.5),room('a',0)],[booking('1','b',20),booking('2','a',12),booking('3','b',99,'cancelled'),booking('4','b',30),booking('5','a',88,'tentative'),booking('6','b',10)]);
 assert.deepEqual(mod.roomWorkloads(p),[
 {roomId:'b',bookingCount:3,rehearsalMinutes:60,occupiedMinutes:75},
 {roomId:'a',bookingCount:1,rehearsalMinutes:12,occupiedMinutes:12}]);
});
await group('single-and-unconfirmed-rooms',()=>{
 assert.deepEqual(mod.roomWorkloads(plan([room('one',100),room('none',20)],[booking('x','one',0.5),booking('y','none',9,'tentative')])),[
 {roomId:'one',bookingCount:1,rehearsalMinutes:0.5,occupiedMinutes:0.5},
 {roomId:'none',bookingCount:0,rehearsalMinutes:0,occupiedMinutes:0}]);
});
await group('ownership-and-existing-helpers',()=>{
 const p=plan([room('a')],[booking('x','a',5)]); const before=structuredClone(p);
 for(const a of [...p.rooms,...p.bookings]) Object.freeze(a);
 Object.freeze(p.rooms);Object.freeze(p.bookings);Object.freeze(p);
 assert.deepEqual(mod.deskSummary(p),{date:p.date,roomCount:1,confirmedCount:1,rehearsalMinutes:5});
 assert.equal(mod.roomLabel(p,'a'),'a');
 assert.equal(mod.bookingsForProduction(p,'Glasshouse').length,1);
 mod.roomWorkloads(p); assert.deepEqual(p,before);
});

}
console.log(JSON.stringify(results));
