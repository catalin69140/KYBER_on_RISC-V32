# K-PKE KeyGen Call and Parameter Setup

This file documents how `crypto_kem_keypair` delegates to K-PKE/CPA key generation and how parameters change across `{512,768,1024}` and `{r1,r2}`.

References in thesis PDF:

- `CPA.KeyGen()` (Algorithm 1, p.12)
- `CCA.KeyGen()` (Algorithm 4, p.15)

## Concept

Kyber KEM key generation is layered:

1. Run CPA/K-PKE key generation to get `(pk, sk0)`.
2. Build CCA secret key by concatenating `sk0 || pk || H(pk) || z`.

In code, Step 1 is exactly `indcpa_keypair(pk, sk)` called from `crypto_kem_keypair`.

## Code: KEM -> K-PKE Delegation

Source:

- R1: `crypto_kem/kyber512/kyber512r1/kem.c:19-27`
- R2: `crypto_kem/kyber512/kyber512r2/kem.c:20-28`

```c
int crypto_kem_keypair(unsigned char *pk, unsigned char *sk)
{
  indcpa_keypair(pk, sk);                           // Step 1: run K-PKE/CPA keygen
  // ... CCA secret-key augmentation continues after this call
}
```

Line-by-line:

- `indcpa_keypair(pk, sk)` computes:
  - `pk = (t, rho)` (packed form depends on round)
  - initial secret section `sk0 = s_hat` (serialized vector)

## Parameter Constants

### Round 1 (`params.h`)

Sources:

- `crypto_kem/kyber512/kyber512r1/params.h`
- `crypto_kem/kyber768/kyber768r1/params.h`
- `crypto_kem/kyber1024/kyber1024r1/params.h`

```text
q = 7681
N = 256
k in {2,3,4}
eta depends on k:
  k=2 -> eta=5
  k=3 -> eta=4
  k=4 -> eta=3
```

### Round 2 (`params.h`)

Sources:

- `crypto_kem/kyber512/kyber512r2/params.h`
- `crypto_kem/kyber768/kyber768r2/params.h`
- `crypto_kem/kyber1024/kyber1024r2/params.h`

```text
q = 3329
N = 256
k in {2,3,4}
eta = 2 for all three parameter sets
```

## Why These Parameters Matter

- `k` controls vector/matrix dimensions (`k x k` matrix, `k`-length vectors).
- `q` changes modular arithmetic behavior and reduction strategy.
- `eta` controls noise distribution width (security/performance balance).

## R1 vs R2 Implication for Your Extra Notes

Your notes describe ML-KEM-like `eta1` behavior (`3 for 512`, `2 for 768/1024`).  
This repository is Kyber round code:

- R1 uses `eta` in `{5,4,3}` by `k`.
- R2 uses fixed `eta=2`.

So, use the values above when documenting this exact codebase.

## ASCII Flow (Call Boundary)

```text
KEM: crypto_kem_keypair
  |
  +--> K-PKE: indcpa_keypair
         |
         +--> output pk, sk0
  |
  '--> append pk || H(pk) || z into final sk
```

## Cross-Links

- Seed derivation entering `indcpa_keypair`: [02_randomness_and_seeds.md](./02_randomness_and_seeds.md)
- Sampling and polynomial objects under these params: [04_sampling_and_polynomials.md](./04_sampling_and_polynomials.md)

