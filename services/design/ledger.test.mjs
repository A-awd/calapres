import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Ledger } from './ledger.mjs';
test('refresh, repeat clicks, nine designs, and lifetime budget survive restart',()=>{
  const dir=mkdtempSync(join(tmpdir(),'calapres-design-test-')),path=join(dir,'ledger.sqlite');
  let ledger=new Ledger(path,{budgetMicros:400,batchReserveMicros:100});
  try{
    const token=ledger.session('').token;
    const first=ledger.begin(token,'عبدالرحمن');
    assert.equal(ledger.begin(token,'اسم آخر').created,false);
    assert.equal(ledger.session(token).remaining,6);
    ledger.add(first.job,{id:'original',url:'https://example.test/design.png',receipt:'signed',version:'1'});
    ledger.finish(first.job.id);
    for(let i=0;i<2;i++){const next=ledger.begin(token,'عبدالرحمن');ledger.finish(next.job.id);}
    assert.throws(()=>ledger.begin(token,'اسم جديد'),/LIMIT_REACHED/);
    ledger.close();ledger=new Ledger(path,{budgetMicros:400,batchReserveMicros:100});
    assert.equal(ledger.session(token).remaining,0);
    assert.equal(ledger.session(token).designs[0].id,'original');
    const other=ledger.session('').token,job=ledger.begin(other,'سارة');ledger.finish(job.job.id,'failed');
    assert.throws(()=>ledger.begin(other,'سارة'),/BUDGET_REACHED/);
  }finally{ledger.close();rmSync(dir,{recursive:true,force:true});}
});
test('zero budget never authorizes generation',()=>{
  const ledger=new Ledger(':memory:');try{assert.throws(()=>ledger.begin(ledger.session('').token,'محمد'),/BUDGET_DISABLED/);}finally{ledger.close();}
});
