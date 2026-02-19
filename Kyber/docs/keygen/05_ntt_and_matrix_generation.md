# NTT Domain Conversion and Matrix `A` Generation

This step covers:

1. building `A_hat` from `rho` (`publicseed`)
2. converting vectors to NTT domain
3. NTT-domain multiply-accumulate for KeyGen

References in thesis PDF:

- `CPA.KeyGen()` (Algorithm 1, p.12): lines for `A_hat`, `s_hat`, and `t`
- Discussion in Section `3.1` (Round 1) about sampling directly in NTT domain

## Concept

In your notation:

- `x^` = NTT-domain `x_hat`
- `o` = NTT-domain multiplication/accumulation

KeyGen computes:

```text
t_hat = A_hat o s_hat (+ e_hat in R2 path)
```

or equivalently in R1 style:

```text
t = invNTT(A_hat o s_hat) + e
```

## Code: Matrix Generation from `rho`

### R1

Source: `crypto_kem/kyber512/kyber512r1/indcpa.c:122-173`

```c
extseed[0..31] = seed;                          // seed = rho
extseed[32] = j_or_i;                           // matrix indices
extseed[33] = i_or_j;
shake128_absorb(state, extseed, 34);            // XOF absorb
shake128_squeezeblocks(buf, nblocks, state);    // squeeze bytes
// rejection: keep 13-bit values < q to fill polynomial coeffs
```

### R2

Source: `crypto_kem/kyber512/kyber512r2/indcpa.c:155-183`

```c
xof_absorb(&state, seed, j, i);                 // absorb rho with indices
xof_squeezeblocks(buf, maxnblocks, &state);     // bulk squeeze
ctr = rej_uniform(coeffs, KYBER_N, buf, ...);   // rejection sampling mod q
while(ctr < KYBER_N) {                          // top-up squeeze as needed
  xof_squeezeblocks(buf, 1, &state);
  ctr += rej_uniform(...);
}
```

## Code: NTT Conversion and Multiply-Accumulate

Sources:

- R1: `crypto_kem/kyber512/kyber512r1/indcpa.c:203-213`
- R2: `crypto_kem/kyber512/kyber512r2/indcpa.c:213-223`

```c
polyvec_ntt(&skpv);                              // s -> s_hat
// R2 also: polyvec_ntt(&e);                     // e -> e_hat

for(i=0; i<KYBER_K; i++) {
  polyvec_pointwise_acc(&pkpv.vec[i], &a[i], &skpv); // A_hat row i o s_hat
  // R2: poly_frommont(&pkpv.vec[i]);                 // leave Montgomery domain
}
```

## Why This Step Is Necessary

- NTT turns polynomial convolution into cheaper pointwise operations.
- `A_hat` is generated deterministically from public `rho`, so it need not be transmitted explicitly.
- Domain conversions (`NTT`, `invNTT`, Montgomery conversions) keep arithmetic correct and efficient.

## R1 vs R2 Notes

- R1 keygen keeps `e` in normal domain, adds after `invNTT`.
- R2 keygen NTT-transforms `e`, then adds in transformed domain and reduces.
- R2 uses explicit `rej_uniform` helper; R1 performs inline rejection in `gen_matrix`.

## Odd / Inconsistent Details Worth Noting

1. `kyber768r1` state type mismatch vs sibling folders:
   - `crypto_kem/kyber768/kyber768r1/indcpa.c:130-131` uses `shake128ctx state;`
   - `kyber512r1` and `kyber1024r1` use `uint64_t state[25]`.
2. R1 `nblocks` reuse:
   - `nblocks` starts at `4` once (`.../kyber512r1/indcpa.c:126`) and is set to `1` inside refill path.
   - It is not reset per matrix entry, so later entries typically begin with smaller squeeze batches.
   - This appears functionally valid but potentially suboptimal.

## ASCII Flow

```text
rho + (i,j)
   |
   v
XOF/SHAKE128 --> rejection sampling --> A_hat[i][j]

s --NTT--> s_hat
e --NTT--> e_hat   (R2 only)

for each row i:
  t_row = A_hat[i] o s_hat
```

## Cross-Links

- Sampling inputs (`s`, `e`): [04_sampling_and_polynomials.md](./04_sampling_and_polynomials.md)
- Final `t` computation and packing: [06_public_key_construction.md](./06_public_key_construction.md)

