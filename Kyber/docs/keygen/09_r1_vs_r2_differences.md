# 09 - Round 1 vs Round 2 Differences

This file answers four questions for KeyGen-relevant changes:

- WHAT changed?
- WHERE in code did it change?
- WHY was it changed?
- IMPACT on security/performance?

## Quick classification of this repository

This repository contains multiple lines:

- `*r1` and `*ref1`: Kyber Round 1 style code
- `*r2` and `*ref2`: Kyber Round 2 style code

It is **not** a direct final FIPS-203 ML-KEM codebase. It is a Kyber-round implementation set used for RISC-V optimization and comparison.

## Difference table (KeyGen-focused)

| Topic | Round 1 in this repo | Round 2 in this repo | Where in code | Why it changed | Impact |
|---|---|---|---|---|---|
| Modulus `q` | `7681` | `3329` | `params.h` (`kyber*r1` vs `kyber*r2`) | moved to later-round parameter set | changes reduction behavior, serialization density, arithmetic cost |
| Noise parameter | depends on `k`: `eta={5,4,3}` | fixed `eta=2` | `params.h`, `cbd.c` | updated distribution choices in newer round design | affects error shape and implementation cost |
| Public key encoding | compressed polyvec + `rho` | full polyvec bytes + `rho` | `indcpa.c` `pack_pk` | different compression/layout design | changes pk size and pack/unpack cost |
| Matrix generation helper | inline SHAKE128 + rejection loop | `xof_absorb` + `rej_uniform` helper | `indcpa.c`, `symmetric*.c` | cleaner abstraction and reusable XOF pipeline | code clarity and maintainability; similar asymptotic cost |
| KeyGen domain flow | `s` NTT, `e` added after `invNTT` | both `s` and `e` transformed before final add/reduce | `indcpa.c` keypair body | arithmetic representation update | different order of normalization/reduction |
| Multiply primitive | explicit per-coefficient Montgomery path in `polyvec_pointwise_acc` | `poly_basemul` + accumulation + `poly_reduce` | `polyvec.c` | refactoring and arithmetic tuning | may improve structure and vectorization opportunities |
| Hash API style | direct `sha3_256/sha3_512` calls | `hash_h/hash_g/kdf` macros via `symmetric.h` | `kem.c`, `symmetric.h` | allows 90s/non-90s backend selection | implementation flexibility |
| CBD implementation | supports eta 3/4/5 code paths | supports eta 2 code path only | `cbd.c` | aligned with new parameter selection | simpler/faster sampling path |

## Explicit parameter comparison (all security levels)

### Round 1 (`*r1/params.h`)

- `kyber512`: `k=2`, `q=7681`, `eta=5`
- `kyber768`: `k=3`, `q=7681`, `eta=4`
- `kyber1024`: `k=4`, `q=7681`, `eta=3`

### Round 2 (`*r2/params.h`)

- `kyber512`: `k=2`, `q=3329`, `eta=2`
- `kyber768`: `k=3`, `q=3329`, `eta=2`
- `kyber1024`: `k=4`, `q=3329`, `eta=2`

## Relation to modern ML-KEM notation

Your provided summary uses ML-KEM-style `eta1` values (`3` for 512, `2` for 768/1024). That aligns with post-round Kyber/ML-KEM parameter direction, but **does not match this repository's r1 code**, and only partially resembles r2.

So when documenting this repo precisely:

- use actual constants from local `params.h`,
- then explain how that differs from modern ML-KEM narrative.

## Security/performance implications at a glance

- Lower `q` and changed `eta` influence both hardness calibration and arithmetic efficiency.
- Encoding changes alter bandwidth and parse/pack overhead.
- Domain-flow and multiply-kernel changes impact cycle counts and optimization strategy.

Denisa thesis and round comparisons in this repo were explicitly built to evaluate these tradeoffs.

## Notable oddity to track

In r1 variants, `kyber768r1` uses a different SHAKE state type style in `gen_matrix` than sibling `kyber512r1` and `kyber1024r1`. Functionality appears equivalent, but it is a real code inconsistency worth noting in reviews.

## References used in this file

- `D_Greconici___KYBER_on_RISC-V.pdf`: Round 1 vs Round 2 optimization context.
- `2021-561.pdf`: parameter table and Kyber algorithm form under `q=3329` family.
- Code: `params.h`, `indcpa.c`, `poly.c`, `polyvec.c`, `symmetric.h` across `r1/r2` folders.

## In simple terms:

Round 2 in this repo is not just "round 1 with small edits." It changes core parameters, encoding, and arithmetic flow. If you mix assumptions between rounds, KeyGen traces and outputs will not line up.
