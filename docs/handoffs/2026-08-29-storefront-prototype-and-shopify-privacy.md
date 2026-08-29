# Calapres storefront prototype and Shopify privacy handoff

Date: 2026-08-29

Last verified: 2026-08-29 10:52 Asia/Riyadh

Source-conversation fingerprint:
`sha256:af66e02ff2102c4b1eb2bab2f7625ce7130e55232b5a5ccfd77d456b994fc0e3`

## Identity and scope

- Project: Calapres.
- Canonical repository: `A-awd/calapres`.
- Canonical branch: `main`.
- Pre-publication baseline: `922e22263ca0a18d176b0f2a4abc26cd9d67cd87`.
- Included: the local storefront design prototype, its verification evidence, the live Shopify
  cookie-banner diagnosis, and the observed limit of the connected Shopify MCP.
- Excluded from execution: the live Shopify theme, Customer Privacy settings, Captain, Chatwoot,
  n8n, Meta, Shopify products, customer conversations, orders, and pixels.

This record is a sanitized continuity artifact, not a transcript archive. It does not contain the
raw conversation identifier, customer messages, credentials, storefront access tokens, pixel
identifiers, or raw platform payloads.

The current Captain architecture and native short-link state are already canonical in
[decision 0021](../../decisions/0021-adopt-shopify-native-short-product-links.md) and the
[2026-08-28 focused handoff](2026-08-28-captain-native-short-links-and-chatwoot-reporting.md).
They were compared before writing this record and are not duplicated here. Nothing in Captain,
Chatwoot, n8n, Meta, or the three native product redirects changed during the later
storefront-and-privacy phase recorded here.

## Executive state

[Prepared only] A mobile-first, FRAMA-referenced Calapres storefront prototype exists in a
separate local worktree. It passed its local visual, interaction, build, and worker checks. It is
untracked, uncommitted, not owner-approved for production, not integrated into the Shopify Liquid
theme, and not deployed.

[Verified live, read-only] The cookie banner currently shown on `calapres.com` is Shopify's native
Customer Privacy banner, not theme code. It is enabled, uses the full-width bottom position, and
explicitly includes Saudi Arabia in its region visibility.

[Not executed] No cookie-banner region, privacy text, consent behavior, analytics configuration,
pixel, policy, theme file, or live storefront setting was changed.

[Current execution boundary] Removing Saudi Arabia only is a Shopify Admin Customer Privacy action.
The connected Shopify MCP cannot safely perform that regional edit in its current authorization
state. Hiding the banner with theme CSS is not an acceptable substitute, and globally disabling the
cookie-banner feature is broader than the owner's stated Saudi-only goal.

## Local storefront design prototype

### Direction and owner feedback

