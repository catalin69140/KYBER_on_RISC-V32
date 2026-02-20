# 08 - Security and Design Rationale

This file explains *why* KeyGen is designed the way it is, not just what each line does.

## 1) Why noise is required

Core equation is noisy linear algebra over polynomial rings:

```text
t = A*s + e
```

- `s` is secret.
- `e` is small random noise.

If `e` were missing or badly sampled, recovering `s` from public data would become much easier. The noise term is central to MLWE-style hardness.

## 2) Why coefficients are small

Kyber samples from centered binomial distributions (CBD), producing small coefficients around zero.

Design reason:

- small noise keeps decryption correct,
- still hard enough to invert at chosen parameters,
- practical for efficient arithmetic and packing.

## 3) Why NTT is used

NTT transforms polynomial multiplication into cheaper pointwise operations.

Security reason: none directly. Performance reason: critical.

- makes KeyGen/Encap/Decap practical on constrained and embedded targets.
- Denisa thesis repeatedly highlights NTT/INTT as core optimization targets.

## 4) Why A is deterministic and derived from rho

`A` is generated from public seed `rho` instead of transmitted as full matrix.

Benefits:

- saves key size/bandwidth,
- deterministic reproducibility across peers,
- no secret dependence in matrix generation itself.

## 5) Why rho is public

`rho` is appended to `pk`, so any party can regenerate `A` exactly.

This is not a leak: `A` is intended public structure in this design.

## 6) Why H(pk) is included in secret key

`H(pk)` is stored in `sk` and reused during decapsulation reencryption checks.

Benefits:

- avoids recomputation,
- keeps CCA transform inputs explicit,
- supports constant-time decapsulation flow with fewer branches/lookups.

## 7) Why z is included in secret key

`z` is a fallback secret used when ciphertext verification fails.

Benefits:

- decapsulation can output pseudorandom-looking shared secret even on invalid ciphertext,
- reduces oracle risk from rejection behavior.

In code this appears with `cmov(...)` in decapsulation path.

## 8) Side-channel and fault perspective

The `2025-1222.pdf` SoK emphasizes that practical vulnerabilities often target:

- NTT operations,
- Keccak/SHAKE operations,
- encode/decode and message transforms,
- keygen, encaps, decaps paths.

That is directly relevant to this codebase because KeyGen includes all three classes (sampling via SHAKE, NTT arithmetic, and packing).

Practical implication:

- deterministic traces are useful for profiling and debugging,
- production deployments still need hardened implementations against timing/power/fault leakage.

## 9) RISC-V and embedded performance considerations

From Denisa thesis context:

- NTT/INTT and reductions are major optimization focus.
- Keccak-heavy parts can dominate total KEM block cycles.

For embedded profiling, this means:

1. optimize arithmetic kernels (NTT/reduction),
2. optimize SHAKE/Keccak path,
3. keep memory traffic and serialization predictable.

## 10) Design tradeoff summary

Kyber KeyGen is a balance of:

- security: noisy structured lattice equations,
- compactness: deterministic matrix seed,
- speed: NTT-domain arithmetic,
- CCA robustness: `H(pk)` and `z` in secret key.

## Ambiguity note

Your provided ML-KEM-style summary includes explicit RNG-failure return (`bottom`). This repository does not expose that failure path in KeyGen (callers assume `randombytes` success). That is a software integration policy difference, not a change to the core lattice design.

## References used in this file

- `D_Greconici___KYBER_on_RISC-V.pdf`: keygen equations and implementation-oriented rationale.
- `2021-561.pdf`: Kyber parameter/algorithm restatements and implementation focus.
- `NTT.pdf`: NTT complexity and polynomial multiplication framing.
- `2025-1222.pdf`: side-channel/fault attack surface perspective on PQC implementations including ML-KEM/Kyber.

## In simple terms:

Kyber KeyGen looks the way it does because it needs to be secure, fast, compact, and CCA-safe at the same time. Noise provides hardness, NTT provides speed, `rho` provides reproducible public structure, and `H(pk)`/`z` make decapsulation robust.
