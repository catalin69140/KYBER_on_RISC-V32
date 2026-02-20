# 06 - Public Key Construction (`t` from `A`, `s`, `e`)

This file explains the core KeyGen equation and shows where it appears in code:

```text
t^ = A^ o s^ + e^         (transform-domain view)
```

or equivalently (round-dependent representation):

```text
t = A*s + e
```

## Concept first

- `A` is public structured randomness from `rho`.
- `s` is secret sampled noise vector.
- `e` is extra error/noise vector.

`e` is added to make inversion from public data hard (MLWE hardness intuition), while still preserving decryptability.

## Round 1 code path

From `crypto_kem/kyber512/kyber512r1/indcpa.c:208-214`:

```c
for(i=0;i<KYBER_K;i++)
  polyvec_pointwise_acc(&pkpv.vec[i], &skpv, a+i); // row-wise A^ o s^

polyvec_invntt(&pkpv);                              // back to normal domain
polyvec_add(&pkpv, &pkpv, &e);                     // add error in normal domain
```

Line-by-line:

- each `i` computes one output vector component of `A^ o s^`.
- inverse NTT converts result to coefficient domain.
- add `e` vector to get final public polynomial vector `t`.

## Round 2 code path

From `crypto_kem/kyber512/kyber512r2/indcpa.c:217-223`:

```c
for(i=0;i<KYBER_K;i++) {
  polyvec_pointwise_acc(&pkpv.vec[i], &a[i], &skpv); // A^ o s^
  poly_frommont(&pkpv.vec[i]);                       // normalize from Montgomery form
}
polyvec_add(&pkpv, &pkpv, &e);                       // add e (already transformed earlier)
polyvec_reduce(&pkpv);                               // coefficient reduction
```

Compared to r1, r2 keeps more operations in transformed/reduced arithmetic flow and uses explicit reduction at the end.

## Simplified math example (toy, not full Kyber size)

Assume one row and tiny vectors:

```text
A_row = [a1, a2]
s     = [s1, s2]
e     = [e1]

raw = a1*s1 + a2*s2

t   = raw + e1
```

In actual Kyber this is polynomial arithmetic modulo `q`, done efficiently via NTT representation.

## Why adding error is mandatory

Without `e`, public equations are too "clean":

```text
t = A*s
```

This would leak too much structure and weaken security assumptions. Noise is the hardness anchor.

## Input -> transformation -> output

```text
Input:  A^, s^, e (or e^)
Step1:  matrix-vector multiply in NTT domain
Step2:  domain normalization/inverse transform (round-dependent)
Step3:  add error
Step4:  reduce as needed
Output: public polynomial vector t (packed later with rho)
```

## Practical debugging tip

If `pk` mismatches between runs while deterministic seed is fixed, check:

1. seed expansion (`rho/sigma`)
2. nonce progression
3. NTT/invNTT ordering
4. final reduction and packing path

Most reproducibility bugs happen from domain/order mistakes, not from the equation itself.

## References used in this file

- `D_Greconici___KYBER_on_RISC-V.pdf`: CPA.KeyGen equation presentation (Algorithm 1).
- `2021-561.pdf`: Algorithm 1 line for `t` computation in transformed domain.
- Code: `indcpa.c`, `polyvec.c`, `poly.c`.

## In simple terms:

The public key is built by multiplying a public matrix with a secret vector, then adding noise. The multiply is done in NTT form for speed; the noise keeps the key secure.
