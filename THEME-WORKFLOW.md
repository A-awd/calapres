# Two-theme workflow

Owner decision, 2026-09-22: use one published primary theme and one unpublished backup for all experiments. After explicit release approval, publish the backup and swap their names and roles. Do not create further theme copies for individual apps.

Verified Shopify rename results:
- 166066389248: `Calapres — أساسي`, MAIN.
- 166572294400: `Calapres — احتياط`, UNPUBLISHED.

Completed: archived all 13 themes (828 files), then deleted the 11 extra unpublished themes through Shopify admin. Final API inventory contains only the two themes above. All 65 primary theme file MD5 values match the pre-cleanup inventory; no publication occurred.

Deleted theme IDs: 163004449024, 165745590528, 165747851520, 165770887424, 165774786816, 165776949504, 165777604864, 165804638464, 166572982528, 166573179136, 166573768960.

Archives are local under `/Users/awd./Documents/Codex/2026-09-22/apps-app-store/outputs/theme-archives-2026-09-22/`, one importable ZIP per theme plus manifest. Binary and non-JSON checksums matched source; Shopify-normalized JSON differs in comments/formatting and was parsed/validated instead. Every archive passed ZIP integrity verification. Store configuration exports remain local, not in public GitHub.

Four vendor templates were transferred to the backup: `product.trial-customily`, `product.trial-zepto`, `product.trial-teeinblue`, and `product.trial-cloudlift`. Comparison links now use the current theme ID, with no dependency on deleted theme IDs. These are incomplete test scaffolding, not a working customer deliverable: Cloudlift's app block alone did not initialize without its embed. Teeinblue embed was disabled in the backup to avoid loading it across other vendor trials. Next: configure per-template vendor loading within this single backup, remove product-photo overlays in vendor configuration, and implement three independent acrylic design choices. Do not claim the four comparison models are ready.

Corrected personalization scope: independent acrylic name designs below the product, three selectable designs after entering a name; do not overlay the name onto the burner photograph. Four vendor trials remain unfinished. Existing trial previews do not yet satisfy this corrected scope.
