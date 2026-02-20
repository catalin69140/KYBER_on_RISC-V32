# 02 - Randomness, Seed Derivation, and Deterministic Tracing

This file covers the beginning of KeyGen: where randomness enters, how seeds are split into `rho`/`sigma`, and how to force deterministic behavior for debugging and trace generation.

## What happens conceptually

At the start of KeyGen, Kyber needs fresh entropy to derive two different kinds of values:

- public-seed material (for reproducible matrix generation)
- secret-seed material (for noise sampling)

In ML-KEM-style notation this is often described as random `d` and `z`.

In this codebase:

- `d`-like seed is generated inside `indcpa_keypair`.
- `z` is generated inside `crypto_kem_keypair`.

## Code path where randomness enters

### 1) Seed for K-PKE keygen (`d` equivalent)

From `crypto_kem/kyber512/kyber512r2/indcpa.c:197-205`:

```c
unsigned char buf[2*KYBER_SYMBYTES];             // 64-byte temp buffer
unsigned char *publicseed = buf;                 // rho  (first 32 bytes)
unsigned char *noiseseed  = buf+KYBER_SYMBYTES;  // sigma(second 32 bytes)

randombytes(buf, KYBER_SYMBYTES);                // draw 32-byte random seed d
hash_g(buf, buf, KYBER_SYMBYTES);                // G(d) -> 64 bytes = rho||sigma
```

Line-by-line:

- `randombytes(...)` produces 32 bytes of fresh input entropy.
- `hash_g(...)` (SHA3-512 by default in r2) expands that into 64 bytes.
- first half becomes `rho` (`publicseed`), second half `sigma` (`noiseseed`).

R1 equivalent (`sha3_512`) is in `crypto_kem/kyber512/kyber512r1/indcpa.c:195-197`.

### 2) `z` generation in KEM wrapper

From `crypto_kem/kyber512/kyber512r2/kem.c:27`:

```c
randombytes(sk+KYBER_SECRETKEYBYTES-KYBER_SYMBYTES, KYBER_SYMBYTES);
```

This writes 32 random bytes to the tail of `sk` (`z` field).

## Why seed splitting is necessary

Kyber separates concerns:

- `rho` is public by design and can be shared.
- `sigma` must stay secret because it drives secret and error sampling.

If one seed served both roles directly, domain separation would be weaker and reasoning about leakage would be harder.

## Failure handling vs your ML-KEM summary

Your summary includes explicit failure return (`bottom`) if randomness is unavailable.

What this implementation does:

- `randombytes(...)` returns `int` (`0` on success in current implementation),
- but callers do not check return status.

So this repository currently assumes RNG success and does not surface a KeyGen failure symbol.

## Deterministic & Trace-Friendly Execution

This repository is already friendlier to deterministic tracing than production-grade cryptolibs.

### Where seed is set

`Kyber/common/randombytes.c:7-9`:

```c
static uint32_t seed[32] = { 3, 1, 4, 1, 5, 9, ... };
```

This is a fixed initial seed for the local `randombytes` implementation.

### Why runs can be reproduced

Because RNG state is deterministic (`seed` + internal counter `in[]`), repeated runs from the same process start state produce reproducible byte streams.

### How to force identical runs on purpose

1. Reset process and run same binary with same call order.
2. Do not insert extra `randombytes` calls between runs.
3. Keep `seed[]` unchanged in `Kyber/common/randombytes.c`.

For vector-test style output, this repo also includes deterministic test drivers:

- `Kyber/mupq/crypto_kem/testvectors.c:41-45`
- `Kyber/mupq/crypto_kem/testvectors-host.c:42-45`

Both embed the same deterministic Bernstein-style RNG setup.

### Practical hook point for tracing tools

If you want controlled trace campaigns (e.g., same keypair every run), hook here:

- `Kyber/common/randombytes.c`

Recommended patch idea:

```c
// pseudo-interface (not currently present)
void randombytes_set_seed(const uint32_t *seed32);
```

Then call it once before `crypto_kem_keypair` in your harness.

### Bypassing randomness completely (debug mode)

For one-off debugging, you can temporarily replace:

```c
randombytes(buf, KYBER_SYMBYTES)
```

with a fixed byte array copy, but keep this guarded by a debug macro so production logic is not silently changed.

### Performance note

- In this project, heavy Keccak/NTT work dominates crypto cost.
- RNG cost is usually secondary in KeyGen on these code paths.
- Denisa thesis results also show hashing-heavy cost dominance in whole KEM blocks.

### ARM comparison note

`2021-561.pdf` focuses on arithmetic/NTT optimization on ARM64. It does not redefine Kyber randomness flow; practical deterministic benchmarking still relies on fixed-seed harnesses, similar to this repo's test-vector programs.

(Interpretation note: this is based on the implementation content and paper focus areas, not on a new RNG design claimed by that paper.)

## Data-flow diagram

```text
randombytes(32) -> d
         |
         v
   G(d) = 64 bytes
      /           \
   rho             sigma
(publicseed)     (noiseseed)
    |               |
    v               v
 matrix A gen     noise sampling (s,e)

separately (KEM layer):
randombytes(32) -> z -> appended to sk tail
```

## References used in this file

- `D_Greconici___KYBER_on_RISC-V.pdf`: Algorithm 1 (seed split concept), Algorithm 4 (`z` in CCA keygen), pages 12 and 15.
- `2021-561.pdf`: Kyber-PKE keygen algorithm restatement (`rho,sigma` from hashed seed).
- Code: `Kyber/common/randombytes.c`, `Kyber/mupq/crypto_kem/testvectors*.c`.

## In simple terms:

KeyGen randomness in this repo comes from a deterministic PRG implementation that is easy to reproduce in tests. One random seed is expanded into `rho` (public matrix seed) and `sigma` (secret sampling seed), and another random value `z` is appended to the secret key for CCA failure handling.
