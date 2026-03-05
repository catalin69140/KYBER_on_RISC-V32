# Kyber Diagram Editor

This tool edits the primary reference diagram and generates a drop-in `renderPrimaryReferenceDiagram()` implementation for a specific ELF key.

## Run the editor

```bash
python3 Kyber/diagram_editor/server.py --elf crypto_kem_kyber768_kyber768r1_hashing.elf --port 8765
```

Then open:

```text
http://127.0.0.1:8765/editor.html?elf=crypto_kem_kyber768_kyber768r1_hashing.elf
```

## Output paths

For ELF `crypto_kem_kyber768_kyber768r1_hashing.elf`:

- Store JSON: `Kyber/generated_diagrams/crypto_kem_kyber768_kyber768r1_hashing/crypto_kem_kyber768_kyber768r1_hashing.diagram_store.json`
- Generated renderer: `Kyber/generated_diagrams/crypto_kem_kyber768_kyber768r1_hashing/renderPrimaryReferenceDiagram.js`

The generated JS includes:

- `generatedRenderPrimaryReferenceDiagram()`
- `renderPrimaryReferenceDiagram()` wrapper (drop-in compatible)
