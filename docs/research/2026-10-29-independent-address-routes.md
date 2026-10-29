# Independent national-address routes — 2026-10-29

## Owner intent and authority

The owner asked for a correct method even without relying on the current address/shipping vendors,
and why Onwan had been selected. The ready-app pilot was intended to avoid building/operating a
custom integration; its actual app-to-Shopify write passed, but native OTO mapping/update did not.
Research is authorized. This request does not silently authorize a paid plan, access/key/channel,
custom backend, storefront replacement, external middleware, customer messaging or deployment.

Current Onwan Free/paid-renewal stop remains. The previously displayed OTO email and Mwwared chat
proposals are still unsent and require owner approval. Historical fixtures must not be repeated
without a supported new change. No implementation or new experiment was run in this review.

## Findings from primary sources

### Direct address source: SPL

SPL publicly offers national-address verification and retrieval using short address, geocode and
other inputs. Its developer portal documents an account, access credentials and product limits.
This permits considering a merchant-owned integration independent of Mwwared. Developer free
registration is not proof of free/unrestricted commercial use; eligibility, current product,
response schema and commercial pricing remain account-specific gates.

Sources:
- https://splonline.com.sa/en/national-address-api/
- https://api.address.gov.sa/
- https://api.address.gov.sa/apis
- https://api.address.gov.sa/apidocumentation
- https://api.address.gov.sa/products

### Route A: merchant-owned pre-checkout app using official interfaces

Proposed journey: customer enters the short code before checkout; a secure application requests
SPL's actual address record, displays it for confirmation, and pre-fills native shipping fields
before order creation. Preserve original code and every address component explicitly. A correct
lookup verifies a location, not customer identity or proof of occupancy; no OTP is implied.

Shopify documents checkout-address prefill through cart permalinks, and Storefront Cart delivery
address mutations. This establishes platform capabilities, not a safe drop-in implementation for
the current personalized-products theme. Cart-permalink reconstruction may discard or alter
existing cart lines/personalization unless proved otherwise. Storefront Cart APIs are not an
assumed interchangeable replacement for the current native Online Store cart. Existing customer
accounts, discounts, gift cards, item properties and accelerated checkout require separate
bounded acceptance, without unapproved settings changes.

A secret lookup key must not be embedded in public theme JavaScript. The ordinary official App
Proxy design forwards signed storefront requests to the app's external backend, where credentials
are protected. That is a custom operating service and needs a new architecture/access/commercial
approval under current restrictions; calling the interfaces official does not make the custom
app an already certified/native OTO connector. No provider, server or app is selected or deployed.

For shipping, either the current native connector must prove its source/update contract, or an
independently approved direct official shipping API integration must own the field mapping.
A direct OTO API feed would require explicit new access/channel approval, duplication prevention,
controlled retirement of competing native import, and tracking/writeback design. Those are not
implicitly authorized by address research. Merely pre-filling Shopify does not repair OTO.

Sources:
- https://shopify.dev/docs/apps/build/checkout/create-cart-permalinks
- https://shopify.dev/docs/api/storefront/latest/mutations/cartDeliveryAddressesAdd
- https://shopify.dev/docs/apps/build/online-store/app-proxies
- https://shopify.dev/docs/apps/build/security
- https://apis.tryoto.com/

### Route B: Shopify-hosted Flow after order creation, without Onwan or a private server

A newly investigated option uses Shopify Flow's own Send HTTP request action to call SPL directly,
Run code to parse the returned body, and Send Admin API request / orderUpdate to save the verified
shipping address. Current Shopify documentation explicitly supports response-body chaining and
Secrets with redacted stored values. This route does not require n8n or a private automation host.

HTTP in Flow requires Grow, Advanced or Plus; Basic lacks this action. This is post-order
operational correction. It does not let a customer enter only a code and see a fully populated
checkout before payment, and does not itself enforce code capture on all checkout paths.
Therefore neither the route nor upgrading to Grow is a complete answer to the original UX goal.
No plan change is authorized or recommended solely from this capability research.

