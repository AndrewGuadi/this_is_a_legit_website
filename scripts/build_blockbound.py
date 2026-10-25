#!/usr/bin/env python3
"""Build the original Blockbound C core as a dependency-free WebAssembly module."""
from pathlib import Path
import base64
import os
import shlex
import shutil
import subprocess
import tempfile
import textwrap

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "games" / "blockbound" / "core.c"
OUTPUT = ROOT / "static" / "blockbound" / "blockbound.wasm.base64"
EXPORTS = (
    "bb_reset", "bb_start", "bb_toggle_pause", "bb_set_input", "bb_step", "bb_interact",
    "bb_mode", "bb_shards", "bb_talked_count", "bb_message", "bb_nearby", "bb_player_x",
    "bb_player_y", "bb_player_angle", "bb_framebuffer", "bb_render",
)


def compiler():
    if os.environ.get("ZIG"):
        return shlex.split(os.environ["ZIG"]) + ["cc"]
    if shutil.which("zig"):
        return ["zig", "cc"]
    if shutil.which("clang") and shutil.which("wasm-ld"):
        return ["clang"]
    raise SystemExit("Install Zig or clang+lld, or set ZIG to a Zig command.")


def linker_arguments():
    arguments = ["--no-entry", "--export-memory", "-z", "stack-size=65536"]
    arguments += [f"--export={name}" for name in EXPORTS]
    arguments += ["--initial-memory=1048576", "--max-memory=1048576", "--strip-all"]
    return arguments


def main():
    command = compiler()
    with tempfile.TemporaryDirectory(prefix="blockbound-build-") as directory:
        binary = Path(directory) / "blockbound.wasm"
        if command[-1] == "cc":
            zig = command[:-1]
            object_file = Path(directory) / "core.o"
            subprocess.run(command + [
                "-target", "wasm32-freestanding", "-std=c99", "-Os", "-fno-stack-protector",
                "-c", str(SOURCE), "-o", str(object_file),
            ], check=True, cwd=ROOT)
            subprocess.run(zig + ["wasm-ld"] + linker_arguments() + [
                "-o", str(binary), str(object_file),
            ], check=True, cwd=ROOT)
        else:
            subprocess.run(command + [
                "--target=wasm32", "-ffreestanding", "-std=c99", "-Os", "-nostdlib", "-fno-stack-protector",
            ] + ["-Wl," + argument for argument in linker_arguments()] + [
                "-o", str(binary), str(SOURCE),
            ], check=True, cwd=ROOT)
        binary_size = binary.stat().st_size
        encoded = base64.b64encode(binary.read_bytes()).decode("ascii")
        OUTPUT.write_text("\n".join(textwrap.wrap(encoded, 76)) + "\n", encoding="ascii")
    print(f"Built {OUTPUT.relative_to(ROOT)} from {binary_size:,} WebAssembly bytes")


if __name__ == "__main__":
    main()
