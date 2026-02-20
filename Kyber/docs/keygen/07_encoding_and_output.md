# 07 - Encoding, Key Layout, and Final Output

This file explains how polynomial objects are converted into bytes and how final `(pk, sk)` is laid out in memory.

## What is encoded in KeyGen

KeyGen eventually produces byte arrays, not polynomial structs:

- Public key: encoded `t` plus `rho`
- Secret key (K-PKE part): encoded `s`/`s^`
- Secret key (KEM final): `sk0 || pk || H(pk) || z`

## Encoding in K-PKE layer

### Secret key packing (`pack_sk`)

From both rounds (`indcpa.c`):

```c
static void pack_sk(unsigned char *r, ...)
{
  polyvec_tobytes(r, sk);
}
```

Meaning:

- serialize the secret polynomial vector into canonical byte layout.

### Public key packing (`pack_pk`)

#### Round 1 (`kyber512r1/indcpa.c:20-26`)

```c
polyvec_compress(r, pk);                         // compress t-vector first
r[i + KYBER_POLYVECCOMPRESSEDBYTES] = seed[i];   // append rho
```

#### Round 2 (`kyber512r2/indcpa.c:20-26`)

```c
polyvec_tobytes(r, pk);                          // full bytes (no polyvec compression here)
r[i + KYBER_POLYVECBYTES] = seed[i];             // append rho
```

This is one of the most visible r1/r2 format differences.

## Final KEM secret key construction

From `crypto_kem/kyber512/kyber512r2/kem.c:23-28`:

```c
indcpa_keypair(pk, sk);                              // sk currently starts with sk0
for(i=0;i<KYBER_INDCPA_PUBLICKEYBYTES;i++)
  sk[i+KYBER_INDCPA_SECRETKEYBYTES] = pk[i];         // append pk
hash_h(sk+KYBER_SECRETKEYBYTES-2*KYBER_SYMBYTES,
       pk, KYBER_PUBLICKEYBYTES);                    // append H(pk)
randombytes(sk+KYBER_SECRETKEYBYTES-KYBER_SYMBYTES,
            KYBER_SYMBYTES);                         // append z
```

R1 uses `sha3_256(...)` directly in place of `hash_h(...)`.

## Byte layout diagrams

### Public key

```text
pk = encoded_t || rho
```

Round-specific encoded_t format:

- r1: compressed polyvec bytes
- r2: full polyvec serialized bytes

### Secret key (final KEM key)

```text
sk = sk0 || pk || H(pk) || z
```

Where:

- `sk0` = K-PKE secret part (encoded secret vector)
- `pk` = full public key bytes
- `H(pk)` = 32-byte hash of public key
- `z` = 32-byte random fallback value

## Size examples (from `params.h` formulas)

### Round 2

| Variant | pk bytes | sk bytes |
|---|---:|---:|
| Kyber512 (`k=2`) | 800 | 1632 |
| Kyber768 (`k=3`) | 1184 | 2400 |
| Kyber1024 (`k=4`) | 1568 | 3168 |

### Round 1

| Variant | pk bytes | sk bytes |
|---|---:|---:|
| Kyber512 (`k=2`) | 736 | 1632 |
| Kyber768 (`k=3`) | 1088 | 2400 |
| Kyber1024 (`k=4`) | 1440 | 3168 |

(Secret-key totals happen to align across rounds in this codebase, but internal encoding paths differ.)

## Example pseudo-output (shape)

```text
Public Key (pk):
  [t-bytes........................................][rho(32B)]

Secret Key (sk):
  [sk0............................................]
  [pk.............................................]
  [H(pk): 32B]
  [z:     32B]
```

Example sanity checks in a harness:

- `len(pk) == KYBER_PUBLICKEYBYTES`
- `len(sk) == KYBER_SECRETKEYBYTES`
- decapsulation can access `pk` by offset `KYBER_INDCPA_SECRETKEYBYTES`

## Why this structure is necessary

- `pk` inside `sk` avoids external key lookup during decapsulation.
- `H(pk)` avoids recomputing and supports CCA derivation path.
- `z` enables secure fallback secret derivation if ciphertext check fails.

## References used in this file

- `D_Greconici___KYBER_on_RISC-V.pdf`: CCA key layout idea (`sk0 || pk || H(pk) || z`, Algorithm 4).
- `2021-561.pdf`: Kyber-PKE encode/decode and parameter table context.
- Code: `indcpa.c`, `kem.c`, `params.h`.

## In simple terms:

All fancy polynomial math is eventually packed into deterministic byte layouts. Public key is `t` plus `rho`; secret key is the K-PKE secret plus extra KEM fields (`pk`, `H(pk)`, `z`) needed for secure decapsulation.