Sending verified components onward to OTO using updateOrder is documented only before shipment
creation. The exact existing orderId, access to orders created by another integration channel,
required nested customer fields, retry/duplicate behavior and possible native late overwrites
remain unproved. Changing Shopify then issuing an OTO update does not eliminate race conditions.
Do not send createOrder as a fallback; it can create a second order and change channel ownership.

OTO's lookup endpoint is listed, but this review did not establish a complete current response
schema for every national-address component. OTO access tokens expire after one hour. A token
returned dynamically from refresh is not proven automatically redacted by Flow's stored-Secrets
feature. Do not log token/response bodies or expose credentials. Prefer evaluating a legitimate
static SPL credential in Flow Secrets for lookup, while treating downstream OTO auth/update as
an independent acceptance gate. Flow HTTP200 alone is not successful address verification;
application success, returned-code match and all required components must pass before writing.

Sources:
- https://help.shopify.com/en/manual/shopify-flow/reference/actions/send-http-request
- https://help.shopify.com/en/manual/shopify-flow/reference/actions/run-code
- https://help.shopify.com/en/manual/shopify-flow/reference/actions/send-admin-api-request
- https://shopify.dev/docs/api/admin-graphql/latest/mutations/orderUpdate
- https://apis.tryoto.com/

### Shopify-only qualifications

Default Shopify address autocomplete supports Saudi Arabia on all plans, but this is not evidence
of SPL short-code validation/full-record retrieval. Checkout UI in information/shipping/payment
steps remains Plus-only. Moving to Grow enables Flow HTTP, not those checkout UI extensions.
Oxygen supports server-side secrets and Basic for Hydrogen storefronts, but adopting a Hydrogen
storefront would be a major architectural change, not a small lookup endpoint for the current
theme. Do not use it as an undocumented proxy workaround or revive the retired React storefront.

Sources:
- https://help.shopify.com/en/manual/checkout-settings/address-collection-preferences
- https://help.shopify.com/en/manual/checkout-settings/customize-checkout-configurations/checkout-apps
- https://shopify.dev/docs/storefronts/hydrogen/deploy/oxygen
- https://shopify.dev/docs/storefronts/hydrogen/deploy/oxygen/environments

### Changing shipping platforms is not a proven shortcut

ShipTag documents real short-code verification, address retrieval, city/postcode fill and
invalidation after code changes inside its shipment platform. It does not document the complete
customer-facing Basic checkout flow or native Shopify address writeback. Torod, iCARRY and Aramex
have shipping integration evidence but no reviewed primary source proves the whole requested
code-first Shopify customer journey. No platform migration is justified solely on those listings.

Sources:
- https://blog.shiptag.com/national-address-saudi-arabia-shipping/
- https://www.shiptag.com/en/shipping
- https://apps.shopify.com/torod
- https://help.torod.co/en/support/solutions/articles/10000017393-connecting-to-shopify
- https://blog.torod.co/national-address-shipping-labels-saudi-2026/
- https://apps.shopify.com/aramex
- https://icarry.com/

## Decision-quality conclusion and next gate

Mwwared is optional; SPL is an official independent data source. A merchant-owned pre-checkout
integration is an engineering option matching the desired journey, not an already implemented
solution. It needs an approved secure operating service and independently verified shipping
mapping. The platform-hosted Flow option is a real alternative for post-order work but changes
the customer experience and requires a plan decision. Keep these two choices separate.

There is no verified ready whole-chain substitute under all current constraints in this research.
Do not manufacture certainty by relabeling custom middleware as an official connector, promise
that an upgrade fixes OTO, or approve an app solely from Works with OTO. The next step is an owner
choice about a custom-app operating service versus a post-order experience, followed by concrete
commercial/access review and one bounded test of the chosen route. Existing no-message/no-shipment
and native-only restrictions remain until explicitly amended. No new approval is inferred.
