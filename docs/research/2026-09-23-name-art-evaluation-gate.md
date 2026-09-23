# Arabic name art: current evidence and acceptance gate

Date: 2026-09-23. This is a read-only continuation of Claude's recovered
comparison, not a claim that a provider passed the Calapres benchmark.

## Current evidence

- The present OpenAI-generated `مدى` results failed the owner's exact-letter and
  composition requirements. No prompt alone establishes a letter guarantee.
- [Google's Gemini image documentation](https://firebase.google.com/docs/ai-logic/generate-images-gemini)
  explicitly lists `ar-EG` among supported languages for text *inside images*
  with Gemini 3.x image models. Its [image API guide](https://ai.google.dev/gemini-api/docs/image-generation)
  describes text-to-image, image-guided editing and reference images. These are
  capability claims, not successful Calapres samples or exact-spelling guarantees.
- [ByteDance's Seedream 5.0 Pro announcement](https://seed.bytedance.com/en/blog/beyond-generation-it-understands-design-introducing-seedream-5-0-pro)
  claims Arabic among its supported generation languages. This also lacks a
  verified Calapres sample.
- [Cloudlift's AI documentation](https://docs.cloudlift.app/article/221-ai-image)
  says shoppers can generate or edit images, including with Google Nano Banana,
  and that each operation consumes credits. It does not demonstrate correct
  Arabic calligraphy or retention of nine prior outputs for Calapres.
- [Zakeke's documentation](https://zakeke.zendesk.com/hc/en-us/articles/23868482378524-AI-Image-Generator-Editor)
  describes a shopper-facing logo/graphic generator; it says all generated
  outputs use credits even when the shopper chooses only one. It provides no
  exact-Arabic proof for these names.

## Smallest useful comparison

1. Keep evaluation outside the product page. Use the designer reference and
   exactly `مدى` and `عبد الرحمن`, with a clear source image showing every letter,
   dot, hamza and reading order. Make three deliberately different composition
   briefs for each name, not just three styles of one layout.
2. Start with one image-capable model whose vendor explicitly names Arabic image
   text support: Gemini 3.x Image. Keep the current OpenAI outputs as the failed
   control. Seedream is a second candidate if the first fails and access/cost
   are confirmed. A Shopify app adds a checkout interface but does not solve
   letter correctness by itself.
3. Gate each image by human inspection against the typed name and designer
   reference. Reject any extra, missing or substituted letter, dot or hamza,
   changed order, tashkeel, ornament or unrelated shape. Then compare the three
   accepted compositions for genuine structural difference. OCR can assist but
   cannot certify intricate calligraphy alone.
4. Record output bytes, exact prompt/reference, model/version, attempt count,
   latency and actual charge before considering integration. Count every paid
   attempt, including rejected images. Obtain a separate exact comparison cap
   before provider spending; the existing 20 SAR cap belongs to the deployed
   experiment and is not authorization for a new provider.

No tested provider currently satisfies an exact-letter guarantee for arbitrary
customer names. Until the benchmark passes, retain customer upload as the usable
path and keep the generated path confined to the unpublished backup experiment.
