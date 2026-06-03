# AGENTS.md

This repository participates in the A-awd GitHub-first AI operating system.

## Repository Role

`calapres` is a React/Vite app with Supabase integration and an existing test posture. Preserve testability and use it as a stronger template for similar Lovable-era apps.

## AI Role Contract

- Claude: product architecture and design direction.
- Codex: implementation, tests, Supabase safety, CI hardening.
- Gemini: research, critique, second-pass review.

## Operating Rules

- Read `docs/ai/OPERATING_MODEL.md` before substantial work.
- Never commit Supabase service keys, auth secrets, customer data, or private business data.
- Keep tests current for user-facing behavior and Supabase boundaries.
- Prefer deterministic scripts and migrations over prompt-driven operations.
- Use GitHub issues/PRs as durable memory.


<claude-mem-context>
# Memory Context

# [calapres] recent context, 2026-06-03 5:54pm GMT+3

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (20,360t read) | 301,740t work | 93% savings

### Jun 3, 2026
327 2:54p 🔵 React Companion App Has 77 Lint Errors and Builds Successfully — No Shopify Impact
328 2:55p 🔵 shopify theme check Found 71 Offenses — LiquidHTMLSyntaxError in collections-strip and Empty URI Fields in settings_schema
329 " 🔵 collections-strip.liquid LiquidHTMLSyntaxError Is Dead Code — Invalid Assign Never Used in Render Loop
330 " 🔵 All Theme Asset Image Dimensions Catalogued for ImgWidthAndHeight Error Fixes
331 2:56p 🔴 8-File Patch Resolves Shopify Theme Check Errors — ValidJSON, LiquidHTMLSyntaxError, and ImgWidthAndHeight Fixed
332 " 🔴 Remaining ImgWidthAndHeight Errors Fixed in new-arrivals and scent-families Sections
333 2:57p 🔵 Pre-Commit Status: 13 Modified Files Including package-lock.json — git add -A Needed Before Commit
334 " 🔴 shopify theme check Now Reports Zero Errors — All 25 Errors Resolved, 46 Warnings Remain
335 " ⚖️ package-lock.json Reverted Before Commit — Keeping Theme Fix Commit Focused on Shopify Files Only
336 2:58p 🔵 Committed package-lock.json Was Already Out of Sync — @dnd-kit/modifiers Missing from Lockfile
337 " 🔴 package-lock.json Lockfile Sync Restored — npm ci Now Passes Clean
338 " 🔵 Final Pre-Commit Validation State: shopify theme check 0 errors / 46 warnings, npm build passes
339 " 🔵 Staged Index Has Empty URI settings_schema — Working Tree Has Correct https://calapres.com URIs
340 3:07p 🔵 Calabrese Shopify Theme: Diagnosed Root Cause of 404 on Live Store
341 3:08p 🔵 Calabrese Shopify Theme Branch State Confirmed Clean
342 " 🔵 Calabrese Theme Code Is Clean — No Errors Causing 404
343 " 🔵 calapres.com Served by Squarespace, Not Shopify — Domain DNS Mismatch Confirmed
344 " 🔵 Calabrese Repo Is a Hybrid Project: Shopify Theme + Vite/React/Supabase Frontend
345 3:09p ✅ Homepage Replaced with Minimal Probe Template to Test Shopify GitHub Sync
346 " 🔵 Post-Swap Theme Check: Zero Errors — New Probe Template Passes Validation
347 3:10p 🔵 Deep Programmatic Audit: Zero Errors Across Entire Theme Codebase
348 " ✅ Committed Shopify Homepage Probe to shopify-theme Branch
349 " ✅ Probe Commit Pushed to GitHub — Shopify Sync Trigger Sent
350 3:11p 🔵 Shopify Store Continues Returning 404 After Probe Push — GitHub Sync Not Picking Up Changes
351 " 🔵 404 Is Shopify Platform Store-Not-Found Page, Not Theme Rendering Error
352 3:12p 🔵 Shopify GitHub Sync Confirmed Working — Active Theme Is calapres/shopify-theme
353 5:30p 🔵 Calabrese Shopify Theme Repair Task Initiated
354 " 🔵 Calapres Sync Module Architecture Inspected
355 " 🔵 nawadirdior.sa Sitemap Structure Confirmed Live
356 " 🔵 nawadirdior.sa Sitemap-2 Contains 3,155 Product URLs Including 589 Arabic-slug Products
357 5:32p 🔵 Enriched Tag Guard Protects Higgsfield-Generated Product Content
358 " 🔵 Complete n8n Sync Module Suite Documented: pricing.js and inventory.js Details
359 5:34p 🟣 New Sitemap Crawler Added: sync/crawl-supplier.js
360 " 🔄 parse-product.js Refactored to Multi-Source Architecture
361 " 🟣 build-shopify-payload.js Adds Supplier ID Tag and Source URL Metafields
362 5:36p 🟣 Complete n8n Recurring Sync Flow Spec Written: sync/n8n-sync-flow.md
363 " 🟣 Higgsfield Enrichment n8n Flow Spec Written: sync/n8n-enrich-flow.md
364 " 🔴 buildPayload Guard Extended to Missing-Availability Products; Price Omitted When Null
365 " 🔴 Salla 'sale' Availability Value Now Maps to in_stock
366 " 🔵 crawl-supplier.js Cannot Be Required Directly — Needs vm.runInNewContext or n8n Context
367 " 🔵 Full Pipeline End-to-End Validation Passed Against Live Nishane Hacivat Product Page
368 5:37p 🔵 Salla Product Pages Return Homepage Content When Fetched Without Browser Session
369 " 🔵 Salla HTTP 302 Redirect to Homepage Identifies Delisted Products — Not a Parser Failure
370 " 🔵 Pre-Commit State Verified: Only sync/ Files Changed, All JS Syntax Clean
371 5:38p 🔴 n8n Sync Flow Spec Fixed: Missing-Products Branch Triggers From SplitInBatches Done Output
372 " ✅ Sync Module Suite Staged for Commit to main: 6 Files, 1,105 Net Insertions
373 " ✅ Supplier Sync and Enrichment Engine Committed to main: 0279e85
374 " ✅ Sync Engine Pushed to GitHub: main at 0279e8511ec28e392f399a7e15ecf1b3bf794f96
375 5:39p ✅ All Four Plan Steps Completed: Calapres Supplier Sync Engine Delivered
376 5:40p ✅ Goal Marked Complete: Calapres Sync Engine Delivered in 615 Seconds, 142,739 Tokens

Access 302k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>