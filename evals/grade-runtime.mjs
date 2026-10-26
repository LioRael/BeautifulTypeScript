import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const [kind, workspace] = process.argv.slice(2);
const results = [];
function check(id, fn) { try { fn(); results.push({ id, pass: true }); } catch (e) { results.push({ id, pass: false, evidence: String(e.message) }); } }
async function checkAsync(id, fn) { try { await fn(); results.push({ id, pass: true }); } catch (e) { results.push({ id, pass: false, evidence: String(e.message) }); } }
try {
  execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '-p', resolve(workspace, 'tsconfig.json')], { cwd: workspace, stdio: 'pipe' });
  const mod = await import(pathToFileURL(resolve(workspace, `dist/${kind === 'write' ? 'settings' : 'ledger'}.js`)));
  if (kind === 'write') {
    const { parseSettings: parse, loadSettings: load } = mod;
    check('W1', () => { const input=Object.freeze({endpoint:'/x', extra:1}); const out=parse(input); assert.deepEqual(out,{endpoint:'/x', retries:3, enabled:true}); assert.notEqual(out,input); });
    check('W2', () => assert.deepEqual(parse({endpoint:' /x ', retries:0, enabled:false}),{endpoint:' /x ', retries:0, enabled:false}));
    check('W3', () => { for (const v of [null,[],{}, {endpoint:''},{endpoint:2}]) assert.throws(()=>parse(v),TypeError); });
    check('W4', () => { for (const retries of [null,'2',0.5,-1,6]) assert.throws(()=>parse({endpoint:'/x',retries}),e=>e instanceof TypeError && /retries/.test(e.message)); });
    check('W5', () => { for (const enabled of [null,0,'false']) assert.throws(()=>parse({endpoint:'/x',enabled}),e=>e instanceof TypeError && /enabled/.test(e.message)); assert.throws(()=>parse({endpoint:4}),e=>e instanceof TypeError && /endpoint/.test(e.message)); });
    await checkAsync('W6', async () => { let calls=0; assert.deepEqual(await load(async()=>{calls++;return '{"endpoint":"/x","retries":0}';}),{endpoint:'/x',retries:0,enabled:true});assert.equal(calls,1);const err=new Error('reader');await assert.rejects(()=>load(async()=>{throw err;}),e=>e===err);await assert.rejects(()=>load(async()=>'{'),SyntaxError);await assert.rejects(()=>load(async()=>'[]'),TypeError); });
  } else {
    const f=mod.summarize;
    check('P1',()=>{assert.deepEqual(f([]),[]);assert.deepEqual(f([{key:'a',amount:'2',priority:5},{key:'a',amount:'-1',priority:0}]),[{key:'a',total:'1',priority:5}]);});
    check('P2',()=>assert.deepEqual(f([{key:'x',amount:'9007199254740993123456789'},{key:'x',amount:'+00002'},{key:'x',amount:'-1'}]),[{key:'x',total:'9007199254740993123456790',priority:100}]));
    check('P3',()=>{const keys=['10','2','__proto__','constructor',''];assert.deepEqual(f(keys.map(key=>({key,amount:'1'}))).map(x=>x.key),keys);});
    check('P4',()=>assert.deepEqual(f([{key:'a',amount:'1',priority:null},{key:'b',amount:'1',priority:0},{key:'c',amount:'1',priority:-1}]).map(x=>[x.key,x.priority]),[['c',-1],['b',0],['a',100]]));
    check('P5',()=>{const cases=[[null,'rows'],[[null],'key'],[[{key:'a',amount:'1\n'}],'amount'],[[{key:'a',amount:'１２'}],'amount'],[[{key:'a',amount:'1',priority:true}],'priority'],[[{key:'a',amount:'1',priority:1001}],'priority'],[[{key:'a',amount:1}],'amount']];for(const [input,code] of cases) assert.throws(()=>f(input),e=>e.message===code);});
    check('P6-runtime',()=>{const row=Object.freeze({key:'a',amount:'2'});const rows=Object.freeze([row,row]);assert.deepEqual(f(rows),[{key:'a',total:'4',priority:100}]);});
  }
} catch (e) { results.push({ id:'compile-or-import',pass:false,evidence:String(e.stderr||e.message) }); }
console.log(JSON.stringify(results,null,2));
