# 0042 — Owner-curated content realism folders

Date: 2026-09-08.
Status: owner correction binding; former copied collection deleted; current originals moved and verified locally; cloud synchronization unconfirmed.
Verified baseline: `dbc470a73740c85804a01ced24e57c44a69a14ac` on canonical main.

## Correction: remove copied collection; move originals only — 2026-09-08

This entry supersedes the earlier collection status. The owner explicitly rejected copying:
he requested moving original content, authorized deletion of the agent-created copied collection,
and explicitly selected both existing Ai-Work content and media from the project `مكرر` archive.
The earlier 468-copy implementation was an agent mistake, not the requested outcome.

Executed: deleted the entire former `عمل/تجارة/Calapres/Ai-Work/المحتوى` copy folder.
Before deletion, all 338 remaining media copies matched their recorded complete SHA-256 and
at least one intact original outside the collection. There were no added/changed media files or
owner-classified files in its two folders. 130 of the initially copied files were already absent;
this operation did not restore them or infer who removed them. Administrative files and the two
empty classification folders were removed with the copied collection. Original paths survived.

Executed after the owner confirmed he had finished changing files and explicitly instructed
resumption: reinventoried the current sources and MOVED 925 existing content files (6,771,251,964
bytes) into `عمل/تجارة/Calapres/Ai-Work/المحتوى`. Scope: current images, video, editable design
files, 15 clearly named branding/packaging PDFs and the existing Arabic content plan, from
Ai-Work and the project `مكرر` archive. No absent item was restored from the earlier manifest.
Files were moved on the same filesystem with no copying fallback, collision or renaming.
Every file retained its filesystem inode and full SHA-256; all 925 previous file paths are absent.
There are 461 distinct hashes: byte-identical originals already present in the source archive
were moved as existing files, not newly copied or automatically deleted. Financial/legal PDFs,
technical files and remaining ZIP bundles stayed outside the sorting library.

The replacement collection contains the moved originals, `سجل نقل الأصول.csv` with private
previous/current path mappings, Arabic `اقرأني.txt`, and the empty `أصيل` and
`محتوى غير مرغوب به` folders for owner classification. Earlier inventories, plans and provenance
records retain historical paths; resolve them through the move ledger and actual file existence.
Some previously proposed assets were removed by the owner during cleanup: do not restore missing
plan references or treat an old content proposal as current approval. Before later content work,
refresh the plan against the owner's actual choices. No new media or media backup was created.

Local moves and byte integrity are verified. Live iCloud server synchronization remains unconfirmed.
No image generation, social publication, schedule, account binding or operational workflow changed.

## Owner direction

After requiring repeated review and visually convincing content, Abdulrahman asked to collect
Calapres content in one folder inside the existing Ai-Work location, with exactly two named
classification folders: `أصيل` and `محتوى غير مرغوب به`.
He explicitly defined his placement in `أصيل` as meaning closer to reality and convincing to
the eye. This is an owner visual judgment, not proof of photographic capture, product fidelity,
manufacturing feasibility, platform publication approval or authenticity of a depicted accessory.

## Operating rule

Canonical iCloud-relative location: `عمل/تجارة/Calapres/Ai-Work/المحتوى`.

- Files in the collection root await owner classification.
- `أصيل/`: owner-selected visual realism references. Use these to understand the accepted
  visual standard before proposing further content. Do not assume every file is camera-original.
- `محتوى غير مرغوب به/`: owner-excluded content. Preserve it as review history and do not
  reuse it as a positive creative example or delete it automatically.
- The owner classifies. Agents must not populate either folder merely from a filename,
  generation provider, prior informal opinion, or a blanket assumption about AI content.
- Inspect the current folders at the start of subsequent creative work. Historical source
  manifests record old locations, not classifications; never let its old path override the owner's current
  placement. Avoid reintroducing excluded content under an alias from another source directory.
- If identical content is found in both classification folders, flag the ambiguity instead of
  assuming which placement represents the owner's decision.
- Publication and any later paid image operation retain their existing explicit approval gates.
  Magnific-only and decision 0038 continue unchanged. No automatic watcher/sorter is authorized.

## Superseded execution — copying was an agent mistake

Collected 468 files, about 2.48 GB, as verified copies. Original files remain in place unchanged.
Coverage: project images, video, editable design files, clearly named branding/packaging PDFs
and the prepared Arabic content plan. Financial/legal records, technical code and original ZIP
archives remain outside this sorting library; extracted creative assets are already represented.
This is a local project-file collection, not a claim to have retrieved every remote creative draft.

931 source files were scanned by complete SHA-256. Identical bytes AND extension share one copy
in the collection (463 additional source copies not repeated). There are 467 distinct byte hashes;
one byte-identical item is retained in two formats/extensions for its different application use,
which explains the 468-file count. Same-named different content received a hash suffix only in the
new copy's filename; no historical file was renamed or overwritten.

Every copied file was read back and its full SHA-256 matched the source manifest. All source
sizes and modification timestamps were checked unchanged before and after collection. Both
classification folders were empty at completion, leaving the owner's choices untouched.

The collection also contains Arabic `اقرأني.txt` and private `مصادر الملفات.csv` covering every
source-to-copy mapping. These are two administrative files beyond the 468 content files.
Do not commit the complete manifest, private source names, or binary media to GitHub.

Local access and verification passed. Available macOS upload metadata does not confirm iCloud
server synchronization. File copies do not constitute publication, and no live service, account,
credential, workflow, content schedule, render or provider spend changed.

## Next safe action

The authorized move is complete. Abdulrahman sorts the moved originals in the rebuilt collection. On the next creative request, read those choices first
and apply separate product, physical-scene, language and final mobile-preview reviews. Empty
`أصيل` means no folder-based selection has been made yet, not that every collected file was rejected.
No immediate additional generation or automatic retry is needed.
