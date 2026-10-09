# Dependency audit triage (2026-10-08)

Container npm audit before/after JSON is retained in ignored validation/. No forced majors, advisory suppression or license changes. Targeted semver-compatible updates only; Next explicitly pinned to ~16.3.8 rather than unnecessary 16.4.0.

## Changed installed versions
- frontend: `node_modules/@node-minify/core/node_modules/brace-expansion` 2.1.4 → 2.1.7
- frontend: `node_modules/brace-expansion` 1.1.18 → 1.1.21
- frontend: `node_modules/eslint-config-next/node_modules/brace-expansion` 5.0.9 → 5.0.12
- frontend: `node_modules/glob/node_modules/brace-expansion` 5.0.9 → 5.0.12
- frontend: `node_modules/jsdom/node_modules/undici` 8.10.2 → 8.11.2
- frontend: `node_modules/next` 16.3.5 → 16.3.8
- frontend: `node_modules/proxy-addr` 2.0.7 → 2.0.8
- frontend: `node_modules/readdir-glob/node_modules/brace-expansion` 2.1.4 → 2.1.7
- frontend: `node_modules/sharp` 0.35.4 → 0.35.5
- frontend: `node_modules/source-map-js` 1.2.1 → 1.2.2

## frontend advisories and reachability
- `@ladle/react` installed ['5.1.1']: high; transitive advisory chain; exact via/effects in audit JSON
- `@next/eslint-plugin-next` installed ['16.3.5']: high; transitive advisory chain; exact via/effects in audit JSON
- `brace-expansion` installed ['2.1.4', '5.0.12', '5.0.12', '1.1.18', '5.0.9', '5.0.9', '2.1.4']: high; https://github.com/advisories/GHSA-q2hr-2g5m-vwhr — brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service; https://github.com/advisories/GHSA-q2hr-2g5m-vwhr — brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service; https://github.com/advisories/GHSA-q2hr-2g5m-vwhr — brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service; https://github.com/advisories/GHSA-qhr7-859c-m2p7 — brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion; https://github.com/advisories/GHSA-qhr7-859c-m2p7 — brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion; https://github.com/advisories/GHSA-qhr7-859c-m2p7 — brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion; https://github.com/advisories/GHSA-6j4f-fj2g-mc7p — brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion; https://github.com/advisories/GHSA-6j4f-fj2g-mc7p — brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion; https://github.com/advisories/GHSA-6j4f-fj2g-mc7p — brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion
- `braces` installed ['3.0.3']: high; https://github.com/advisories/GHSA-vfj7-8cjw-p6xm — braces vulnerable to stack-exhaustion denial of service through deeply nested patterns
- `eslint-config-next` installed ['16.3.5']: high; transitive advisory chain; exact via/effects in audit JSON
- `fast-glob` installed ['3.3.1', '3.3.3']: high; transitive advisory chain; exact via/effects in audit JSON
- `globby` installed ['14.1.0']: high; transitive advisory chain; exact via/effects in audit JSON
- `micromatch` installed ['4.0.8']: high; transitive advisory chain; exact via/effects in audit JSON
- `miniflare` installed ['5.20260918.0-alpha']: high; transitive advisory chain; exact via/effects in audit JSON
- `next` installed ['16.3.5']: critical; https://github.com/advisories/GHSA-vcvr-r3jv-pc5j — Next.js: Remote Code Execution in next/og ImageResponse; https://github.com/advisories/GHSA-3w37-wq28-93x7 — Next.js: Pending `use cache` fill can leak Draft Mode content into regular responses and persisted pages; https://github.com/advisories/GHSA-4jqv-mc3x-m676 — Next.js has cache poisoning of SSG and ISR pages in self-hosted applications; https://github.com/advisories/GHSA-39w2-rjm5-chcv — Next.js has information disclosure in development server's Model Context Protocol endpoint; https://github.com/advisories/GHSA-f87g-xv8r-7p7x — Next.js has information disclosure in App Router metadata image routes via dynamicParams bypass; https://github.com/advisories/GHSA-mcj8-r9mp-w47p — Next.js has cache poisoning in SSG/ISR rendering that leads to cross-user content substitution and persistent denial of service; https://github.com/advisories/GHSA-cjq9-62q9-8jv4 — Next.js has Server-Side Request Forgery in Image Optimization
- `proxy-addr` installed ['2.0.7']: critical; https://github.com/advisories/GHSA-jqcg-44mw-7w3h — proxy-addr vulnerable to IP spoofing via IPv4-mapped IPv6 trust subnet
- `sharp` installed ['0.35.4']: high; https://github.com/advisories/GHSA-wq5f-xc86-pv6w — sharp : Vulnerability in librsvg dependency CVE-2026-96889
- `source-map-js` installed ['1.2.1']: high; https://github.com/advisories/GHSA-68fv-2mgg-jv7q — source-map-js allows event-loop denial of service through indexed source-map section offsets
- `undici` installed ['8.10.2', '7.29.0']: high; https://github.com/advisories/GHSA-3wwx-pv8p-q78v — undici vulnerable to Denial of Service via unhandled error in WebSocket permessage-deflate decompression; https://github.com/advisories/GHSA-pmjh-fq2x-6v4x — undici vulnerable to Denial of Service via orphaned RetryHandler response body; https://github.com/advisories/GHSA-r53p-7pc4-xj5r — undici vulnerable to downstream response splitting via retry interceptor; https://github.com/advisories/GHSA-rfgv-xxqx-mfg5 — undici vulnerable to Denial of Service via unrequested WebSocket subprotocol; https://github.com/advisories/GHSA-3xpg-4rpp-hhhm — undici vulnerable to Denial of Service via unbounded decompression of compressed responses; https://github.com/advisories/GHSA-2jfj-6hjv-fm6j — undici vulnerable to cross-user cookie disclosure via Set-Cookie caching in shared caches; https://github.com/advisories/GHSA-2gqq-gqf2-x968 — undici vulnerable to response truncation via oversized chunked responses in the dump interceptor; https://github.com/advisories/GHSA-w293-vg96-wgc3 — undici vulnerable to TLS certificate validation bypass via dropped connect options in BalancedPool; https://github.com/advisories/GHSA-8436-99hf-9mmv — undici vulnerable to caching and replay of unsafe HTTP method responses; https://github.com/advisories/GHSA-rx4f-c7p8-82vq — undici vulnerable to Denial of Service via WebSocketStream unclean close
Remaining counts: {'info': 0, 'low': 5, 'moderate': 9, 'high': 8, 'critical': 0, 'total': 22}
- backend: `node_modules/@modelcontextprotocol/sdk` 1.30.0 → 1.32.1
- backend: `node_modules/brace-expansion` 5.0.9 → 5.0.12
- backend: `node_modules/fast-uri` 3.1.6 → 3.1.8
- backend: `node_modules/proxy-addr` 2.0.7 → 2.0.8
- backend: `node_modules/source-map-js` 1.2.1 → 1.2.2