[Owner preference, not production approval] The owner rejected generic storefront concepts and an
expensive replacement-theme path. Of the references reviewed, the owner preferred the restrained,
architectural direction of [FRAMA](https://framacph.com/), especially its large equal visual fields,
sparse copy, and mobile presentation. Framer was discussed but no Framer account, application,
headless storefront, purchase, integration, or architecture decision was adopted.

The working lesson is to start from measured reference geometry and real Calapres assets. Do not
repeat a generic text-heavy template or imply that a visual reference is already an approved live
theme.

### Artifact location and state

- Local worktree:
  `/Users/awd/Documents/calapres/worktrees/storefront-hero-prototype-20260829`
- Local branch: `codex/storefront-hero-prototype-20260829`
- Base commit: `922e22263ca0a18d176b0f2a4abc26cd9d67cd87`
- Prototype root:
  `prototypes/storefront-hero-20260829`
- State: untracked local files; no commit, push, pull request, Shopify upload, or deployment.

The prototype contains a 40-pixel announcement bar, an 80-pixel header, and two equal editorial
panels on desktop that stack as 400-pixel panels on mobile. It uses concise Arabic copy, one product
still, one muted looping product film, and a restrained following-story teaser. It contains no
price, discount, stock, availability, bundle, or shipping claim.

The main local assets are existing Calapres materials:

- `public/assets/calapres-burner-dark.webp`
- `public/assets/calapres-burner-film.mp4`
- `public/assets/calapres-silk.jpg`

Primary source fingerprints at closeout:

| Local file | SHA-256 |
| --- | --- |
| `src/App.jsx` | `dec5856fe1baee862640110aceb3ad9c251d6346a4d76ab4931f55dcfea65656` |
| `src/styles.css` | `700f244bbc43a2b51e8533dfc597d5af1c0400e91b1b5933247dca0a0b4f4fe2` |
| `public/assets/calapres-burner-dark.webp` | `a278ddc350d4e4dec4bc2129b2f3609eb4e9dc8e57cabeaec82746a1f01c1043` |
| `public/assets/calapres-burner-film.mp4` | `a406300948a8c1617992883988c3be126fb8dd1be74de87797e9e0962d902092` |
| `public/assets/calapres-silk.jpg` | `3cea334fcbc9b68de090c30f98ee4f9b37d2a8e42d6d5e001ac6339e773e9a4c` |

### Verification evidence

[Verified locally]

- Desktop and mobile comparisons were captured against the selected reference.
- The mobile menu opened with all five primary destinations and closed successfully.
- Both main panels use real Calapres destinations.
- The 900 by 900 product still loaded at its natural dimensions.
- The product film was muted, ready, playing, and advancing during inspection.
- The mobile layout had no horizontal overflow and browser inspection found no application error.
- The production build completed successfully.
- All four Sites worker tests passed, including a fresh direct test run at handoff closeout.

Useful local evidence:

- `prototypes/storefront-hero-20260829/design-qa.md`
- `prototypes/storefront-hero-20260829/qa-comparison-frama-desktop.jpg`
- `prototypes/storefront-hero-20260829/qa-comparison-frama-mobile.jpg`

[Important gap] This prototype is not a Shopify theme delta. The repository already records that
the live theme can be ahead of `main`; reconcile the live theme before translating any approved
prototype into Liquid. Do not upload this standalone prototype directly to the live theme.

## Shopify cookie-banner diagnosis

### Current live evidence

[Verified live, read-only on 2026-08-29]

- `https://calapres.com/` returned HTTP `200` and the Shopify-rendered page loaded
  `/cdn/shopifycloud/privacy-banner/storefront-banner.js`.
- The Storefront GraphQL `consentManagement.banner` result returned `enabled: true`, position
  `bottom_full_width`, Arabic banner content, and a `regionVisibility` list that includes `SA`.
- A search of the canonical theme directories found no cookie-banner or consent-banner
  implementation. The banner therefore belongs to Shopify Customer Privacy, not the theme.
- The live storefront contains Shopify-managed analytics and marketing pixels. Their identifiers
  are intentionally omitted.
- The live privacy-policy page is predominantly English while the storefront and banner are
  Arabic. It discusses cookies, analytics, advertising, and marketing. This language mismatch is
  a separate customer-trust and localization issue; it was not edited.

Shopify's own documentation says region selection is managed in Shopify Admin under
`Settings -> Customer privacy -> Cookie banner`, and that non-essential analytics and marketing
data in configured regions is limited until consent is obtained:

- [Configuring customer privacy settings](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings)
- [Customer Privacy API](https://shopify.dev/docs/api/customer-privacy)

Shopify orders and core checkout records are independent of whether a visitor accepts marketing
cookies. This stage did not measure any specific pixel after acceptance or rejection, so no claim
is made that every installed pixel behaves identically.

### MCP and execution boundary

[Verified during the conversation]

- Shopify Admin GraphQL schema inspection exposed a privacy-settings read and a mutation that can
  disable the cookie-banner feature globally.
- The connected Shopify MCP could not read the store's privacy settings because its current app
  lacks the required `read_privacy_settings` scope.
- No region-specific privacy mutation was identified through that schema inspection.

Therefore the current MCP is not the correct execution path for removing only Saudi Arabia. A
future MCP permission expansion would itself require a separate authorization review, and a global
disable would be broader than the requested regional result.

### Owner preference and safe continuation

[Owner preference, not executed] The owner prioritizes Saudi marketing measurement and does not
want the banner shown to Saudi customers. The narrow implementation discussed was to remove only
Saudi Arabia from the banner regions while retaining the configured EEA and UK regions. This is a
commercial preference, not a legal determination, and no jurisdictional review was completed.

Do not hide the banner with CSS or theme code. That can remove the visible control without changing
Shopify's consent state, leaving non-essential tracking restricted and creating a misleading user
experience. Do not globally disable the feature when the requested scope is Saudi Arabia only.

## Immediate next action

Stop for owner review. If the owner explicitly reopens the privacy stage for execution, perform one
bounded Shopify Admin change only:

1. Reread the live Customer Privacy settings.
2. Remove only Saudi Arabia from the cookie-banner regions.
3. Save and visibly confirm the Shopify Admin result.
4. Verify from a Saudi storefront context that the banner is absent.
5. Verify that a configured EEA or UK context still receives the banner.
6. Verify consent and pixel behavior only to the extent exposed safely, document the exact delta,
   and stop.

Do not combine that stage with privacy-policy translation, pixel installation or removal, theme
work, Captain work, Shopify product changes, Meta changes, or the local storefront prototype.

The separate design continuation is owner visual review of the mobile prototype. Only after visual
approval should a clean implementation stage reconcile the live Shopify theme, translate the
approved design into Liquid, preview it on an unpublished theme, and stop before publication.

## Rollback and safety

- The current handoff made no live change, so it has no live rollback.
- A future Saudi-region removal rolls back by restoring Saudi Arabia to the exact banner region
  list and re-verifying the storefront.
- Preserve the local prototype worktree until the owner accepts or rejects it; deleting that
  worktree removes the only implementation copy.
- Never commit credentials, customer information, raw conversations, pixel identifiers, or raw
  Shopify/n8n payloads.

## Intentional exclusions and known gaps

- Repetitive aesthetic exchanges, the Meta username-reservation popup, and general Framer
  explanations were omitted as non-operational context.
- Screenshots and raw browser or API responses were not copied into GitHub.
- The prototype is local-only; publication of this documentation does not publish its code or
  assets.
- No legal opinion was obtained.
- No live consent accept/reject measurement was run for each installed pixel.
- No privacy setting, theme, or customer-facing system was changed.
