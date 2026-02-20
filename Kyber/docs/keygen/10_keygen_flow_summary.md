# 10 - KeyGen Flow Summary (Step-by-Step)

This file is the compact reference view of the full KeyGen process.

## Notation recap used below

- `x^` = NTT-domain representation of `x`
- `o` = NTT-domain multiplication/accumulation
- `x'`, `x_bar` = intermediate representation of the same logical value

## Numbered KeyGen steps

### 1. Setup randomness (`z`, `d`)

- Generate random bytes for initial seed (`d` equivalent in code) and fallback value `z`.
- In this repository:
  - `d` is generated inside `indcpa_keypair`.
  - `z` is generated in `crypto_kem_keypair`.

### 2. Pass to `KeyGen_internal`

- KEM entrypoint calls K-PKE entrypoint:
  - `crypto_kem_keypair -> indcpa_keypair`

### 3. Derive seeds `rho` and `sigma`

- Compute `G(d || k)`-style expansion (implemented as hash expansion of random seed input).
- Split 64-byte output into two 32-byte halves:
  - `rho` = public seed for matrix generation
  - `sigma` = secret seed for noise sampling

### 4. Generate `s` and `e`

- Use PRF-based expansion from `sigma` plus counter `nonce`.
- Convert PRF bytes through CBD to sample small-coefficient polynomials.
- First `k` calls produce `s`; next `k` calls produce `e`.

### 5. Convert to NTT domain

- Convert secret vector to `s^`.
- Round-dependent handling of `e`:
  - r1: `e` added after inverse transform
  - r2: `e` also transformed before add/reduce

### 6. Generate matrix `A^`

- Build `k x k` matrix deterministically from `rho` using SHAKE128/XOF + rejection sampling.
- Each matrix entry uses `(rho, i, j)` domain-separated input.

### 7. Compute `t^ = A^ o s^ + e^`

- Perform matrix-vector multiply in NTT domain.
- Normalize/reduce according to round implementation.
- This produces public polynomial vector data (`t`/`t^` representation path differs by round).

### 8. Encode keys

- Encode secret polynomial vector to `sk0` bytes.
- Encode public polynomial vector and append `rho` to form public key bytes.

### 9. Construct ML-KEM-style secret key

- Build final secret key layout:

```text
sk = sk0 || pk || H(pk) || z
```

### 10. Return `(pk, sk)`

- Output public key and secret key to caller.
- KEM later uses these for encapsulation and decapsulation.

## Function mapping table

| Summary step | Main function(s) |
|---|---|
| 1 | `randombytes` calls in `indcpa_keypair` and `crypto_kem_keypair` |
| 2 | `crypto_kem_keypair -> indcpa_keypair` |
| 3 | seed expansion in `indcpa_keypair` (`hash_g`/`sha3_512`) |
| 4 | `poly_getnoise`, `cbd` loops |
| 5 | `polyvec_ntt`, `polyvec_invntt`, `poly_frommont` |
| 6 | `gen_matrix` (`xof_absorb`/`shake128_*`) |
| 7 | `polyvec_pointwise_acc`, add/reduce path |
| 8 | `pack_sk`, `pack_pk`, `polyvec_*bytes`, compression paths |
| 9 | `kem.c` secret-key concatenation logic |
| 10 | `return 0` with populated `pk`, `sk` buffers |

## Example output structure

### Public Key

- encoded `t` (round-dependent encoding)
- seed `rho`

```text
pk = [encoded_t......................][rho(32B)]
```

### Secret Key

- encoded `s` (`sk0`)
- public key `pk`
- `H(pk)`
- `z`

```text
sk = [sk0............................][pk.............................][H(pk)][z]
```

## Example pseudo-output (illustrative)

```text
pk (Kyber512-r2, 800 bytes):
  5f b2 ... 91 | 3a 77 ... c4
  ^ encoded_t  ^ rho

sk (Kyber512-r2, 1632 bytes):
  [0..767]   sk0
  [768..1567] pk
  [1568..1599] H(pk)
  [1600..1631] z
```

(Values are illustrative formatting examples; not fixed constants.)

## Memory arrangement quick view

```text
pk buffer:
  offset 0                     : encoded_t
  offset pk_len-32             : rho

sk buffer:
  offset 0                     : sk0
  offset INDCPA_SECRETKEYBYTES : pk
  offset SECRETKEYBYTES-64     : H(pk)
  offset SECRETKEYBYTES-32     : z
```

## Ambiguity and likely interpretation

Your ML-KEM summary includes explicit failure symbol on RNG failure. In this repository, KeyGen does not check RNG return codes at call sites; likely interpretation is that failure handling is delegated to platform integration rather than surfaced in the crypto API.

## References used in this file

- `D_Greconici___KYBER_on_RISC-V.pdf`: Algorithm 1 and 4 flow decomposition.
- `2021-561.pdf`: Kyber-PKE keygen algorithm restatement.
- Code: `kem.c`, `indcpa.c`, `poly*.c`, `params.h`.

## In simple terms:

KeyGen takes randomness, splits it into public and secret seeds, builds noisy lattice keys with fast NTT math, encodes them to bytes, and returns a public key plus a CCA-hardened secret key.
