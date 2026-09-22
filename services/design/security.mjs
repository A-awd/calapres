import { createHmac, timingSafeEqual } from 'node:crypto';

const equal = (a,b) => typeof a==='string' && typeof b==='string' && a.length===b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function proxySignature(params, secret) {
  const keys=[...new Set(params.keys())].filter(k=>k!=='signature');
  const message=keys.map(k=>`${k}=${params.getAll(k).join(',')}`).sort().join('');
  return createHmac('sha256',secret).update(message).digest('hex');
}
export function authenticateProxy(url,{shop,secret,prefix='/apps/calapres-design',now=Date.now()}) {
  const q=url.searchParams;
  for(const k of ['shop','timestamp','path_prefix','signature']) if(q.getAll(k).length!==1) throw Error('UNAUTHORIZED');
  if(!secret || q.get('shop')!==shop || q.get('path_prefix')!==prefix || !/^\d+$/.test(q.get('timestamp')) || Math.abs(now/1000-Number(q.get('timestamp')))>300 || !equal(proxySignature(q,secret),q.get('signature'))) throw Error('UNAUTHORIZED');
}
export function normalizeName(value) {
  if(typeof value!=='string')throw Error('INVALID_NAME');
  const name=value.normalize('NFC').trim().replace(/\s+/g,' ');
  if(!/^[\u0621-\u063A\u0641-\u064A]+(?: [\u0621-\u063A\u0641-\u064A]+)*$/u.test(name)||[...name].length>40)throw Error('INVALID_NAME');
  return name;
}
export function signReceipt(value,secret){return createHmac('sha256',secret).update(JSON.stringify(value)).digest('hex');}
export function verifyReceipt(value,receipt,secret){return equal(signReceipt(value,secret),receipt);}
