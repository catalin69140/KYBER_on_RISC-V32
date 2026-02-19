# Kyber KeyGen Overview (R1 and R2)

This document explains how key generation is implemented in this repository and how it maps to the Kyber algorithm descriptions in the thesis PDF:

- D. Greconici, *Kyber on RISC-V*: [PDF](https://www.cs.ru.nl/masters-theses/2020/D_Greconici___KYBER_on_RISC-V.pdf)
- Algorithm list (CPA/CCA KeyGen): page `vi`
- `CPA.KeyGen()` (Algorithm 1): page `12`
- `CCA.KeyGen()` (Algorithm 4): page `15`
- `CCA.Encapsulation()` / `CCA.Decapsulation()` (Algorithms 5/6): page `16`

## Scope in This Repository

The KeyGen entrypoint is:

- `crypto_kem_keypair()` in:
  - `crypto_kem/kyber512/kyber512r1/kem.c`
  - `crypto_kem/kyber768/kyber768r1/kem.c`
  - `crypto_kem/kyber1024/kyber1024r1/kem.c`
  - `crypto_kem/kyber512/kyber512r2/kem.c`
  - `crypto_kem/kyber768/kyber768r2/kem.c`
  - `crypto_kem/kyber1024/kyber1024r2/kem.c`

It calls `indcpa_keypair()` in `indcpa.c` (same folder), which is the K-PKE/CPA key generation stage.

## End-to-End Flow

```text
crypto_kem_keypair(pk, sk)          [KEM layer]
  |
  +--> indcpa_keypair(pk, sk0)      [K-PKE / CPA.KeyGen]
  |      |
  |      +--> seed expansion: d -> (rho, sigma)
  |      +--> sample s, e from sigma (CBD via PRF/SHAKE)
  |      +--> generate A_hat from rho (XOF + rejection)
  |      +--> compute t (R1: invNTT(A_hat o s_hat)+e, R2: in NTT form + reduce)
  |      +--> pack pk and sk0
  |
  +--> append pk into CCA secret key
  +--> append H(pk)
  +--> append random z
  |
  '--> output (pk, sk)
```

This matches the thesis split between:

- `CPA.KeyGen()` (Algorithm 1, p.12)
- `CCA.KeyGen()` (Algorithm 4, p.15)

## R1 vs R2 at a Glance

| Topic | Round 1 in repo | Round 2 in repo |
|---|---|---|
| Modulus `q` | `7681` | `3329` |
| Noise parameter | `eta` depends on `k` (`5/4/3`) | `eta = 2` |
| Public-key packing | compressed polyvec + `rho` | full polyvec bytes + `rho` |
| Matrix generation helper | direct SHAKE128 absorb/squeeze code path | abstracted XOF (`xof_absorb`, `xof_squeezeblocks`) + rejection helper |
| Hash wrappers in KEM | direct `sha3_256/sha3_512` calls | `hash_h/hash_g/kdf` macros in `symmetric.h` |

## Mapping to Your Provided Visual Flow

Your three-box flow (`[19]` ML-KEM.KeyGen, `[16]` ML-KEM.KeyGen_internal, `[13]` K-PKE.KeyGen) corresponds to:

- `[19]` -> `crypto_kem_keypair()` in `kem.c`
- `[16]` -> body of `crypto_kem_keypair()` after `indcpa_keypair()`
- `[13]` -> `indcpa_keypair()` in `indcpa.c`

## Notes on Terminology

- Your notation (`x^`, `o`, `x'`, `x_bar`) is used in this doc set as:
  - `x_hat` for NTT-domain values
  - `o` for NTT-domain pointwise multiplication/accumulation
- This repository is Kyber Round 1/Round 2 code, not final FIPS ML-KEM API text. Where needed, mapping to ML-KEM-style naming is explained in later files.

## Next

- [02_randomness_and_seeds.md](./02_randomness_and_seeds.md)
- [03_k_pke_keygen.md](./03_k_pke_keygen.md)
- [04_sampling_and_polynomials.md](./04_sampling_and_polynomials.md)
- [05_ntt_and_matrix_generation.md](./05_ntt_and_matrix_generation.md)
- [06_public_key_construction.md](./06_public_key_construction.md)
- [07_secret_key_and_output.md](./07_secret_key_and_output.md)

