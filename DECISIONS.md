
# Decision Index

Durable Calapres decisions live in the `decisions` directory. GitHub `main` is the authoritative
decision record.

## Active decisions

- [0001 â€” Adopt the One Brain repository foundation](decisions/0001-one-brain-foundation.md)
- [0002 â€” Retire Nawadir Dior and adopt an owner-curated catalog](decisions/0002-retire-nawadir-dior.md)
  â€” supplier retirement remains permanent; its former database architecture is superseded by
  decision 0006.
- [0003 â€” Calapres SKU format](decisions/0003-calapres-sku-format.md) â€” existing SKU immutability
  remains active; database-issued SKUs are superseded by decision 0006.
- [0004 â€” `main` is the single canonical branch](decisions/0004-single-canonical-branch.md)
- [0006 â€” Retire Supabase and adopt Shopify-native operations](decisions/0006-retire-supabase.md)
- [0007 â€” Publish an isolated Calapres ownership-proof site](decisions/0007-publish-ownership-proof-site.md)
- [0008 â€” Adopt the Optix multi-brand customer-service architecture](decisions/0008-optix-customer-service-architecture.md)
  â€” approved for design and a Calapres-only pilot; n8n remains an orchestration layer and every
  brand's knowledge, credentials, customer context, and store adapter stay isolated.
- [0009 â€” Adopt a multi-brand ownership-evidence registry](decisions/0009-adopt-multibrand-ownership-evidence-registry.md)
  â€” repeat the successful permanent ownership-proof pattern for each future verified brand while
  keeping Calapres as the only active implementation.
- [0010 â€” Adopt the Calapres customer-service runtime](decisions/0010-adopt-calapres-customer-service-runtime.md)
  â€” use a Calapres brand edge plus an immutable credential-free Core, direct structured LLM calls,
  a separate private Shopify index, a private no-write Owner Review Desk, scoped operational
  tables, channel-aware delay, signed-request replay protection, and a no-send observation gate;
  Captain and AgentBot do not respond and pre-activation row projections are non-persistable.
- [0011 â€” Require transactional customer-service state](decisions/0011-require-transactional-customer-service-state.md)
  â€” keep n8n Data Tables as no-send previews rather than atomic authority; require a provider-neutral
  exactly-one-winner contract backed later by an owner-approved, dedicated managed PostgreSQL
  boundary before durable internal observation or customer egress. The contract also governs a
  bounded four-inbox Chatwoot reconciliation scan and per-conversation cursor without claiming
  complete discovery, and separates signed-webhook, reconciliation, and owner database roles. No
  provider or database is created by this decision, and Supabase remains prohibited.
- [0015 â€” Adopt the governed Calapres response library and scope gate](decisions/0015-adopt-governed-calapres-responder.md)
  â€” keep one existing responder and send path; select customer replies only from versioned
  Calapres knowledge or exact Shopify read-only capabilities, and redirect external questions.
  Its fixed grammar as the primary understanding layer is superseded by decision 0016.
- [0016 â€” Adopt a grounded support agent with isolated brand packs](decisions/0016-adopt-grounded-support-agent.md)
  â€” use the existing restricted model only for strict semantic classification, validate its output
  deterministically, read live Shopify facts through bounded brand-filtered queries, and render
  replies from an isolated brand pack without web search or cross-brand access. Its requirement for
  deterministic customer-visible prose is superseded by decision 0017.
- [0017 â€” Adopt grounded natural response composition](decisions/0017-adopt-grounded-natural-response-composer.md)
  â€” preserve deterministic facts and send controls, but express each grounded draft through a
  context-aware natural composer with strict output parsing and deterministic hallucination checks.
- [0018 â€” Adopt Chatwoot Captain for the prelaunch customer-service pilot](decisions/0018-adopt-chatwoot-captain-prelaunch-pilot.md)
  â€” make the existing Captain assistant the only automatic responder on WhatsApp, Instagram, and
  TikTok and keep the failed n8n responder unpublished. Its former plan/tool restriction is
  superseded by decision 0019.
