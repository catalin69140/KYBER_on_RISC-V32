# 05 - NTT Conversion and Matrix A Generation

This file explains two central KeyGen operations:

1. generating matrix `A` deterministically from `rho`
2. moving polynomial vectors into NTT domain for fast multiplication

## Why this stage exists

Kyber needs to compute matrix-vector polynomial products efficiently. Direct polynomial convolution is expensive, so it uses NTT-based multiplication.

Complexity intuition:

- schoolbook convolution: roughly `O(N^2)`
- NTT path: roughly `O(N log N)`

Reference context: `NTT.pdf` explains the convolution-to-NTT transformation idea and why it speeds polynomial multiplication.

## Matrix A generation (`rho` -> A)

Matrix entries are not stored as static constants. They are sampled deterministically from public seed `rho`, so any peer can regenerate the same matrix.

### Round 1 implementation

From `crypto_kem/kyber512/kyber512r1/indcpa.c:122-173`:

```c
void gen_matrix(polyvec *a, const unsigned char *seed, int transposed)
{
  // extseed = rho || index bytes
  // SHAKE128 absorb/squeeze
  // rejection sample values < q into polynomial coefficients
}
```

Concrete operations:

- append `(i,j)` (or swapped) to `rho`
- squeeze SHAKE128 blocks
- parse 13-bit candidates
- accept candidate iff `< q`

### Round 2 implementation

From `crypto_kem/kyber512/kyber512r2/indcpa.c:155-183`:

```c
xof_absorb(&state, seed, j, i);                         // absorb rho + indices
xof_squeezeblocks(buf, maxnblocks, &state);             // initial stream
ctr = rej_uniform(a[i].vec[j].coeffs, KYBER_N, ...);    // rejection sampling
while(ctr < KYBER_N) {
  xof_squeezeblocks(buf, 1, &state);                     // continue stream
  ctr += rej_uniform(...);
}
```

In r2, rejection logic is explicitly modularized (`rej_uniform`).

## NTT conversion in KeyGen

### Round 1 path

From `crypto_kem/kyber512/kyber512r1/indcpa.c:200-213`:

```c
for(i=0;i<KYBER_K;i++)
  poly_getnoise(skpv.vec+i, noiseseed, nonce++);   // sample s
polyvec_ntt(&skpv);                                 // s -> s^

for(i=0;i<KYBER_K;i++)
  poly_getnoise(e.vec+i, noiseseed, nonce++);      // e stays normal-domain here
```

Then multiply in transformed domain and return to normal domain before adding `e`.

### Round 2 path

From `crypto_kem/kyber512/kyber512r2/indcpa.c:208-223`:

```c
// sample s and e first
polyvec_ntt(&skpv);                                 // s -> s^
polyvec_ntt(&e);                                    // e -> e^

for(i=0;i<KYBER_K;i++) {
  polyvec_pointwise_acc(&pkpv.vec[i], &a[i], &skpv); // A^ o s^
  poly_frommont(&pkpv.vec[i]);                        // domain normalization
}
polyvec_add(&pkpv, &pkpv, &e);
polyvec_reduce(&pkpv);
```

## Why matrix A is public

Because `A` is derived from `rho`, and `rho` is appended to public key, both parties can reconstruct identical `A` without transmitting full matrix bytes.

This is intentional: bandwidth savings + deterministic interoperability.

## ASCII diagram: matrix generation and multiply prep

```text
rho + (i,j)
   |
   v
XOF/SHAKE128 stream
   |
   v
rejection sampling mod q
   |
   v
A[i][j]  (for all i,j -> full k x k matrix)

s --NTT--> s^
e --NTT--> e^   (r2 keygen path)
```

## ASCII diagram: why NTT helps

```text
Normal domain multiply:
  poly * poly  -> expensive convolution over 256 coeffs

NTT domain multiply:
  NTT(poly1), NTT(poly2)
       -> pointwise multiply/add
       -> inverse NTT

Result: same algebraic value, faster path
```

## Unusual/odd implementation details worth noting

1. `kyber768r1` uses `shake128ctx state` while `kyber512r1` and `kyber1024r1` use `uint64_t state[25]` style.
   - Files: `kyber768r1/indcpa.c:130-131` vs `kyber512r1/indcpa.c:129`.
2. In r1 `gen_matrix`, variable `nblocks` is changed to `1` after refill and not reset per matrix entry.
   - This looks functionally correct but can alter squeeze batching behavior.

## References used in this file

- `D_Greconici___KYBER_on_RISC-V.pdf`: Chapter 3 KeyGen flow and Chapter 4 NTT rationale.
- `NTT.pdf`: convolution and NTT-domain acceleration background.
- `2021-561.pdf`: Kyber parameterization and NTT-focused implementation context.
- Code: `indcpa.c`, `poly.c`, `polyvec.c`, `symmetric*.c`.

## In simple terms:

Kyber does not store matrix `A`; it regenerates it from a public seed. Then it moves polynomials into NTT form so multiplication is fast enough for practical KEM performance.
