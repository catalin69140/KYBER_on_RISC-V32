# 01 - KeyGen Overview and Role in ML-KEM

This file gives the high-level picture first: what KeyGen does, where it sits in KEM, and how this repository implements it.

## Big picture

Key generation in Kyber/ML-KEM creates two keys:

- `pk` (public key): shared with other parties
- `sk` (secret key): kept private by the owner

Conceptually, this is done in two layers:

1. K-PKE key generation (`CPA.KeyGen` style): creates algebraic keys from lattice math.
2. KEM wrapping (`CCA.KeyGen` style): extends secret key with `pk`, `H(pk)`, and `z` for CCA security.

This matches the thesis flow:

- `CPA.KeyGen()` (Algorithm 1, Denisa thesis p.12)
- `CCA.KeyGen()` (Algorithm 4, Denisa thesis p.15)

## KEM vs K-PKE relationship

You can read ML-KEM as:

```text
ML-KEM.KeyGen
  -> K-PKE.KeyGen
  -> add KEM-specific secret-key fields
```

In this repository, that mapping is:

- KEM entrypoint: `crypto_kem_keypair` in `kem.c`
- PKE entrypoint: `indcpa_keypair` in `indcpa.c`

## Repository structure relevant to KeyGen

Implementations exist for all security levels and both rounds:

- `crypto_kem/kyber512/{kyber512r1,kyber512r2,...}`
- `crypto_kem/kyber768/{kyber768r1,kyber768r2,...}`
- `crypto_kem/kyber1024/{kyber1024r1,kyber1024r2,...}`

For KeyGen behavior, the clearest representative files are:

- `crypto_kem/kyber512/kyber512r1/kem.c`
- `crypto_kem/kyber512/kyber512r1/indcpa.c`
- `crypto_kem/kyber512/kyber512r2/kem.c`
- `crypto_kem/kyber512/kyber512r2/indcpa.c`

## High-level flow diagram

```text
+---------------------------+
| crypto_kem_keypair(pk,sk) |
| (KEM layer)               |
+-------------+-------------+
              |
              v
+---------------------------+
| indcpa_keypair(pk, sk0)   |
| (K-PKE / CPA layer)       |
+-------------+-------------+
              |
              | 1) random seed d
              | 2) expand -> rho, sigma
              | 3) sample s,e
              | 4) generate A from rho
              | 5) compute t = A*s + e
              | 6) encode pk, sk0
              v
+---------------------------+
| back to KEM layer         |
| sk = sk0 || pk || H(pk)||z|
+-------------+-------------+
              |
              v
        return (pk, sk)
```

## Where KeyGen connects to Encapsulation/Decapsulation

KeyGen choices directly affect both later operations:

- Encapsulation uses `pk` (`t` + `rho`) to encrypt and derive shared secret.
- Decapsulation uses `sk`, including:
  - `sk0` for decryption,
  - stored `pk` and `H(pk)` for re-encryption check,
  - `z` for failure fallback.

So KeyGen is not just initialization; it defines the data layout that CCA checks rely on.

## Minimal code path (annotated)

From `crypto_kem/kyber512/kyber512r2/kem.c`:

```c
int crypto_kem_keypair(unsigned char *pk, unsigned char *sk)
{
  indcpa_keypair(pk, sk);   // Build K-PKE keys (pk, sk0)
  // Append pk into sk
  // Append H(pk) into sk
  // Append random z into sk
  return 0;
}
```

This is the cleanest way to remember the architecture: K-PKE first, KEM hardening second.

## References used in this file

- `D_Greconici___KYBER_on_RISC-V.pdf`: Algorithm list (p.vi), Algorithm 1 (p.12), Algorithm 4 (p.15).
- `2021-561.pdf`: includes Kyber-PKE key generation algorithm restatement (Algorithm 1 in that paper).

## In simple terms:

KeyGen in this repo is a two-stage pipeline: first create lattice keys (`indcpa_keypair`), then package them into a CCA-safe secret key (`crypto_kem_keypair`). If you trace these two functions, you trace all of KeyGen.