- [0019 â€” Adopt isolated Captain external-tool bridges](decisions/0019-adopt-isolated-captain-external-tool-bridges.md)
  â€” keep Captain as the only responder, permit one small independently removable n8n bridge per
  external feature, and adopt the first read-only Shopify order bridge without claiming a carrier
  connection, order-number lookup, Shopify write, or proven real matched-order response.
- [0020 â€” Adopt a Captain product-link bridge and concise-response policy](decisions/0020-adopt-captain-product-link-bridge-and-concise-replies.md)
  â€” add a second independently removable, title-and-canonical-link-only Shopify bridge; keep reply
  length and live-product-fact boundaries as two separate Captain guidelines; wait for the customer
  after silence; preserve the first failed Playground acceptance as diagnostic history; correct the
  n8n URL-sandbox validator and Chatwoot `response.*` template paths; require the tool for explicit
  Arabic purchase/link intent; verify the exposed authorization's replacement and retired-value
  rejection; and accept the final two-line title-plus-canonical-link Playground reply.
  External-channel delivery remains unverified.
- [0021 â€” Adopt Shopify-native short product links for Captain](decisions/0021-adopt-shopify-native-short-product-links.md)
  â€” add exactly three first-party Shopify redirects for the white, beige, and gray burners and map
  only their exact canonical URLs to an exact short-URL allow-list in the existing five-node
  product-link bridge. Shopify redirect and local mapping checks passed; after a transient n8n
  HTTP `503`, the recovered host returned a successful exact title-plus-short-link Playground
  reply. Physical external-channel delivery remains unverified, and Chatwoot classification
  remains a documented proposal only.
