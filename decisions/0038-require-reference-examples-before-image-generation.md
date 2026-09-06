# 0038 — Require reference examples before image generation

Date: 2026-09-06
Status: accepted by owner; workflow documented; no new image test executed in this adoption step.

## Context

Repeated bridal trials produced implausible object placement and inaccurate accessory details.
The owner rejected continued trial-and-error generation and asked for established external prompt
libraries and published expert guides with visible image references. The owner explicitly adopted
selecting and testing a published example before future Calapres image generation.

## Decision

1. Before each new creative generation, identify a relevant published example with its result image,
   exact source prompt, creator/source URL, model/version, available settings and reference inputs.
   Give each reference a clear role (pose/composition, product identity, lighting or wardrobe).
   Verify that required input images actually reached Magnific. An image visible in the conversation
   or a written description is not proof it was uploaded. Report missing inputs rather than silently
   substituting a description.
2. Use external libraries for research and reference selection. Use Magnific ONLY for all image
   generation and editing. Do not switch providers, install library code/skills, subscribe, top up,
   bind accounts, or publish merely because a library suggests it.
3. Test a relevant example in a bounded pilot before expanding or adapting its approach into further
   Calapres assets. Check the actual model, supported controls and displayed credit cost first.
   Start with one result and allow at most one targeted correction as the default attempt limit.
   Stop and report repeated failure rather than repeatedly regenerating an entire scene. This is a
   cost-control limit, not permission for an unsolicited batch or recurring spend.
4. A published example is not locally validated evidence. Inspect the test separately for photographic
   plausibility and actual product fidelity: anatomy/grip, gravity/contact shadows, coherent lighting,
   incense and bowl-originating smoke where requested, real burner body/colors and one-burner offer,
   and reference-specific jewelry/watch geometry and counts. Respect decision 0025 and its latest
   narrowly scoped owner exceptions. Do not promise 100-percent fidelity from prompt wording.
5. Record source image/link, source prompt, adapted prompt, exact model/settings, supplied references,
   output, actual cost, observed defects and review status. Distinguish externally published,
   prepared, tested, rejected and owner-approved. Only a tested successful example enters the
   reusable working library; visual acceptance does not grant manufacturing or publication approval.
6. Reuse a recorded successful test when its relevant setup remains unchanged. Every subsequent
   generation must trace to its reference and test record; this does not require redundant paid
   re-tests of the same proven setup or a recursive test before each test. A materially changed
   model, reference method or scene requires a fresh bounded pilot.
7. Keep technical workflow and sanitized evidence in GitHub. Store future reference/output media
   using the existing organization under `Calapres/Ai-Work`; preserve historical assets. Verify local
   saves and distinguish them from confirmed iCloud upload. No new deliverable folder or media was
   created during this documentation-only adoption.

## Initial reference shortlist

These sources were reviewed on 2026-09-06. They are candidates for example selection, not a claim
that their entire catalogs are expert-validated or reproducible.

- [YouMind Nano Banana Pro prompt library](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts):
  model-specific community examples with previews; prioritize relevant product/bridal examples.
- [PromptHero](https://prompthero.com/): cross-model visual discovery; verify each example's model,
  references and settings before adapting it.
- [Guy Parsons' DALL-E 2 Prompt Book](https://dallery.gallery/the-dalle-2-prompt-book/):
  published in 2022; use for photographic vocabulary/composition, not current model parameters.
- [Learn Prompting image guide](https://learnprompting.org/docs/image_prompting/introduction):
  researcher-authored fundamentals, cites Parsons; image chapter displays a 2024 update date.
  Model-specific advice may be outdated.

Library popularity is not proof that a particular reference solves Calapres product-fidelity issues.
Do not copy another model's unsupported parameters into Magnific.

## Current outcome and next action

Approved: this reference-selection, bounded-test and evidence-reuse workflow.
Executed: project instruction and continuity documentation only. No image generated, credits spent,
library purchased, or customer-facing change made in this adoption step.
The owner subsequently objected to the realism of the latest holding-pose result `u5sZ3OdQLD`;
it is not accepted, and the earlier six-motif Alhambra bracelet defect remains unresolved.
Preserve these drafts as historical attempts, not successful templates.

Next safe creative action: prepare a small set of relevant published image-plus-prompt examples,
check available source/reference inputs, then use the chosen example for one bounded Magnific pilot
within the applicable creative request. Keep publication and funding gates unchanged.
