# 04 - Sampling Noise and Building Polynomial Vectors

This file covers how KeyGen creates secret and error polynomials from `sigma`, and why this is cryptographically essential.

## What happens

After `rho` and `sigma` are derived, KeyGen samples:

- secret vector `s`
- error vector `e`

Sampling is deterministic from `(sigma, nonce)` but computationally pseudorandom.

## Where it appears in code

From `crypto_kem/kyber512/kyber512r2/indcpa.c:208-211`:

```c
for(i=0;i<KYBER_K;i++)
  poly_getnoise(skpv.vec+i, noiseseed, nonce++);  // sample s[i]
for(i=0;i<KYBER_K;i++)
  poly_getnoise(e.vec+i, noiseseed, nonce++);     // sample e[i]
```

Line-by-line:

- `nonce` starts at `0` and increments every call.
- each `poly_getnoise(...)` call consumes a distinct PRF domain point.
- first `k` calls fill `s`, next `k` calls fill `e`.

## PRF stage (SHAKE-256 style)

### Round 1 path

From `crypto_kem/kyber512/kyber512r1/poly.c:130-143`:

```c
void poly_getnoise(poly *r,const unsigned char *seed, unsigned char nonce)
{
  unsigned char extseed[KYBER_SYMBYTES+1];        // sigma || nonce
  // copy seed bytes
  // append nonce
  shake256(buf, KYBER_ETA*KYBER_N/4, extseed, KYBER_SYMBYTES+1);
  cbd(r, buf);
}
```

### Round 2 path

From `crypto_kem/kyber512/kyber512r2/poly.c:175-180`:

```c
void poly_getnoise(poly *r, const unsigned char *seed, unsigned char nonce)
{
  prf(buf, KYBER_ETA*KYBER_N/4, seed, nonce);     // PRF macro from symmetric.h
  cbd(r, buf);                                    // map bytes to CBD coefficients
}
```

Under default non-90s config, `prf` is `shake256_prf` (`symmetric.h:42` and `symmetric-fips202.c:54-64`).

## CBD stage: bytes -> small coefficients

### Round 1 CBD

From `crypto_kem/kyber512/kyber512r1/cbd.c`:

- supports `eta in {3,4,5}` (`#error` branch confirms this)
- computes coefficient differences from grouped bit-counts

### Round 2 CBD

From `crypto_kem/kyber512/kyber512r2/cbd.c:35-57`:

- supports only `eta=2`
- derives each coefficient as `a-b` with `a,b in {0,1,2}`

## Coefficient interpretation

Mathematically, coefficients are centered near zero (small noise). In code, representation may be signed or reduced modulo `q` depending on round/path.

That is why some code appears as `a-b` (signed) while other paths use `a + q - b` (modular non-negative representation).

## Why this step is necessary cryptographically

Without noise, public-key equations become too linear and easier to invert. With properly distributed small noise:

- decryption remains correct with high probability,
- recovering secret `s` from public data becomes hard (LWE/MLWE hardness intuition).

## Input -> transformation -> output view

```text
Input:   sigma (32B), nonce (1B)
PRF:     SHAKE-256-based expansion -> pseudo-random bytes
CBD:     bytes -> small polynomial coefficients
Output:  one polynomial in s or e
```

## Small pseudo-example

```text
sigma = 32-byte seed
nonce = 0
PRF(sigma,0) -> b0...bM
CBD(b0...bM) -> poly s[0] with small coeffs (e.g., ...,-1,0,2,-2,...)
```

(Values shown are shape examples, not exact outputs.)

## Security note on nonce usage

If nonce reuse happened accidentally in the same context, repeated structure would leak information. The monotonic `nonce++` pattern prevents that within each keygen call.

## References used in this file

- `2021-561.pdf`: Algorithm 1 (`s,e <- CBD(PRF(sigma,nonce))`) and parameter table.
- `D_Greconici___KYBER_on_RISC-V.pdf`: CPA keygen explanation with noise vectors and NTT path.
- Code: `indcpa.c`, `poly.c`, `cbd.c`, `symmetric.h`, `symmetric-fips202.c`.

## In simple terms:

Kyber turns one secret seed into many tiny random-looking polynomial coefficients. Those tiny values are exactly what hide the secret key while still letting decryption work.
