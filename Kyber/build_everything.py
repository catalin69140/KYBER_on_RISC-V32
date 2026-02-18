#!/usr/bin/env python3
"""
Builds all of the binaries without flashing them.
"""

from interface import *
from mupq import mupq

import sys
import json
import time
import os
from pathlib import Path
import subprocess

LOG_PATH = Path("build_trace.jsonl")

# Clear the log on each fresh run (before doing any builds):
if LOG_PATH.exists():
    LOG_PATH.unlink()

# --- Save original subprocess functions so we can call them later ---
_original_run = subprocess.run
_original_check_call = subprocess.check_call
_original_check_output = subprocess.check_output


def _log_entry(cmd_list, cwd, env):
    """Helper: write a single entry into build_trace.jsonl."""
    entry = {
        "timestamp": time.time(),
        "cwd": os.path.abspath(cwd or os.getcwd()),
        "cmd": cmd_list,
        "env": {k: (env or os.environ).get(k, "") for k in ("PATH", "PLATFORM", "SCHEME")},
    }
    with LOG_PATH.open("a") as f:
        f.write(json.dumps(entry) + "\n")

    # Optional console echo so you see what’s going on
    print("[build_everything] running:", " ".join(cmd_list))


def run_logged(cmd, cwd=None, env=None, **kwargs):
    """
    Core logger: normalize cmd, log, then call the ORIGINAL subprocess.run.
    """
    if isinstance(cmd, str):
        cmd_list = cmd.split()
    else:
        cmd_list = list(cmd)

    _log_entry(cmd_list, cwd, env)

    # Use the *original* run to avoid infinite recursion
    return _original_run(cmd_list, cwd=cwd, env=env, **kwargs)


def logged_run(*args, **kwargs):
    """
    Replacement for subprocess.run that passes through run_logged.
    Mirrors the subprocess.run(...) API.
    """
    # subprocess.run(args, *, stdin=None, input=None, ...)
    if "args" in kwargs:
        cmd = kwargs["args"]
    elif args:
        cmd = args[0]
        args = args[1:]
    else:
        raise TypeError("logged_run() missing required argument 'args'")

    cwd = kwargs.get("cwd")
    env = kwargs.get("env")

    kwargs2 = dict(kwargs)
    kwargs2.pop("args", None)
    kwargs2.pop("cwd", None)
    kwargs2.pop("env", None)

    # Call our logger (which will call _original_run)
    return run_logged(cmd, cwd=cwd, env=env, **kwargs2)


def logged_check_call(*args, **kwargs):
    """
    Replacement for subprocess.check_call that logs and then calls the original.
    """
    if "args" in kwargs:
        cmd = kwargs["args"]
    elif args:
        cmd = args[0]
        args = args[1:]
    else:
        raise TypeError("logged_check_call() missing required argument 'args'")

    cwd = kwargs.get("cwd")
    env = kwargs.get("env")

    kwargs2 = dict(kwargs)
    kwargs2.pop("args", None)
    kwargs2.pop("cwd", None)
    kwargs2.pop("env", None)

    # Normalize cmd for logging but pass the original object to check_call
    if isinstance(cmd, str):
        cmd_list = cmd.split()
    else:
        cmd_list = list(cmd)

    _log_entry(cmd_list, cwd, env)

    return _original_check_call(cmd, cwd=cwd, env=env, **kwargs2)


def logged_check_output(*args, **kwargs):
    """
    Replacement for subprocess.check_output that logs and then calls the original.
    """
    if "args" in kwargs:
        cmd = kwargs["args"]
    elif args:
        cmd = args[0]
        args = args[1:]
    else:
        raise TypeError("logged_check_output() missing required argument 'args'")

    cwd = kwargs.get("cwd")
    env = kwargs.get("env")

    kwargs2 = dict(kwargs)
    kwargs2.pop("args", None)
    kwargs2.pop("cwd", None)
    kwargs2.pop("env", None)

    if isinstance(cmd, str):
        cmd_list = cmd.split()
    else:
        cmd_list = list(cmd)

    _log_entry(cmd_list, cwd, env)

    return _original_check_output(cmd, cwd=cwd, env=env, **kwargs2)


# --- Monkey-patch subprocess so everyone (interface.py, mupq, etc.) is logged ---
subprocess.run = logged_run
subprocess.check_call = logged_check_call
subprocess.check_output = logged_check_output


if __name__ == "__main__":
    args, rest = parse_arguments()
    platform, settings = get_platform(args)
    mupq.BuildAll(settings).test_all(rest)
