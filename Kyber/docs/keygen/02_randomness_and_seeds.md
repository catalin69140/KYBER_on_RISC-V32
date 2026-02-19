# Randomness and Seeds (`d`, `z`, `rho`, `sigma`)

This step explains where randomness enters KeyGen, how seeds are derived, and how this maps to both your flow diagram and thesis algorithms.

References in thesis PDF:

- `CPA.KeyGen()` (Algorithm 1, p.12): seed split and sampling inputs
- `CCA.KeyGen()` (Algorithm 4, p.15): adds random `z`

## Concept

There are two randomness origins in this implementation:

1. `d`-like entropy for K-PKE key material (inside `indcpa_keypair`)
2. `z` for Fujisaki-Okamoto failure handling (inside `crypto_kem_keypair`)

Then `d` is expanded with `G`-style hashing into:

- `rho` (public seed, matrix generation)
- `sigma` (noise seed, secret/error sampling)

## Code: Seed Expansion in K-PKE KeyGen

Source:

- R1: `crypto_kem/kyber512/kyber512r1/indcpa.c:188-197`
- R2: `crypto_kem/kyber512/kyber512r2/indcpa.c:196-205`

```c
unsigned char buf[2*KYBER_SYMBYTES];           // 64-byte workspace: later split into rho||sigma
unsigned char *publicseed = buf;               // first 32 bytes -> rho
unsigned char *noiseseed = buf+KYBER_SYMBYTES; // second 32 bytes -> sigma

randombytes(buf, KYBER_SYMBYTES);              // draw initial 32-byte seed d
hash_g(buf, buf, KYBER_SYMBYTES);              // expand d -> 64 bytes (rho||sigma)
```

R1 equivalent call uses direct SHA3 API:

```c
randombytes(buf, KYBER_SYMBYTES);              // d
sha3_512(buf, buf, KYBER_SYMBYTES);            // G(d) -> rho||sigma
```

## Code: `z` Generation in CCA KeyGen

Source:

- R1: `crypto_kem/kyber512/kyber512r1/kem.c:26`
- R2: `crypto_kem/kyber512/kyber512r2/kem.c:27`

```c
randombytes(sk+KYBER_SECRETKEYBYTES-KYBER_SYMBYTES, KYBER_SYMBYTES); // append z
```

Line-by-line meaning:

- The write offset points to the final 32 bytes of `sk`.
- Those final 32 bytes are the fallback secret used in decapsulation failure paths.

## Why This Matters Cryptographically

- `rho` must be public and reproducible so both parties can regenerate matrix `A`.
- `sigma` must stay secret; it determines sampled `s` and `e`.
- `z` hardens decapsulation against invalid-ciphertext behavior (FO-style fallback key path).

## R1 vs R2 Notes

- Seed split pattern (`d -> rho||sigma`) is identical.
- Hash abstraction differs:
  - R1 uses direct `sha3_512`.
  - R2 uses `hash_g` macro (`symmetric.h`) which defaults to `sha3_512` unless `KYBER_90S` is enabled.

## Implementation Deviations / Oddities

1. No explicit RNG failure path:
   - Your ML-KEM-style flow mentions returning `⊥` if `d` or `z` generation fails.
   - This code does not check randombytes return status; it assumes success.
2. API shape:
   - Your flow models `d` and `z` as explicit inputs into internal KeyGen.
   - Here both are generated internally inside `indcpa_keypair` and `crypto_kem_keypair`.

## ASCII Flow (This Step Only)

```text
randombytes(32) --> d
      |
      v
   G(d) = 64 bytes
      |
      +--> rho   (publicseed)  --> matrix A generation
      '--> sigma (noiseseed)   --> s,e sampling

KEM layer also draws:
randombytes(32) --> z --> appended to secret key tail
```

## Cross-Links

- Parameter impact (`k`, `eta`, `q`): [03_k_pke_keygen.md](./03_k_pke_keygen.md)
- Sampling details using `sigma`: [04_sampling_and_polynomials.md](./04_sampling_and_polynomials.md)
- Final `z` usage in decapsulation: [07_secret_key_and_output.md](./07_secret_key_and_output.md)

