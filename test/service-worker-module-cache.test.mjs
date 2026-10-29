import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('offline shell includes every local static and dynamic module dependency with its exact query',()=>{
  const root=new URL('../',import.meta.url);
  const sw=readFileSync(new URL('sw.js',root),'utf8');
  const list=sw.match(/const SHELL_ASSETS = \[([\s\S]*?)\];/)[1];
  const assets=[...list.matchAll(/"([^"\n]+)"/g)].map(m=>new URL(m[1],root));
  const cached=new Set(assets.map(u=>u.href));
  for(const entry of assets.filter(u=>u.pathname.endsWith('.js'))){
    const source=readFileSync(new URL(entry.pathname,'file://'),'utf8');
    const imports=[...source.matchAll(/(?:\bfrom\s*|\bimport\s*\()\s*["'](\.[^"']+)["']/g)];
    for(const match of imports){
      const dependency=new URL(match[1],entry);
      assert.ok(cached.has(dependency.href),`${entry.pathname.split('/').pop()} imports uncached ${match[1]}`);
    }
  }
});
