# Secret Key Structure and Final KeyGen Outputs

This final step explains how the CPA output is wrapped into the CCA secret key and how this ties to Encapsulation/Decapsulation.

References in thesis PDF:

- `CCA.KeyGen()` (Algorithm 4, p.15): `sk := (sk0 || pk || H(pk) || z)`
- `CCA.Decapsulation()` (Algorithm 6, p.16): fallback path uses `z`

## Concept

After `indcpa_keypair(pk, sk)` computes `(pk, sk0)`, KEM code extends `sk` with:

1. `pk`
2. `H(pk)`
3. `z`

So final layout is:

```text
sk = sk0 || pk || H(pk) || z
```

## Code: Finalization in `crypto_kem_keypair`

Sources:

- R1: `crypto_kem/kyber512/kyber512r1/kem.c:22-27`
- R2: `crypto_kem/kyber512/kyber512r2/kem.c:23-28`

```c
indcpa_keypair(pk, sk);                               // writes sk0 into leading sk bytes

for(i=0; i<KYBER_INDCPA_PUBLICKEYBYTES; i++)
  sk[i + KYBER_INDCPA_SECRETKEYBYTES] = pk[i];       // append pk

hash_h(sk + KYBER_SECRETKEYBYTES - 2*KYBER_SYMBYTES,
       pk, KYBER_PUBLICKEYBYTES);                     // append H(pk)

randombytes(sk + KYBER_SECRETKEYBYTES - KYBER_SYMBYTES,
            KYBER_SYMBYTES);                          // append z
```

R1 equivalent uses direct `sha3_256` in place of `hash_h`.

## How Encapsulation/Decapsulation Use This Layout

From `kem.c`:

- `pk` recovered inside decapsulation as:
  - `pk = sk + KYBER_INDCPA_SECRETKEYBYTES`
- Stored `H(pk)` reused to derive reencryption coins.
- `z` is used via constant-time move when ciphertext verification fails.

Relevant lines:

- R2: `crypto_kem/kyber512/kyber512r2/kem.c:82, 86-88, 96`
- R1: `crypto_kem/kyber512/kyber512r1/kem.c:81, 85-87, 95`

## Security Relevance

- Storing `H(pk)` avoids recomputation and keeps FO transform inputs consistent.
- Appending `z` enables pseudorandom shared-secret output on decapsulation failure.
- Constant-time conditional move (`cmov`) prevents direct failure-oracle leakage.

## Consistency Check vs ML-KEM-Style Narrative

Your narrative says KeyGen returns failure `⊥` if `d` or `z` generation fails.  
In this code:

- `randombytes(...)` is called directly.
- No failure code path is checked or returned by KeyGen.

So documentation should treat RNG failure handling as an integration responsibility outside these functions.

## ASCII Final Output Map

```text
pk = ek

sk bytes:
|<------ sk0 ------>|<------ pk ------>|<- H(pk) ->|<--- z --->|
0                INDCPA_SK_END                           SK_END
```

## Final Return

`crypto_kem_keypair` returns `0` and provides:

- `pk` (public key / encapsulation key)
- `sk` (full decapsulation key)

This corresponds to your flow's final `ek` and `dk`.

## Cross-Links

- Initial seed/randomness handling: [02_randomness_and_seeds.md](./02_randomness_and_seeds.md)
- Public key body generation (`t`, `rho`): [06_public_key_construction.md](./06_public_key_construction.md)

