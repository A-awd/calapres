# Safari browser icon refresh — 2026-09-08

## Result

**Executed; server readback verified; owner display confirmation received.**
After the live filename/link refresh, the owner closed the old store tab, opened a new one and
confirmed: “ظهر الختم البني”. This confirms the reported device/display check. It is not a
separate visual audit of every Mac/iPhone, saved favorite, suggestion cache or Google Search result.

## Evidence before the change

Canonical main was `61c52e76e0fc6152a1dd4dda33a30d993a8f9b44`. The received screenshot shows
the obsolete circle-and-gold-dot icon beside homepage/product entries in the address-bar
suggestions. The owner additionally confirmed that it also appeared in the site tab.
Do not recast the complaint as merely confusion about Safari controls.

Shopify MAIN theme `165804638464` still selected the approved
`calapres-checkout-wax-seal.png`. The homepage emitted it for 16px/32px icons, shortcut icon and
180px Apple touch icon; the actual 32px and 180px images were visually the brown CR seal.
The existing fallback `assets/calapres-favicon.png`, read through the Shopify file-body API,
was a gold CR monogram on a brown square, not the circle in the screenshot. Neither inspected
live layout embedded that obsolete circle. The observed discrepancy was consistent with retained
icon data, but no Safari cache database was inspected and no exact internal cache mechanism is proven.

## Bounded repair

Reused the exact approved source image via Shopify-native `fileCreate`, with no generation,
retouching, new visual identity or image-provider credit spend:
- Source MediaImage: `39160992956672`, `calapres-checkout-wax-seal.png`, 755x840.
- New MediaImage: `39286688317696`, `calapres-cr-browser-icon-2026-09-08.png`, READY, 755x840.
- New original URL:
  https://cdn.shopify.com/s/files/1/0829/2997/5552/files/calapres-cr-browser-icon-2026-09-08.png?v=1788816638

On the existing MAIN theme, saved only:
1. `config/settings_data.json`: selected the new filename as favicon.
2. `layout/theme.liquid` and `layout/password.liquid`: use the selected image with the same
   new seal file as fallback, preserve 16/32/180 image transforms, and update the URL revision
   to `calapres_favicon=cr-seal-20260908`. Removed the fallback references to the old gold
   monogram asset; preserved the asset itself.

The new filename provides a different image URL. It does not clear device history or guarantee
that every browser surface will refresh instantly. Do not repeatedly rotate this filename as a
routine operation; keep it stable. Existing checkout branding is still the original approved
seal file and was not changed.

## Validation and scope

- Shopify returned no file-create user errors and then READY.
- Read back all three edited live files exactly.
- Fresh homepage DOM emits the new filename/version in all four icon declarations.
- Opened the new 180px URL and visually confirmed the same brown seal.
- No Liquid rendering error; theme editor had zero errors. Six RemoteAsset warnings refer to
  existing Google Fonts links in the two layouts, outside this change.
- Owner confirmed the brown seal appears after reopening the store.
- No theme clone/switch, image generation, product/cart/payment/checkout change, tracking change,
  browser-history deletion, customer communication, credential or account mutation.
- Source settings retain their pre-existing differences from live app blocks; only the favicon
  value was patched in each version. Do not overwrite live settings with the repository wholesale.
- No new iCloud deliverable: this was a Shopify asset copy and technical source/documentation change.

This supersedes the immediately preceding unresolved screenshot/confirmation status in STATE and
HANDOFF. The original September 2 record was server evidence; the owner's confirmation in this
repair is the additional display evidence that was previously missing.
