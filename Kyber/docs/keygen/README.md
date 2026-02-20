# Kyber / ML-KEM KeyGen Documentation Hub

This folder contains an implementation-first, spec-referenced walkthrough of **Kyber Key Generation** as implemented in this repository (`Kyber/crypto_kem/...`), including both **Round 1 (r1)** and **Round 2 (r2)** variants.

The docs are designed for:

- developers learning the flow end-to-end,
- engineers debugging real traces,
- researchers comparing spec notation vs actual code,
- contributors validating r1/r2 differences and KeyGen outputs.

---

## What This Documentation Covers

- How `crypto_kem_keypair` (KEM layer) calls `indcpa_keypair` (K-PKE layer).
- How randomness is consumed and expanded into `rho` and `sigma`.
- How `s` and `e` are sampled (PRF + CBD).
- How matrix `A` is deterministically generated from `rho`.
- How NTT is used to accelerate multiplication.
- How `t` is built and encoded into public key bytes.
- How final KEM secret key is assembled as `sk0 || pk || H(pk) || z`.
- How and why r1 and r2 differ in parameters, encoding, and arithmetic flow.
- How to reproduce deterministic runs and tracing in this repository.

---

## Reading Order (Recommended)

1. [00_notation.md](./00_notation.md)
2. [01_overview.md](./01_overview.md)
3. [02_randomness_and_seeds.md](./02_randomness_and_seeds.md)
4. [03_k_pke_keygen.md](./03_k_pke_keygen.md)
5. [04_sampling_and_polynomials.md](./04_sampling_and_polynomials.md)
6. [05_ntt_and_matrix_generation.md](./05_ntt_and_matrix_generation.md)
7. [06_public_key_construction.md](./06_public_key_construction.md)
8. [07_encoding_and_output.md](./07_encoding_and_output.md)
9. [08_security_and_design_rationale.md](./08_security_and_design_rationale.md)
10. [09_r1_vs_r2_differences.md](./09_r1_vs_r2_differences.md)
11. [10_keygen_flow_summary.md](./10_keygen_flow_summary.md)

---

## Which File Answers Which Question?

| Question | Go to |
|---|---|
| What do symbols like `x^`, `o`, `x'`, `x_bar` mean? | [00_notation.md](./00_notation.md) |
| What is the high-level KeyGen architecture (KEM vs K-PKE)? | [01_overview.md](./01_overview.md) |
| Where does randomness enter and how are `rho/sigma` derived? | [02_randomness_and_seeds.md](./02_randomness_and_seeds.md) |
| How can I make runs deterministic for tracing? | [02_randomness_and_seeds.md](./02_randomness_and_seeds.md) |
| Where does `indcpa_keypair` fit and what does `k` change? | [03_k_pke_keygen.md](./03_k_pke_keygen.md) |
| How are `s` and `e` sampled and why is small noise required? | [04_sampling_and_polynomials.md](./04_sampling_and_polynomials.md) |
| How is matrix `A` generated from `rho`? | [05_ntt_and_matrix_generation.md](./05_ntt_and_matrix_generation.md) |
| Why is NTT used and where do domain conversions happen? | [05_ntt_and_matrix_generation.md](./05_ntt_and_matrix_generation.md) |
| How is `t = A*s + e` computed in code? | [06_public_key_construction.md](./06_public_key_construction.md) |
| How are keys encoded into bytes and laid out in memory? | [07_encoding_and_output.md](./07_encoding_and_output.md) |
| Why include `H(pk)` and `z` in `sk`? | [07_encoding_and_output.md](./07_encoding_and_output.md), [08_security_and_design_rationale.md](./08_security_and_design_rationale.md) |
| What changed between r1 and r2? | [09_r1_vs_r2_differences.md](./09_r1_vs_r2_differences.md) |
| Can I get one concise numbered flow from setup to output? | [10_keygen_flow_summary.md](./10_keygen_flow_summary.md) |

---

## Fast Reading Paths

| Goal | Suggested path |
|---|---|
| New to Kyber | `00 -> 01 -> 10` |
| Debugging wrong key bytes | `02 -> 05 -> 06 -> 07 -> 10` |
| Deterministic tracing / profiling | `02 -> 05 -> 07 -> 10` |
| Security rationale review | `04 -> 08 -> 09` |
| r1/r2 migration understanding | `03 -> 05 -> 07 -> 09` |

