// Order-line verification: the manufacturing release boundary. A generated design is released only
// when the order line carries the exact stored design, name, version, a valid server-issued approval
// receipt recorded for the owning session, and the customer's approval text. The storefront
// checkbox alone is not trusted. Asset URLs from order properties are parsed, never fetched.
import { normalizeName, verifyApproval } from './security.mjs';

export const PROP = {
  method: 'طريقة التخصيص', text: 'نص الحفر', asset: 'تصميم الحفر', id: 'معرف التصميم',
  version: 'نسخة التصميم', receipt: '_design_receipt', approval: 'اعتماد التصميم',
};
export const METHOD_GENERATED = 'تصميم اسم مولد';
export const METHOD_UPLOAD = 'تصميم مرفوع';
export const APPROVAL_TEXT = 'راجعت الاسم والتصميم الظاهر ووافقت عليه';

// Accepts REST/webhook shape [{name,value}], GraphQL customAttributes [{key,value}] or a plain object.
export function propertiesToMap(props) {
  const map = new Map();
  if (Array.isArray(props)) {
    for (const p of props) {
      const k = p?.name ?? p?.key;
      if (typeof k !== 'string') continue;
      if (map.has(k)) return { duplicate: k };
      map.set(k, typeof p.value === 'string' ? p.value : String(p.value ?? ''));
    }
  } else if (props && typeof props === 'object') for (const [k, v] of Object.entries(props)) map.set(k, String(v ?? ''));
  return { map };
}

export function verifyLine(props, { ledger, store, shop, secret }) {
  const { map, duplicate } = propertiesToMap(props);
  if (duplicate) return { status: 'invalid', reason: `DUPLICATE_PROPERTY:${duplicate}` };
  const get = (k) => map.get(PROP[k]) ?? '';
  const method = get('method');
  if (method === METHOD_UPLOAD) return { status: 'upload', reason: get('approval') === APPROVAL_TEXT ? null : 'APPROVAL_MISSING' };
  if (method !== METHOD_GENERATED) return { status: 'not_personalized' };
  if (get('approval') !== APPROVAL_TEXT) return { status: 'invalid', reason: 'APPROVAL_MISSING' };
  const design = ledger.design(get('id'));
  if (!design) return { status: 'invalid', reason: 'UNKNOWN_DESIGN' };
  let name;
  try { name = normalizeName(get('text')); } catch { return { status: 'invalid', reason: 'NAME_INVALID', designId: design.id }; }
  const fail = (reason) => ({ status: 'invalid', reason, designId: design.id });
  if (name !== design.name) return fail('NAME_MISMATCH');
  if (get('version') !== design.version) return fail('VERSION_MISMATCH');
  // _design_receipt carries the server-issued APPROVAL receipt (a1.<time>.<mac>) of this exact
  // design, and the ledger must hold that approval for the owning session.
  const approvedAt = verifyApproval({ shop, id: design.id, sha256: design.sha256, version: design.version, name }, get('receipt'), secret);
  if (!approvedAt) return fail('RECEIPT_INVALID');
  const approval = ledger.approval(design.id, approvedAt);
  if (!approval || approval.session !== design.session) return fail('APPROVAL_NOT_RECORDED');
  let path;
  try { path = new URL(get('asset'), 'https://placeholder.invalid').pathname; } catch { return fail('ASSET_URL_INVALID'); }
  if (!path.endsWith(`/a/${design.sha256}.png`)) return fail('ASSET_MISMATCH');
  try { store.get(design.sha256); } catch { return fail('ORIGINAL_MISSING_OR_CORRUPT'); }
  return { status: 'verified', designId: design.id, sha256: design.sha256, name, version: design.version, approvedAt, path: store.path(design.sha256) };
}

export function orderLines(order) {
  if (Array.isArray(order?.line_items)) return order.line_items.map((l) => ({ id: String(l.id), title: l.title, props: l.properties || [] }));
  const nodes = order?.lineItems?.nodes || order?.lineItems?.edges?.map((e) => e.node) || [];
  return nodes.map((l) => ({ id: String(l.id), title: l.title || l.name, props: l.customAttributes || [] }));
}
