# Call Graph Generation for Kyber (ELF → DOT → HTML)

This is used to analyze the execution structure in the browser of a given elf file,as an example:

```
crypto_kem_kyber768_kyber768r1_hashing.elf
```

---

# Structure

```
.
├── build_everything.py
├── callgraph_elf.py
├── elf/
│   └── crypto_kem_kyber768_kyber768r1_hashing.elf
```

---

# Prerequisites

Make sure the following tools are installed:

```bash
sudo apt update
sudo apt install -y python3 python3-pip graphviz
```

Optional but recommended Python packages:

```bash
pip3 install networkx pydot
```

---

# Step 1 — Build the ELF firmware

This step compiles Kyber for the VexRiscV simulator and produces the ELF file.

```bash
make clean
DEBUG=1 ./build_everything.py -s pqvexriscvsim kyber768
```

After building, the ELF should appear at:

```
elf/crypto_kem_kyber768_kyber768r1_hashing.elf
```

Verify:

```bash
ls -lh elf/crypto_kem_kyber768_kyber768r1_hashing.elf
```

---

# Step 2 — Generate the DOT Call Graph

Create the raw Graphviz call graph:

```bash
./callgraph_elf.py elf/crypto_kem_kyber768_kyber768r1_hashing.elf \
  --dot callgraph_hashing.dot
```

Optional: convert DOT → PNG image

```bash
dot -Tpng callgraph_hashing.dot -o callgraph_hashing.png
```

---

# Step 3 — Generate the Interactive HTML Visualization

Create the animated / interactive call graph:

```bash
./callgraph_elf.py elf/crypto_kem_kyber768_kyber768r1_hashing.elf \
  --html callgraph_hashing.html
```

Open it in your browser by clicking the .html file generated or by entering in the terminal:

```bash
xdg-open callgraph_hashing.html
```

---

# One-Command Workflow

Run the full pipeline in one go:

```bash
make clean
DEBUG=1 ./build_everything.py -s pqvexriscvsim kyber768 && \
./callgraph_elf.py elf/crypto_kem_kyber768_kyber768r1_hashing.elf --dot callgraph_hashing.dot && \
./callgraph_elf.py elf/crypto_kem_kyber768_kyber768r1_hashing.elf --html callgraph_hashing.html
```

---

# Output Files

| File                     | Description               |
| ------------------------ | ------------------------- |
| `*.elf`                  | Compiled firmware binary  |
| `callgraph_hashing.dot`  | Graphviz call graph       |
| `callgraph_hashing.png`  | Static image (optional)   |
| `callgraph_hashing.html` | Interactive visualization |

---

# Why This Is Useful

This workflow is especially helpful for:

* Post-quantum crypto analysis
* Embedded firmware inspection
* Performance and code-path exploration
* Academic research and reports

---

If the HTML page appears empty, verify Graphviz is installed:

```bash
dot -V
```