- [0022 â€” Adopt a low-frictioıK®ÏÚÁßó¦ºŠWµ‹.râ•ê+v*ŞrÚ+Ëú)·øh™æë{ÛŠÛ­ìˆÚÜYHÚXÚÛİ]Ú]H]™HØ[\™\ÈY[]WJXÚ\Ú[ÛœËÌŒ‹XYÜ[İËYœšXİ[Û‹\ÚÜYKXÚXÚÛİ]›Y
Bˆ8 %™\Ù\™HİY\İÚXÚÛİ]™\]Z\™Hš\œİ[™\İ˜[YKÙY\Û™K\YÙHÚXÚÛİ][™Y™\ÜÂˆ]]ØÛÛ\][Û‹Ø]™HH›İ[™Y\˜XšXÈX™[È[˜ÛY[™Âˆ
6(ö+ö+¶a6.va¶b6)öa¶`È6)öa6b6-öa¶bˆ6)öa6av+¶*¶-v,H6a6*¶,öaöb¶a6.vava6b¶*H6)öa6*6+v*È6.vaˆ6.va¶b6)öa¶`È
X[™™\]Z\™HÙ\\˜]H[XZ[[™ˆÚ\[™Ë\Û™HšY[ËˆH›Ü›Y\ˆ[X\˜ZKÚ]K\šÈÌPŒŒ‘[™Ú[\YšYY\ÙX[™\Ù[][Û‚ˆ\È›İÈ™Z™XİYÈ\XØ]HHXİ]™HÚXÚÛİ]™Y›Ü™H™]šY]Ú[™ÈH^Xİ™X[\İXÈØ^ÙX[ˆİÛ™\‹X\›İ™Y[KX™ZYÙHÛ\ÜË[ZÙH™X]Y[\›Xœ›İÛ‹[™XšZÈ™\XÙ[Y[ˆÛˆ˜\ÚXËˆÛ\ÜË[ZÙH\ÈH[HÛÛY\İ\™˜XÙH\›Ş[X][Ûˆ˜]\ˆ[ˆXİX[›\ˆÜˆÚXÚÛİ]ÔÔËˆBˆ[™Û\ÚÛÜ™X\šÈ\È›İHÚXÚÛİ]ÙÛË‚ˆH[\[Y[YÚ\[™È[Y[™Y[˜[Y\Âˆ›İÛY\İXÈX[X[˜]\È6)öa6*¶b6-vb¶a6+ö)ö+¶a6)öa6,ö.vb6+öb¶*XÚ]İ]Ú[™Ú[™ÈZ\ˆšXÙ\ÈÜˆ™\ÚÛËˆ[™XÙ\ÈHÛÛ\XİØ]YHÜİÚ]Ğ\[\ˆÛ›H[ˆH[YKXÛÛ›ÛYØ\™Y›Ü™BˆÚXÚÛİ]ˆ˜]]™HÚÜYHØ[››İ[™›Ü˜ÙHHš^YØ]YH[Øš[H]\›ÈHX›XÈ˜[Y][Ûˆ\ˆ™[XZ[œÈ[ˆ[˜\›İ™YÙ\\˜]HÚÚXÙHÛˆ˜\ÚXËˆ\H^Hİ^\È˜]]™K›Èİ[ˆÚ\[™È›Û™Bˆ^\İË[™^[[Øˆ™[XZ[œÈ[ˆ\İ[ÙKÛÈ™X[^[Y[Ù][Y[\Èİ[[™\šYšYY‚‹HÌŒÈ8 %Ù]Ø]YHUÛÛXİ[ÛˆÈ™\›È[™[™ÈØ›YØ][Ûˆ™]šY]×JXÚ\Ú[ÛœËÌŒË\Ù]\Ø]YK]˜]XÛÛXİ[Û‹^™\›Ë\[™[™Ë\™]šY]Ë›Y
Bˆ8 %˜\ÙYÛˆHİÛ™\‰ÜÈİ][Y[]Ø[\™\È\È›ÈU™YÚ\İ˜][Û‹Ù]HØ]YHX[X[^ˆÛİ[H˜]Hœ›ÛHMIHÈ	HÚ[H™\Ù\š[™È^Z[˜Û\Ú]™HšXÚ[™ÈÙ™‹^ÛˆÚ\[™ÈÙ™‹[™ˆ›Èİ™\œšY\ÈÜˆ[\ÜY]HÛÛXİ[Û‹ˆHœ™\ÚÎLĞTˆÚXÚÛİ]ÚİÙY›È^[™H[™HÎLĞT‚ˆİ[Ú]Hİ\œ™[H\XØX›Hœ™YHÚ\[™Ëˆ™\›È\ÈH›ËXÛÛXİ[ÛˆÛÛ™šYİ\˜][Û‹›İBˆYØ[™\›Ë\˜][™ÈÛZ[KˆHÛÛ›™XİYÚÜYHİÜ™H\È™\›ÈØ[\È[ˆHš[ÜˆLˆ[ÛË]ˆ[]K]ÚYH[™›Ü™XØ\İİ\Y\È™[XZ[ˆ[šÛ›İÛˆ[™™\]Z\™H›Û\ÛÛ™š\›X][Û‹‚‹HÌ8 %X›\ÚH™XÛÛ˜Ú[YØ[\™\È[YHÚ]H™\šYšYYÚ]Ğ\\İ[˜][Û—JXÚ\Ú[ÛœËÌ\X›\Ú\™XÛÛ˜Ú[Y][YK]Ú]]™\šYšYY]Ú]Ø\›Y
Bˆ8 %XZÙHH™XÛÛ˜Ú[Y›İ\‹YÛ\[™Ø[\™\ËY˜]šXÛÛˆ[YHH]™HÚÜYH[YHÛ›HY\‚ˆX]Ú[™ÈH\İ[˜][ÛˆYØZ[œİHÛÛ›™XİYÚ]ÛÛİÓY]HY[]H[™Ü[š[™ÈHX›XÂˆÚ]Ğ\\Ú[™\ÜÈYÙHXYYØ[\™\È6`ö)öa6)ö*6,vb¶,˜ˆÙY\[œİYÜ˜[KÛ˜\Ú][™ZÕÚÂˆ\ØX›Y[[Z\ˆÙ™šXÚX[T“È\™H[™]šYX[H™\šYšYY™\Ù\™HH›Ü›Y\ˆXZ[ˆ[YH\Âˆ›Û˜XÚË[™È›İ\ÙHHØ]YHÜİ[\ˆ[X™\ˆ\ÈØ[\™\ÈÛÛXİ[™›Ü›X][Û‹ˆBˆŒ‹LLÌH[Y[™Y[YÈH™\šYšYY[XZ[[šÈ[™[ˆÙ™šXÚX[Û\Ú]İ]İY\ÜÚ[™È[ˆˆ\İ[˜][Û‹™\]Z\™\È[Ú^›Ûİ\ˆXÛÛœÈÈ™[XZ[ˆ[ˆÛ™H›İÈ]ÌŒ[™ÚY\‹[™\È›İÂˆ^Xİ]Y[ˆ]™H[YHMMÍÍÎM˜Ú]MMÍÌÍ™\Ù\™Y\È›Û˜XÚËˆH]\‚ˆ[Y[™Y[ÜXØ[H›Ü›X[^™\ÈH[™\]X[Õ‘ÈZ[›İ[™È[™Ú]™\È[Ú^Û\ÈHØ[YBˆİ™\ˆ[İ[Ûˆ[ˆ[œX›\ÚY™]šY]ÈMMÍÍÍŒÚ]İ][™[[™È[šÜÈ›Üˆ\ØX›Yˆ]›Ü›\Ë‚‹HÌH8 %YÜHØ[\™\È™ZYÙH[™\›Xœ›İÛˆİÜ™Yœ›Û[]WJXÚ\Ú[ÛœËÌKXYÜ]ÛËXÛÛİ\‹\İÜ™Yœ›Û\[]K›Y
Bˆ8 %\ÙHÛİ\˜ÙHÜ›İ[™Ñ‘ÌØ[™[šÈÍÌP˜Ú][\™˜XÙH^Y\œÈ\š]™YÛ›HBˆ˜[œÜ\™[˜ŞNÈ™XÛÛİ\ˆH^XİXY\ˆÛÜ™X\šÈÚ[İY]H[™^\İ[™ÈÛØÚX[Û\Ù[ÛY]šY\ÂˆÚ[H™\Ù\š[™È[šÈ[\ÎÈ\ÙHHØ\\ÜXÚYšXÈ‰HÛ\ÜÈİ\™˜XÙHX›İ™HHL‰HØÜš[HÚ]Œ	Bˆ^[™[ÎÈÙY\YYXK›ÙXİİØ]Ú\Ë˜]]™H\™\\Hœ˜[™[™Ë[™ÚXÚÛİ]İ]ÚYH\Âˆ[YK\[]HÛZ[NÈ[™™\]Z\™HİÛ™\ˆ\›İ˜[™Y›Ü™HX›\Ú[™ÈH™\šYšYY[œX›\ÚY™]šY]Ë‚‹HÌˆ8 %YÜXšZÈ\ÈHÚ\™YØ[\™\È[\™˜XÙH\Y˜XÙWJXÚ\Ú[ÛœËÌ‹XYÜ\XšZË\Ú\™Y]\Y˜XÙK›Y
Bˆ8 %\ÙHXšZÈÙZYÚÈÌL[™Ì›ÜˆHİÜ™Yœ›Û[™\ÜİÛÜ™^[İ][™\ÙHXšZÂˆÙ\\˜][H›ÜˆÚXÚÛİ]XY[™ÜÈ[™›ÙNÈÙY\H™\šYšYY[YH˜Y[œX›\ÚY[™™]Z[‚ˆØZ\›ÈÛˆHX›XÈİÜ™Yœ›Û[™[X\˜ZH[ˆXİ]™HÚXÚÛİ][[HÛÛÜ™[˜]Y›ÙXİ[Û‚ˆÚ[™Ù\È\™H[™\[™[HÛÛ™š\›YY‚‹HÌÈ8 %\ÙHÛ™H6av*6+¶,H6(öa¶b¶`˜›İHÙ]Üˆ][K\YXÙH[™K[ˆİ\İÛY\‹Y˜XÚ[™ÈÛÜWJXÚ\Ú[ÛœËÌË]\ÙK[ZXšÚ\˜KZ[‹\›ÙXİXÛÜK›Y
Bˆ8 %™[[İ™H]™\Hİ[™İYX›ŞÙ][™™YK\YXÙHÛZ[NÈÚİÈH^Xİ›ÙXİİ[[X\Bˆ6av*6+¶,H6(öa¶b¶`˜\È6+v`v,H6)öa6)ö,öaH6(öb6)öa6-6.v)ö,XÈ[™ÙY\›ÙXİ]KİÜ™Yœ›ÛYÙ\Ë™]\ØX›H[YBˆY˜][Ë[™HÛY\YÙHY]H\ØÜš\[Ûˆ[YÛ™YÈ]\ÚXØ[Ù™™\‹‚‹HÌ8 %\ÙHÙ\İ\›ˆ8 $ÎXYÚ]ÈXÜ›ÜÜÈİ\İÛY\‹Y˜XÚ[™ÈİÜ™Yœ›Û[Y\˜[×JXÚ\Ú[ÛœËÌ]\ÙK]Ù\İ\›‹YYÚ]ËXXÜ›ÜÜË\İÜ™Yœ›Û›Y
Bˆ8 %™[™\ˆ]™\HİÜ™KX]]Ü™YXÚ[X[[Y\˜[Ú]Ù\İ\›ˆYÚ]È[ˆ]™\HİÜ™Yœ›ÛØØ[Kˆ›Ü›X[^™H]H[YKQÓHÛÛ[™\Ù\™H^Xİİ\İÛY\‹X]]Ü™Y[™XXÚ[™K\™XYX›H˜[Y\Ëˆ[™™\šYH˜]]™HÚXÚÛİ]\ÈHÙ\\˜]HÚÜYKXÛÛ›ÛYİ\™˜XÙKˆHİÛ™\ˆ\›İ™Y[™ˆ^Xİ]YİÜ™Yœ›ÛX›XØ][ÛˆÛˆŒ‹LKLHÚ[HXØÙ\[™ÈHØİ[Y[Y˜]]™H\˜XšXËBˆÚXÚÛİ]^Ù\[Û‹‚‹HÌH8 %YHH[\H›ÙXİ\™]šY]ÈÙXİ[Ûˆ[[]][XÈ™]šY]ÜÈ^\İJXÚ\Ú[ÛœËÌKZYKY[\K\›ÙXİ\™]šY]ÜË›Y
Bˆ8 %™[[İ™HHÛÛ\]H™]šY]ÈXY[™ËÚYÙ]ÛÛZ[™\‹YÙH]K[\ÙYÜXÚ[™Ë[™\ÛÛ]Yˆİ[[™Èœ›ÛH]™\H›ÙXİYÙNÈÙY\™]šY]ËX\]H[İXÚY[™™\İÜ™HH™]šY]Èİ\™˜XÙHÛ›Bˆ›İYÚH]\ˆİÛ™\‹X\›İ™Y[\[Y[][Ûˆ˜XÚÙYH]][XÈ™]šY]ÜËˆ\È™\Ù[][Û‚ˆÚ[™ÙH\È]™H[ˆ[YHMNŒÎ‚‚ˆÈÈİ\\œÙYYXÚ\Ú[ÛœÂ‚‹HÌH8 %YÙ[XÈ\ØÛİ™\HØ[››İ\\ÜÈØ][ÙÈÛİ™\›˜[˜ÙWJXÚ\Ú[ÛœËÌKXYÙ[XËXØ][ÙËYÛİ™\›˜[˜ÙK›Y
Bˆ8 %İ\\œÙYYHXÚ\Ú[Ûˆ‹‚‚YH[X™\™YXÚ\Ú[ÛˆÚ[ˆØÛÜK\˜Ú]Xİ\™KÙXİ\š]HÜİ\™KÛİ\˜ÙH]]Üš]KÜˆÜ\˜][™ÂœÛXŞHÚ[™Ù\Ë‚