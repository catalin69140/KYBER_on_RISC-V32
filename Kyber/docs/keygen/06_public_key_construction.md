# Public Key Construction (`t` and `pk`)

This step explains how `t` is computed and how final `pk` bytes are formed.

References in thesis PDF:

- `CPA.KeyGen()` (Algorithm 1, p.12), especially:
  - `t := NTT^-1(A_hat o s_hat) + e`
  - `pk := (Compress(t), rho)` in Round 1 presentation

## Concept

The core public-key equation is:

```text
t = A*s + e
```

Implementation computes this via NTT-domain operations, then serializes:

- Round 1: compressed `t` + `rho`
- Round 2: full serialized `t` + `rho`

## Code: Compute `t`

### R1 path

Source: `crypto_kem/kyber512/kyber512r1/indcpa.c:208-214`

```c
for(i=0;i<KYBER_K;i++)
  polyvec_pointwise_acc(&pkpv.vec[i], &skpv, a+i); // A_hat o s_hat (row i)

polyvec_invntt(&pkpv);                              // back to normal domain
polyvec_add(&pkpv, &pkpv, &e);                     // + e in normal domain
```

Line-by-line:

- per row, compute accumulated NTT product
- apply inverse transform to recover coefficient-domain `A*s`
- add noise vector `e`

### R2 path

Source: `crypto_kem/kyber512/kyber512r2/indcpa.c:217-223`

```c
for(i=0;i<KYBER_K;i++) {
  polyvec_pointwise_acc(&pkpv.vec[i], &a[i], &skpv); // A_hat o s_hat
  poly_frommont(&pkpv.vec[i]);                       // leave Montgomery domain
}
polyvec_add(&pkpv, &pkpv, &e);                       // e already NTT-transformed earlier
polyvec_reduce(&pkpv);                               // canonicalize coefficients
```

## Code: Pack `pk`

### R1 `pack_pk`

Source: `crypto_kem/kyber512/kyber512r1/indcpa.c:20-26`

```c
polyvec_compress(r, pk);                               // compress t
r[KYBER_POLYVECCOMPRESSEDBYTES + i] = seed[i];         // append rho
```

### R2 `pack_pk`

Source: `crypto_kem/kyber512/kyber512r2/indcpa.c:20-26`

```c
polyvec_tobytes(r, pk);                                // full serialization of t
r[KYBER_POLYVECBYTES + i] = seed[i];                   // append rho
```

## Why This Step Is Necessary

- `t` binds secret `s` to public matrix `A` while `e` hides exact linear structure.
- Appending `rho` lets peers regenerate the same `A` deterministically.
- Packing format defines interoperability and key size.

## R1 vs R2 Behavior Summary

- Same logical equation, different arithmetic/layout details.
- Major externally visible difference: `pk` encoding format.
- This is why `KYBER_INDCPA_PUBLICKEYBYTES` differs between rounds.

## ASCII Flow

```text
A_hat, s_hat  --o-->  product
   |
   +--> R1: invNTT(product) + e      -> t
   '--> R2: (frommont product) + e_hat -> reduce -> t (serialized form differs)

pk = encode(t) || rho
```

## Cross-Links

- NTT and matrix-generation stage: [05_ntt_and_matrix_generation.md](./05_ntt_and_matrix_generation.md)
- Secret key composition and final output: [07_secret_key_and_output.md](./07_secret_key_and_output.md)

