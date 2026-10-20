"""Minimal stdlib process-supervisor for the manager runner (RUN-01A GREEN)."""

import math
import os
import select
import stat
import subprocess
import time

_POLL_SLICE = 0.05
_KILL_GRACE = 2.0
_READ_SIZE = 65536


class ProcessOutcome:
    """Actual exit code plus bounded combined output as observed from a child."""

    __slots__ = ("exit_code", "bounded_output")

    def __init__(self, exit_code=None, bounded_output=b""):
        self.exit_code = exit_code
        self.bounded_output = bounded_output

    def __repr__(self):
        return "ProcessOutcome(exit_code=%r, bounded_output=%d bytes)" % (
            self.exit_code,
            len(self.bounded_output),
        )


def _validate_preconditions(process, wall_timeout, byte_cap):
    """Raise ValueError unless every documented precondition holds.

    ``wall_timeout`` must be a positive finite number of seconds, ``byte_cap``
    a positive integer, and ``process.stdout``/``process.stderr`` must be
    separately piped, open os pipes (readable fifos).
    """
    if isinstance(wall_timeout, bool) or not isinstance(wall_timeout, (int, float)):
        raise ValueError("wall_timeout must be a positive finite number of seconds")
    if not math.isfinite(wall_timeout) or wall_timeout <= 0:
        raise ValueError("wall_timeout must be a positive finite number of seconds")
    if isinstance(byte_cap, bool) or not isinstance(byte_cap, int) or byte_cap <= 0:
        raise ValueError("byte_cap must be a positive integer byte count")
    for stream_name, stream in (("stdout", process.stdout), ("stderr", process.stderr)):
        if stream is None:
            raise ValueError(
                "process.%s must be a separately piped, open stream" % stream_name
            )
        try:
            pipe_like = stat.S_ISFIFO(os.fstat(stream.fileno()).st_mode)
        except (OSError, ValueError) as precondition_error:
            raise ValueError(
                "process.%s must be a separately piped, open stream" % stream_name
            ) from precondition_error
        if not pipe_like:
            raise ValueError(
                "process.%s must be a separately piped, open stream" % stream_name
            )


def _capture_streams(process, deadline, byte_cap, captured):
    """Bounded combined capture from piped stdout/stderr.

    Reads until both pipes reach EOF, the wall ``deadline`` expires, or a
    decisive overflow happens: exactly ``byte_cap`` bytes are permitted and
    any single byte beyond the cap marks overflow. Reaching exactly the cap is
    not an overflow and the deadline keeps enforcing afterwards, even after
    both pipes close while the child lives. Every os.read is bounded by
    ``_READ_SIZE``; unbounded communicate() is never used.

    ``captured`` is the supervisor-owned bytearray that accumulates output in
    place, so bytes read before a mid-capture error remain available to the
    caller even when this function raises.

    Returns ``(timed_out, overflow)``.
    """
    live = [process.stdout.fileno(), process.stderr.fileno()]
    timed_out = False
    overflow = False
    while live or process.poll() is None:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            timed_out = True
            break
        readable = select.select(live, [], [], min(remaining, _POLL_SLICE))[0]
        for fd in readable:
            chunk = os.read(fd, _READ_SIZE)
            if not chunk:
                live.remove(fd)
                continue
            room = byte_cap - len(captured)
            if room <= 0:
                overflow = True
                break
            if len(chunk) > room:
                captured.extend(chunk[:room])
                overflow = True
                break
            captured.extend(chunk)
        if overflow:
            break
        if not live and process.poll() is None:
            time.sleep(_POLL_SLICE)
    return timed_out, overflow


def _terminate_and_reap(process):
    """Owning teardown: terminate any live child, escalate to kill, then reap."""
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=_KILL_GRACE)
        except subprocess.TimeoutExpired:
            process.kill()
            try:
                process.wait(timeout=_KILL_GRACE)
            except subprocess.TimeoutExpired:
                pass
    return process.poll()


def _shutdown_child(process):
    """Best-effort teardown for error paths; never masks the primary error."""
    try:
        _terminate_and_reap(process)
    except Exception:
        pass


def supervise_process(process, *, wall_timeout, byte_cap, log_path, on_failure):
    """Supervise a piped child under a wall deadline and a combined byte cap.

    Preconditions (validated first; a violation raises ValueError only after
    the supplied child is terminated/reaped and ``on_failure`` has run exactly
    once): ``process`` must be a subprocess.Popen with separately piped open
    stdout/stderr pipes, ``wall_timeout`` a positive finite number of seconds,
    and ``byte_cap`` a positive integer.

    Capture policy: actual stdout/stderr are captured in bounded memory, at
    most ``byte_cap`` combined bytes, without unbounded communicate(). Exactly
    the cap is accepted; only an additional byte establishes overflow, which
    suppresses the exit code (None is reported, like on timeout).

    Cleanup ownership: this supervisor owns the child on every exit path,
    including timeout, overflow, capture/read/select errors, and log
    persistence errors — the child is always terminated/reaped before
    ``on_failure`` is invoked (the callback can never skip teardown). Normal
    exit keeps the actual exit code (including nonzero codes such as 7).
    Captured bytes (the retained partial output) are persisted to the
    manager-owned ``log_path``. On the success path, log open/write errors
    become the primary exception with a failing callback chained via
    ``__cause__``; when only the callback fails, its exception propagates
    as-is. On capture/read/select error paths, whatever was captured so far is
    still persisted (best effort) before ``on_failure`` runs, and the original
    capture exception stays primary with the callback error chained via
    ``__cause__``. Reaping is non-silent: if the child cannot be terminated
    and reaped, supervision fails instead of returning while the child still
    runs.
    """
    callback_invoked = False
    captured = bytearray()

    def invoke_on_failure_once():
        nonlocal callback_invoked
        if not callback_invoked:
            callback_invoked = True
            on_failure()

    def persist_captured():
        """Best-effort persistence of whatever was captured so far."""
        try:
            with open(log_path, "wb") as manager_log:
                manager_log.write(bytes(captured))
            return None
        except Exception as log_error:
            return log_error

    try:
        _validate_preconditions(process, wall_timeout, byte_cap)
        deadline = time.monotonic() + wall_timeout
        timed_out, overflow = _capture_streams(process, deadline, byte_cap, captured)
        _terminate_and_reap(process)
        exit_code = process.poll()
        if exit_code is None:
            raise RuntimeError("supervision ended while the child still runs")
        failed = timed_out or overflow or exit_code != 0
        reported_exit = None if (timed_out or overflow) else exit_code
    except BaseException as primary_error:
        _shutdown_child(process)
        log_error = persist_captured()
        callback_error = None
        try:
            invoke_on_failure_once()
        except Exception as raised_callback_error:
            callback_error = raised_callback_error
        cause = callback_error if callback_error is not None else log_error
        if cause is not None:
            raise primary_error from cause
        raise

    primary_error = None
    try:
        with open(log_path, "wb") as manager_log:
            manager_log.write(bytes(captured))
    except Exception as log_error:
        primary_error = log_error

    callback_error = None
    if primary_error is not None or failed:
        try:
            invoke_on_failure_once()
        except Exception as raised_callback_error:
            callback_error = raised_callback_error

    if primary_error is not None:
        if callback_error is not None:
            raise primary_error from callback_error
        raise primary_error
    if callback_error is not None:
        raise callback_error
    return ProcessOutcome(exit_code=reported_exit, bounded_output=bytes(captured))
