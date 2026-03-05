#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict
from urllib.parse import parse_qs, urlparse

if __package__ in (None, ""):
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    from diagram_editor.storage import (  # type: ignore
        diagram_store_path_for_elf,
        ensure_generated_renderer_for_elf,
        generated_renderer_path_for_elf,
        load_diagram_model_for_elf,
        save_diagram_model_for_elf,
    )
else:
    from .storage import (
        diagram_store_path_for_elf,
        ensure_generated_renderer_for_elf,
        generated_renderer_path_for_elf,
        load_diagram_model_for_elf,
        save_diagram_model_for_elf,
    )

THIS_DIR = Path(__file__).resolve().parent
EDITOR_HTML = THIS_DIR / "editor.html"
EDITOR_JS = THIS_DIR / "editor.js"


class DiagramEditorHandler(BaseHTTPRequestHandler):
    default_elf_name = ""

    def log_message(self, fmt: str, *args: Any) -> None:
        # Keep server output compact.
        print(f"[diagram_editor] {self.address_string()} - {fmt % args}")

    def _send_json(self, payload: Dict[str, Any], status: int = HTTPStatus.OK) -> None:
        body = (json.dumps(payload, indent=2) + "\n").encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_text(self, body: str, content_type: str = "text/plain; charset=utf-8", status: int = HTTPStatus.OK) -> None:
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_json_body(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        if not raw.strip():
            return {}
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        if isinstance(parsed, dict):
            return parsed
        return {}

    def _query_elf_name(self, parsed) -> str:
        params = parse_qs(parsed.query or "")
        elf_name = (params.get("elf") or [""])[0].strip()
        return elf_name or self.default_elf_name or "unknown.elf"

    def _serve_static_file(self, path: Path, content_type: str) -> None:
        if not path.exists():
            self._send_text("Not found\n", status=HTTPStatus.NOT_FOUND)
            return
        self._send_text(path.read_text(), content_type=content_type, status=HTTPStatus.OK)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        route = parsed.path

        if route in ("/", "/editor", "/editor.html"):
            self._serve_static_file(EDITOR_HTML, "text/html; charset=utf-8")
            return
        if route == "/editor.js":
            self._serve_static_file(EDITOR_JS, "application/javascript; charset=utf-8")
            return
        if route == "/health":
            self._send_json({"ok": True, "status": "healthy"})
            return
        if route == "/api/model":
            elf_name = self._query_elf_name(parsed)
            model = load_diagram_model_for_elf(elf_name)
            self._send_json(
                {
                    "ok": True,
                    "elf": elf_name,
                    "model": model,
                    "paths": {
                        "store": str(diagram_store_path_for_elf(elf_name)),
                        "renderer": str(generated_renderer_path_for_elf(elf_name)),
                    },
                }
            )
            return

        self._send_text("Not found\n", status=HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        route = parsed.path
        body = self._read_json_body()

        if route == "/api/model":
            elf_name = self._query_elf_name(parsed)
            model_payload = body.get("model", body)
            normalized = save_diagram_model_for_elf(elf_name, model_payload)
            self._send_json(
                {
                    "ok": True,
                    "elf": elf_name,
                    "model": normalized,
                    "paths": {"store": str(diagram_store_path_for_elf(elf_name))},
                }
            )
            return

        if route == "/api/generate":
            elf_name = self._query_elf_name(parsed)
            model_payload = body.get("model")
            out_path, normalized, source = ensure_generated_renderer_for_elf(elf_name, model=model_payload)
            self._send_json(
                {
                    "ok": True,
                    "elf": elf_name,
                    "model": normalized,
                    "renderer": {
                        "path": str(out_path),
                        "bytes": len(source.encode("utf-8")),
                    },
                    "paths": {
                        "store": str(diagram_store_path_for_elf(elf_name)),
                        "renderer": str(out_path),
                    },
                }
            )
            return

        self._send_text("Not found\n", status=HTTPStatus.NOT_FOUND)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Kyber primary diagram editor server.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8765, help="Bind port (default: 8765)")
    parser.add_argument(
        "--elf",
        default="",
        help="Default ELF filename to use as the storage key (can be overridden via ?elf=...).",
    )
    args = parser.parse_args()

    DiagramEditorHandler.default_elf_name = args.elf
    server = ThreadingHTTPServer((args.host, args.port), DiagramEditorHandler)
    print(f"Kyber diagram editor: http://{args.host}:{args.port}/editor.html?elf={args.elf or 'your.elf'}")
    server.serve_forever()


if __name__ == "__main__":
    main()
