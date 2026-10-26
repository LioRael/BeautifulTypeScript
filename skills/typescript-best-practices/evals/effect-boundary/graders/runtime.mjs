import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const results=[];
async function group(id, fn) {
 try { await fn(); results.push({id,pass:true}); }
 catch(e) { results.push({id,pass:false,evidence:e instanceof Error ? e.message : String(e)}); }
}
let mod;
try { mod=await import(pathToFileURL(resolve(process.argv[2], 'dist/sensor.js')).href); }
catch(e) { results.push({id:'load',pass:false,evidence:String(e)}); }

if(mod) {

const valid=()=>({sensorId:' rack ',unit:'C',readings:[{atMs:0,value:10}]});
function rejects(value){assert.deepEqual(mod.decodeBatch(value),{ok:false,error:'invalid-batch'});}
await group('shape-and-required-fields',()=>{
 for(const x of [null,[],true,5,'x',{}, {sensorId:'r'}, {...valid(),readings:null}, {...valid(),readings:{}}, {...valid(),readings:[null]}, {...valid(),readings:[[]]}, {...valid(),readings:[{}]}]) rejects(x);
});
await group('id-unit-and-count',()=>{
 for(const sensorId of ['', '   ', 'a'.repeat(33), 3, null]) rejects({...valid(),sensorId});
 for(const unit of ['c','K',null,1]) rejects({...valid(),unit});
 rejects({...valid(),readings:[]});rejects({...valid(),readings:Array.from({length:101},(_,atMs)=>({atMs,value:0}))});
 assert.equal(mod.decodeBatch({...valid(),sensorId:' '+ 'x'.repeat(32)+' ',readings:Array.from({length:100},(_,atMs)=>({atMs,value:0}))}).ok,true);
});
await group('numeric-and-chronological-validation',()=>{
 for(const atMs of [-1,0.5,Number.MAX_SAFE_INTEGER+1,'1',null,NaN,Infinity]) rejects({...valid(),readings:[{atMs,value:0}]});
 for(const value of ['2',null,NaN,Infinity,-Infinity,-80.01,80.01]) rejects({...valid(),readings:[{atMs:0,value}]});
 for(const value of [-112.01,176.01]) rejects({...valid(),unit:'F',readings:[{atMs:0,value}]});
 for(const times of [[1,1],[2,1]]) rejects({...valid(),readings:times.map(atMs=>({atMs,value:0}))});
 rejects({...valid(),readings:[{atMs:0,value:0},{atMs:1,value:'bad'}]});
});
await group('valid-limits-and-conversion',()=>{
 for(const [unit,values] of [['C',[-80,80]],['F',[-112,176]]]){
 const result=mod.decodeBatch({...valid(),unit,readings:values.map((value,i)=>({atMs:i===0?0:Number.MAX_SAFE_INTEGER,value}))});
 assert.equal(result.ok,true);assert.deepEqual(result.batch.readings,[{atMs:0,celsius:-80},{atMs:Number.MAX_SAFE_INTEGER,celsius:80}]);
 }
 const r=mod.decodeBatch({...valid(),unit:'F',readings:[{atMs:0,value:33}]});assert.equal(r.batch.readings[0].celsius,5/9);
 assert.deepEqual(mod.temperatureRange(r.batch),{minimum:5/9,maximum:5/9});
});
await group('normalization-and-input-ownership',()=>{
 const input={...valid(),extra:1,readings:[{atMs:0,value:12,extra:2}]};const before=structuredClone(input);
 const result=mod.decodeBatch(input);assert.equal(result.ok,true);assert.deepEqual(input,before);
 assert.deepEqual(result.batch,{sensorId:'rack',readings:[{atMs:0,celsius:12}]});
 input.readings[0].value=99;input.readings.push({atMs:1,value:1});assert.equal(result.batch.readings.length,1);assert.equal(result.batch.readings[0].celsius,12);
 const frozen=valid();Object.freeze(frozen.readings[0]);Object.freeze(frozen.readings);Object.freeze(frozen);assert.equal(mod.decodeBatch(frozen).ok,true);
});

}
console.log(JSON.stringify(results));