---

## Implementation Map (Code to Docs)

| Code file(s) | Primary content covered in docs |
|---|---|
| `crypto_kem/*/*/kem.c` | KEM entrypoint, secret key augmentation (`pk`, `H(pk)`, `z`) |
| `crypto_kem/*/*/indcpa.c` | K-PKE keygen core: seed split, matrix generation, multiply path |
| `crypto_kem/*/*/poly.c` | noise sampling glue, NTT/invNTT, reductions, serialization |
| `crypto_kem/*/*/polyvec.c` | vector ops, pointwise accumulate, NTT vector transforms |
| `crypto_kem/*/*/cbd.c` | centered binomial sampling details |
| `crypto_kem/*/*/params.h` | per-variant constants (`k`, `q`, `eta`, byte sizes) |
| `crypto_kem/*/*/symmetric.h` + `symmetric-fips202.c` | hash/XOF/PRF indirection (r2, 90s/non-90s mapping) |
| `common/randombytes.c` | deterministic random source used in this repo setup |

---

## Notation and Data-Flow Mini-Map

```text
KEM.KeyGen
  -> K-PKE.KeyGen
      d --G--> (rho, sigma)
      sigma --PRF/CBD--> s,e
      rho --XOF/Sample--> A
      NTT: s -> s^   (r2 also e -> e^)
      t from A,s,e
      encode pk, sk0
  -> sk = sk0 || pk || H(pk) || z
  -> return (pk, sk)
```

---

## Deterministic Tracing Notes (Repository-Specific)

This repository is particularly trace-friendly because of deterministic randombytes setup.

- RNG implementation: `Kyber/common/randombytes.c`
- fixed seed array is hardcoded
- deterministic test-vector style harnesses also exist in:
  - `Kyber/mupq/crypto_kem/testvectors.c`
  - `Kyber/mupq/crypto_kem/testvectors-host.c`

Practical reproducibility conditions:

1. start from same process state,
2. keep call order unchanged,
3. avoid extra `randombytes` calls in between,
4. keep the same build/configuration.

---

## Known Implementation-Specific Observations (Documented)

- This repo contains **Kyber round code** (`r1`, `r2`) and references, not a direct final FIPS-203 ML-KEM code drop.
- ML-KEM-style explicit RNG failure return (`bottom`) is not surfaced by KeyGen call sites here.
- Public-key packing differs materially between r1 and r2.
- `kyber768r1` has a SHAKE state type style difference from `kyber512r1`/`kyber1024r1` in `gen_matrix` code.

---

## Source References Used Across This Folder

- Denisa Greconici thesis:
  - `D_Greconici___KYBER_on_RISC-V.pdf`
  - base project context, algorithm flow mapping, r1/r2 implementation perspective
- Kyber-on-ARM implementation paper:
  - `2021-561.pdf`
  - algorithm restatement and parameter/implementation framing
- NTT tutorial paper:
  - `NTT.pdf`
  - NTT complexity and convolution intuition
- Side-channel reassessment paper:
  - `2025-1222.pdf`
  - practical attack surface and implementation-hardening perspective

---

## Maintenance Checklist (When Updating KeyGen Docs)

Use this quick checklist whenever code changes:

- Update function/line references if signatures or call order change.
- Re-check `params.h` values for each `{512,768,1024}` and `{r1,r2}` path.
- Verify packing layouts (`pack_pk`, `pack_sk`) still match documented byte maps.
- Re-run deterministic trace sanity checks if RNG or harness code changed.
- Keep `10_keygen_flow_summary.md` aligned with actual execution order.
- Re-check `09_r1_vs_r2_differences.md` if any arithmetic or encoding path changes.

---

## Suggested Next Read

If you only have 10 minutes, read:

1. [00_notation.md](./00_notation.md)
2. [01_overview.md](./01_overview.md)
3. [10_keygen_flow_summary.md](./10_keygen_flow_summary.md)

Then jump to whichever deep-dive section matches your current question.