## backend advisories and reachability
- `@modelcontextprotocol/sdk` installed ['1.30.0']: high; https://github.com/advisories/GHSA-6qxp-vccf-f47h — MCP TypeScript SDK: OAuth client could send credentials to an authorization server chosen by the MCP server
- `brace-expansion` installed ['5.0.9']: high; https://github.com/advisories/GHSA-q2hr-2g5m-vwhr — brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service; https://github.com/advisories/GHSA-qhr7-859c-m2p7 — brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion; https://github.com/advisories/GHSA-6j4f-fj2g-mc7p — brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion
- `fast-uri` installed ['3.1.6']: high; https://github.com/advisories/GHSA-qw65-cvwx-89v3 — fast-uri vulnerable to authority injection via an unvalidated port in serialize; https://github.com/advisories/GHSA-58mr-gqgx-xq4g — fast-uri vulnerable to host confusion via an unclosed bracket in the URI authority; https://github.com/advisories/GHSA-hrr3-gc8f-f4qj — fast-uri vulnerable to inconsistent host case normalization via percent-encoded octets
- `proxy-addr` installed ['2.0.7']: critical; https://github.com/advisories/GHSA-jqcg-44mw-7w3h — proxy-addr vulnerable to IP spoofing via IPv4-mapped IPv6 trust subnet
- `source-map-js` installed ['1.2.1']: high; https://github.com/advisories/GHSA-68fv-2mgg-jv7q — source-map-js allows event-loop denial of service through indexed source-map section offsets
Remaining counts: {'info': 0, 'low': 0, 'moderate': 7, 'high': 0, 'critical': 0, 'total': 7}

## Runtime interpretation
Backend now has zero high/critical findings; seven moderate remain, not suppressed. Frontend Next request processing, proxy-addr (transitive server tooling), Sharp image processing and source-map-js were patched. MCP SDK is reachable through enabled authenticated connector transports and was patched. fast-uri and brace expansion parsing were patched.
Frontend remaining high findings: braces nested-pattern exhaustion propagates to micromatch/fast-glob/globby, eslint-config-next/@next/eslint-plugin-next and Ladle. These are lint/catalog/build-tool paths, not browser document or API request parsers; npm currently offers no compatible braces fix. Do not downgrade eslint-config-next to Next14 just to clear audit. Undici7.29.0 is pinned by miniflare/wrangler, the unused Cloudflare preview/deploy tooling; Rancher target is Vercel and Express. It is not imported by application code; no override across the pinned preview tool API was applied. Source toolchain is still vulnerable if given hostile patterns or run with those optional tooling features. Registry advisory data changes over time; rerun before release. This is reachability triage, not a claim that unresolved vulnerabilities are harmless.
