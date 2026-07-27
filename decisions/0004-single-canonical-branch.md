# 0004 — `main` is the single canonical branch

Date: 2026-07-27
Status: Accepted

## Problem

Two branches competed for authority. `main` held the code but no governance documents and its
`README.md` was still an unmodified Lovable template. `migration/one-brain-foundation` held the
governance documents and was six weeks newer. Agents reading `main` saw no state at all.

## Decision

`main` is the only canonical branch. The governance documents were migrated from
`migration/one-brain-foundation` into `main`. That branch is retained as history only and is no
longer authoritative. No future work may create a second competing canonical branch.
