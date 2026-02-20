# 00 - Notation and Reading Guide

This file defines the notation used across the KeyGen documentation and maps it to names used in the `Kyber/` code.

## Why this file exists

Kyber/ML-KEM descriptions use mathematical notation, while the implementation uses short C variable names. If you can map one to the other, the code becomes much easier to follow.

## Core symbols

| Symbol in docs/spec | Meaning | How to read it |
|---|---|---|
| `x^` (x-hat) | `x` represented in NTT domain | "x transformed for fast polynomial multiplication" |
| `x o y` | NTT-domain multiplication (pointwise multiply + accumulate) | "multiply in transform domain" |
| `x'`, `x_bar` | related/intermediate representation of `x` | "same logical value, different stage/encoding/domain" |
| `A` | matrix of polynomials | `k x k` polynomial matrix |
| `A^` | matrix sampled/used in NTT form | matrix used directly in fast multiply path |
| `s` | secret polynomial vector | private algebraic trapdoor |
| `e` | error/noise polynomial vector | hides exact linear relation |
| `t` | public polynomial vector | `A*s + e` (domain-dependent form) |
| `rho` | public seed for matrix generation | lets peer regenerate `A` |
| `sigma` | secret seed for noise generation | drives sampling of `s` and `e` |
| `z` | fallback secret value in CCA secret key | used on decapsulation failure |

## Ring and vector notation

- Coefficients live modulo `q`.
- Polynomials are length `N=256`.
- Vectors have length `k` where:
  - `k=2` -> Kyber512
  - `k=3` -> Kyber768
  - `k=4` -> Kyber1024

Matrix-vector form:

```text
A : k x k polynomial matrix
s : k-vector
e : k-vector
t : k-vector

t = A*s + e
```

In the implementation, multiplication is normally done in NTT form for speed.

## Why Kyber uses NTT domain

Polynomial multiplication by schoolbook convolution costs roughly `O(N^2)`. NTT reduces that to `O(N log N)` by turning convolution into pointwise multiplication.

This is exactly why KeyGen builds and multiplies `A^` and `s^` before producing `t`.

References:

- `NTT.pdf` (A Complete Beginner Guide to the Number Theoretic Transform): convolution and NTT complexity discussion.
- `D_Greconici___KYBER_on_RISC-V.pdf` (Denisa thesis), Chapter 4: why NTT/INTT dominates optimized Kyber kernels.

## Code-name mapping used in this repository

Most important names in `indcpa.c` and `kem.c`:

| Code variable | Meaning |
|---|---|
| `pkpv` | public-key polynomial vector (`t`-side data) |
| `skpv` | secret-key polynomial vector (`s` or `s^`) |
| `e`, `ep`, `epp` | error polynomials/vectors in keygen/enc paths |
| `sp` | ephemeral secret vector used in encryption path |
| `bp`, `v` | ciphertext-side polynomial objects |
| `publicseed` | `rho` |
| `noiseseed` | `sigma` |
| `nonce` | per-call counter for PRF-based sampling |
| `buf` | temporary byte buffer, often used for seed expansion |
| `kr` | temporary key/coins buffer in KEM layer |
| `cmp` | re-encrypted ciphertext used for CCA verification |

## Domain-conversion verbs in code

| Function | Meaning |
|---|---|
| `poly_ntt`, `polyvec_ntt` | normal domain -> NTT domain |
| `poly_invntt`, `polyvec_invntt` | NTT domain -> normal domain |
| `poly_frommont` | Montgomery representation -> standard representation |
| `poly_reduce`, `polyvec_reduce` | coefficient reduction modulo `q` |

## Practical reading rule

When you see `*_ntt` called, pause and ask:

1. Which objects are now in transformed domain?
2. Which multiplication happens next?
3. Where do we convert back (if we do)?

That single rule prevents most confusion when tracing KeyGen.

## In simple terms:

Think of NTT as a temporary "fast math workspace". Kyber moves data into that workspace (`x^`), does multiplication there (`o`), and then stores/transmits standard encoded bytes. The math object stays the same; only representation changes.
