# 03 - Entering K-PKE.KeyGen and Parameter Setup

This file explains the transition from KEM to K-PKE and documents parameterization (`k`, `q`, `eta`) in this repository.

## Step boundary

KEM key generation calls K-PKE key generation.

From `crypto_kem/kyber512/kyber512r2/kem.c:23-29`:

```c
int crypto_kem_keypair(unsigned char *pk, unsigned char *sk)
{
  indcpa_keypair(pk, sk);    // K-PKE keygen starts here
  // ... CCA augmentation continues here
  return 0;
}
```

Equivalent call exists in r1: `crypto_kem/kyber512/kyber512r1/kem.c:22-27`.

## Parameters that control KeyGen behavior

Kyber variants differ mainly by `k` (vector/matrix dimension), then by round-specific constants.

### k values and security levels

- `k=2` -> Kyber512
- `k=3` -> Kyber768
- `k=4` -> Kyber1024

### Round 1 constants (this repo)

From `params.h` files in `kyber*r1`:

- `q = 7681`
- `N = 256`
- `eta` depends on `k`: `5,4,3` for `k=2,3,4`

Example: `crypto_kem/kyber768/kyber768r1/params.h:10-18`.

### Round 2 constants (this repo)

From `params.h` files in `kyber*r2`:

- `q = 3329`
- `N = 256`
- `eta = 2` for all parameter sets

Example: `crypto_kem/kyber768/kyber768r2/params.h:10-13`.

## Why this matters at KeyGen entry

Once `indcpa_keypair` starts, these constants determine:

- matrix/vector sizes (`k x k`, `k`)
- noise distribution width (`eta`)
- serialization sizes (`KYBER_POLY*BYTES`)
- reduction and arithmetic details (`q`)

So "same function name" does not mean same internal algebra across rounds.

## Data flow into polynomial generation

Inside `indcpa_keypair`, the seed buffer and polynomial objects are initialized:

From `crypto_kem/kyber512/kyber512r2/indcpa.c:196-201`:

```c
polyvec a[KYBER_K], e, pkpv, skpv;               // matrix/vector objects
unsigned char buf[2*KYBER_SYMBYTES];             // seed workspace
unsigned char *publicseed = buf;                 // rho
unsigned char *noiseseed = buf+KYBER_SYMBYTES;   // sigma
unsigned char nonce=0;                           // PRF counter
```

Interpretation:

- `a` will hold matrix `A` (or `A^` in transformed representation).
- `skpv` is secret-vector container (`s`/`s^`).
- `e` is error-vector container.
- `pkpv` is the future public polynomial vector (`t`-side data).

## Small pseudo-code summary

```text
KEM.KeyGen(pk, sk):
  (pk, sk0) = K-PKE.KeyGen()
  sk = sk0 || pk || H(pk) || z

K-PKE.KeyGen():
  derive rho,sigma
  sample s,e
  build A from rho
  compute t from A,s,e
  encode pk, sk0
```

## References used in this file

- `D_Greconici___KYBER_on_RISC-V.pdf`: Algorithm 1 and Algorithm 4 relation (pp.12,15).
- `2021-561.pdf`: Section on Kyber parameters and PKE KeyGen algorithm.
- Code: `kem.c`, `indcpa.c`, `params.h` across `kyber{512,768,1024}{r1,r2}`.

## In simple terms:

This step is where KEM says: "build me the algebraic keys first." The `indcpa_keypair` function then does all lattice math using constants that depend on variant (`512/768/1024`) and round (`r1/r2`).
