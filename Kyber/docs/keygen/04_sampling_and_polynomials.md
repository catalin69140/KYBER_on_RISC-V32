# Sampling Noise and Polynomial Creation

This step explains how secret/error polynomials are sampled from `sigma` (`noiseseed`) and how `nonce` drives deterministic uniqueness.

References in thesis PDF:

- `CPA.KeyGen()` (Algorithm 1, p.12), lines for `s`, `e`, and `NTT(s)`

## Concept

From `sigma`, KeyGen builds:

- `s` (secret vector)
- `e` (error vector)

Both are sampled using PRF/XOF output mapped through CBD (centered binomial distribution).

## Code: Sampling Loops in `indcpa_keypair`

Source:

- R1: `crypto_kem/kyber512/kyber512r1/indcpa.c:200-206`
- R2: `crypto_kem/kyber512/kyber512r2/indcpa.c:208-211`

```c
unsigned char nonce = 0;                            // counter N in your flow

for(i=0; i<KYBER_K; i++)
  poly_getnoise(skpv.vec+i, noiseseed, nonce++);   // sample s[i]

for(i=0; i<KYBER_K; i++)
  poly_getnoise(e.vec+i, noiseseed, nonce++);      // sample e[i]
```

Line-by-line:

- `nonce` ensures each PRF call gets a distinct domain-separated input.
- First loop fills secret vector `s`.
- Second loop continues nonce stream for error vector `e`.

## Code: `poly_getnoise` (R1 vs R2)

### R1

Source: `crypto_kem/kyber512/kyber512r1/poly.c:130-143`

```c
void poly_getnoise(poly *r, const unsigned char *seed, unsigned char nonce)
{
  unsigned char extseed[KYBER_SYMBYTES+1];    // sigma || nonce
  // copy seed and append nonce...
  shake256(buf, KYBER_ETA*KYBER_N/4, extseed, KYBER_SYMBYTES+1); // PRF-like expansion
  cbd(r, buf);                                 // map bytes -> CBD polynomial
}
```

### R2

Source: `crypto_kem/kyber512/kyber512r2/poly.c:175-180`

```c
void poly_getnoise(poly *r, const unsigned char *seed, unsigned char nonce)
{
  prf(buf, KYBER_ETA*KYBER_N/4, seed, nonce); // macro from symmetric.h (SHAKE-256 by default)
  cbd(r, buf);                                  // CBD mapping
}
```

## Code: CBD Mapping Differences

Sources:

- R1 CBD: `crypto_kem/kyber512/kyber512r1/cbd.c`
- R2 CBD: `crypto_kem/kyber512/kyber512r2/cbd.c`

Behavior:

- R1 supports `eta in {3,4,5}` (set-dependent).
- R2 supports `eta = 2` only.

This directly impacts the coefficient spread of sampled noise.

## Why This Step Is Necessary

- `s` is the hidden trapdoor used in decryption.
- `e` masks linear relations so `s` is hard to recover from `pk`.
- Deterministic `seed+nonce` derivation gives reproducibility with clean domain separation.

## ASCII Sampling Diagram

```text
sigma (32B) + nonce=0 -> PRF/XOF -> CBD -> s[0]
sigma (32B) + nonce=1 -> PRF/XOF -> CBD -> s[1]
...
sigma (32B) + nonce=k -> PRF/XOF -> CBD -> e[0]
...
```

## Cross-Links

- NTT conversion and matrix usage of these polynomials: [05_ntt_and_matrix_generation.md](./05_ntt_and_matrix_generation.md)
- Public-key equation including sampled `e`: [06_public_key_construction.md](./06_public_key_construction.md)

