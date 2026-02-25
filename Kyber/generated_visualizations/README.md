# Generated Visualization Assets

Store generated CrypTool visualization artifacts here, grouped by ELF file.

Recommended layout:

```text
Kyber/generated_visualizations/
  <elf-stem>/
    cryptotool.html
    callgraph_full.dot
    steps_keygen.json
    keygen_callgraph.dot
    keygen_callgraph.meta.json
```

Notes:

- `cryptotool.html` is the single UI file (global graph + tab-specific steps).
- `callgraph_full.dot` is the full ELF call graph used for the main/right diagram.
- `steps_keygen.json` is generated from `Kyber/docs/keygen/*.md` (source of truth).
- `keygen_callgraph.dot` and `keygen_callgraph.meta.json` are KeyGen-focused assets for step mapping and metadata.
