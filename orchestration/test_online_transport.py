"""Behavioral RED tests for orchestration.online_transport (RUN-01A).

Documented supervisory policies asserted by these tests:

* Argument validation ownership: invalid ``wall_timeout``/``byte_cap`` and a
  non-piped stdout/stderr precondition violation raise ``ValueError``, but the
  supervisor must first terminate/reap the provided live child (no leak) and
  invoke ``on_failure`` exactly once before raising.
* Teardown ownership: even when log persistence (log open/write) or pipe
  reading raises OSError, the child is terminated and reaped, ``on_failure``
  runs exactly once, and the original OSError propagates.
* Callback failure policy: if the callback raises after a timeout/teardown,
  the child teardown must still happen and the callback error must be
  visible. If an initial I/O error (log write/read fault) also occurs, the
  I/O error is preserved as primary and the callback error is chained
  (``__cause__``); a callback error with no I/O error propagates as-is.
"""

import builtins
import os
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock

try:
    import online_transport as transport
except ModuleNotFoundError:
    from orchestration import online_transport as transport

CHILD_EXIT7 = (
    "import sys\n"
    "sys.stdout.write('OUT-EXIT7\\n')\n"
    "sys.stdout.flush()\n"
    "sys.stderr.write('ERR-EXIT7\\n')\n"
    "sys.stderr.flush()\n"
    "sys.exit(7)\n"
)

CHILD_EXIT0 = (
    "import sys\n"
    "sys.stdout.write('OUT-OK\\n')\n"
    "sys.stdout.flush()\n"
    "sys.stderr.write('ERR-OK\\n')\n"
    "sys.stderr.flush()\n"
)

CHILD_SLEEP = (
    "import time\n"
    "time.sleep(15)\n"
)

CHILD_FLOOD = (
    "import sys\n"
    "while True:\n"
    "    sys.stdout.buffer.write(b'A' * 8192)\n"
    "    sys.stdout.buffer.flush()\n"
)

CHILD_CLOSE_STREAMS_THEN_SLEEP = (
    "import os, sys, time\n"
    "sys.stdout.flush()\n"
    "sys.stderr.flush()\n"
    "os.close(1)\n"
    "os.close(2)\n"
    "time.sleep(15)\n"
)

CHILD_PARTIAL_OUTPUT_THEN_SLEEP = (
    "import sys, time\n"
    "sys.stdout.write('OUT-PARTIAL-SENTINEL\\n')\n"
    "sys.stdout.flush()\n"
    "sys.stderr.write('ERR-PARTIAL-SENTINEL\\n')\n"
    "sys.stderr.flush()\n"
    "time.sleep(15)\n"
)


CHILD_EXACT_CAP_64_THEN_SLEEP = (
    "import sys, time\n"
    "sys.stdout.buffer.write(b'E' * 32)\n"
    "sys.stdout.buffer.flush()\n"
    "sys.stderr.buffer.write(b'E' * 32)\n"
    "sys.stderr.buffer.flush()\n"
    "time.sleep(15)\n"
)


def spawn_piped_child(source):
    return subprocess.Popen(
        [sys.executable, "-I", "-c", source],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def teardown_child(process):
    if process is None:
        return
    try:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
    finally:
        for stream in (process.stdout, process.stderr):
            if stream is not None and not stream.closed:
                stream.close()


CHILD_CAP_PLUS_ONE = (
    "import sys\n"
    "sys.stdout.buffer.write(b'E' * 33)\n"
    "sys.stdout.buffer.flush()\n"
    "sys.stderr.buffer.write(b'E' * 32)\n"
    "sys.stderr.buffer.flush()\n"
    "sys.exit(0)\n"
)

CHILD_EXACT_CAP_64 = (
    "import sys\n"
    "sys.stdout.buffer.write(b'E' * 32)\n"
    "sys.stdout.buffer.flush()\n"
    "sys.stderr.buffer.write(b'E' * 32)\n"
    "sys.stderr.buffer.flush()\n"
)

CHILD_WRITE_NOTHING_THEN_SLEEP = (
    "import os, sys, time\n"
    "os.close(1)\n"
    "os.close(2)\n"
    "time.sleep(15)\n"
)

CHILD_PREFIX_THEN_SLEEP = (
    "import sys, time\n"
    "sys.stdout.buffer.write(b'PREFIX-SEEN')\n"
    "sys.stdout.buffer.flush()\n"
    "time.sleep(15)\n"
)

PREFIX_SENTINEL = b"PREFIX-SEEN"


class _FailingLogHandle:
    """Context handle whose write() always raises OSError."""

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False

    def write(self, data):
        raise OSError("injected log write failure")



class SuperviseProcessTests(unittest.TestCase):
    maxDiff = None

    def _supervise(self, process, log_path, on_failure, wall_timeout=10.0, byte_cap=16384):
        if isinstance(on_failure, list):
            calls = on_failure
            on_failure = lambda: calls.append("cleanup")
        return transport.supervise_process(
            process,
            wall_timeout=wall_timeout,
            byte_cap=byte_cap,
            log_path=log_path,
            on_failure=on_failure,
        )

    def test_exit7_returns_real_code_streams_and_runs_cleanup(self):
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            calls = []
            process = spawn_piped_child(CHILD_EXIT7)
            try:
                outcome = self._supervise(process, log_path, calls)
                self.assertEqual(outcome.exit_code, 7)
                self.assertIn(b"OUT-EXIT7", outcome.bounded_output)
                self.assertIn(b"ERR-EXIT7", outcome.bounded_output)
                self.assertLessEqual(len(outcome.bounded_output), 16384)
                self.assertEqual(calls, ["cleanup"])
            finally:
                teardown_child(process)

    def test_exit0_captures_output_without_failure_cleanup(self):
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            calls = []
            process = spawn_piped_child(CHILD_EXIT0)
            try:
                outcome = self._supervise(process, log_path, calls)
                self.assertEqual(outcome.exit_code, 0)
                self.assertIn(b"OUT-OK", outcome.bounded_output)
                self.assertIn(b"ERR-OK", outcome.bounded_output)
                self.assertIsNotNone(process.poll())
                self.assertEqual(calls, [])
            finally:
                teardown_child(process)

    def test_sleeping_child_hits_wall_deadline_reaps_and_cleans_up(self):
        wall_timeout = 0.5
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            calls = []
            process = spawn_piped_child(CHILD_SLEEP)
            try:
                started = time.monotonic()
                outcome = self._supervise(
                    process, log_path, calls, wall_timeout=wall_timeout
                )
                elapsed = time.monotonic() - started
                self.assertEqual(calls, ["cleanup"])
                self.assertIsNotNone(process.poll(), "supervisor must reap the timed-out child")
                self.assertIsNone(outcome.exit_code)
                self.assertGreaterEqual(elapsed, wall_timeout * 0.8)
                self.assertLess(elapsed, wall_timeout + 4.5)
            finally:
                teardown_child(process)

    def test_flood_output_enforces_cap_stops_child_and_cleans_up(self):
        byte_cap = 16384
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            calls = []
            process = spawn_piped_child(CHILD_FLOOD)
            try:
                outcome = self._supervise(
                    process, log_path, calls, wall_timeout=10.0, byte_cap=byte_cap
                )
                self.assertEqual(calls, ["cleanup"])
                self.assertIsNotNone(process.poll())
                self.assertIsNone(outcome.exit_code)
                self.assertGreater(len(outcome.bounded_output), 0)
                self.assertLessEqual(len(outcome.bounded_output), byte_cap)
                self.assertEqual(
                    outcome.bounded_output, b"A" * len(outcome.bounded_output)
                )
            finally:
                teardown_child(process)

    def test_deadline_enforced_when_child_closes_outputs_and_lives(self):
        wall_timeout = 0.5
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            calls = []
            process = spawn_piped_child(CHILD_CLOSE_STREAMS_THEN_SLEEP)
            try:
                started = time.monotonic()
                outcome = self._supervise(
                    process, log_path, calls, wall_timeout=wall_timeout
                )
                elapsed = time.monotonic() - started
                self.assertEqual(calls, ["cleanup"])
                self.assertIsNotNone(process.poll())
                self.assertIsNone(outcome.exit_code)
                self.assertGreaterEqual(elapsed, wall_timeout * 0.8)
                self.assertLess(elapsed, wall_timeout + 4.5)
            finally:
                teardown_child(process)

    def test_partial_output_before_timeout_reaches_manager_log(self):
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            calls = []
            process = spawn_piped_child(CHILD_PARTIAL_OUTPUT_THEN_SLEEP)
            try:
                self._supervise(
                    process, log_path, calls, wall_timeout=0.5, byte_cap=65536
                )
                self.assertEqual(calls, ["cleanup"])
                self.assertTrue(
                    os.path.exists(log_path), "manager log must exist after timeout"
                )
                with open(log_path, "rb") as manager_log:
                    persisted = manager_log.read()
                self.assertIn(b"OUT-PARTIAL-SENTINEL", persisted)
                self.assertIn(b"ERR-PARTIAL-SENTINEL", persisted)
            finally:
                teardown_child(process)


    def test_exact_byte_cap_64_is_accepted_not_overflow(self):
        byte_cap = 64
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            calls = []
            process = spawn_piped_child(CHILD_EXACT_CAP_64)
            try:
                outcome = self._supervise(
                    process, log_path, calls, wall_timeout=10.0, byte_cap=byte_cap
                )
                self.assertEqual(calls, [])
                self.assertEqual(outcome.exit_code, 0)
                self.assertEqual(outcome.bounded_output, b"E" * byte_cap)
                self.assertLessEqual(len(outcome.bounded_output), byte_cap)
                with open(log_path, "rb") as manager_log:
                    self.assertEqual(manager_log.read(), b"E" * byte_cap)
            finally:
                teardown_child(process)

    def test_select_oserror_reaps_child_and_invokes_failure_once(self):
        original_select = transport.select.select
        raised = []

        def failing_select(*args, **kwargs):
            error = OSError("injected select failure")
            raised.append(error)
            raise error

        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            calls = []
            process = spawn_piped_child(CHILD_SLEEP)
            transport.select.select = failing_select
            try:
                with self.assertRaises(OSError) as caught:
                    outcome = self._supervise(process, log_path, calls)
                self.assertIs(
                    caught.exception,
                    raised[0],
                    "original select error must propagate",
                )
                self.assertEqual(len(raised), 1)
                self.assertIsNotNone(
                    process.poll(),
                    "child must be terminated and reaped after select failure",
                )
                self.assertEqual(
                    calls,
                    ["cleanup"],
                    "on_failure must be invoked exactly once on select failure",
                )
            finally:
                transport.select.select = original_select
                teardown_child(process)

    def test_log_path_is_directory_real_write_failure_still_runs_cleanup(self):
        with tempfile.TemporaryDirectory() as workspace:
            log_path = workspace
            calls = []
            process = spawn_piped_child(CHILD_SLEEP)
            try:
                with self.assertRaises(OSError):
                    self._supervise(process, log_path, calls, wall_timeout=0.5)
                self.assertIsNotNone(
                    process.poll(),
                    "child must still be reaped when log persistence fails",
                )
                self.assertEqual(
                    calls,
                    ["cleanup"],
                    "failure cleanup callback must run exactly once despite log error",
                )
            finally:
                teardown_child(process)

    def test_actual_log_write_failure_runs_cleanup_reaps_child_and_propagates_error(self):
        """Patched open() writer raising OSError: reap + callback once + OSError."""
        calls = []
        original_open = builtins.open
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            process = spawn_piped_child(CHILD_SLEEP)
            builtins.open = lambda *args, **kwargs: _FailingLogHandle()
            try:
                with self.assertRaises(OSError):
                    self._supervise(process, log_path, lambda: calls.append("cleanup"), wall_timeout=0.5)
                self.assertIsNotNone(process.poll(), "child must be reaped despite log write OSError")
                self.assertEqual(
                    calls,
                    ["cleanup"],
                    "on_failure must be invoked exactly once despite log write OSError",
                )
            finally:
                builtins.open = original_open
                teardown_child(process)

    def test_actual_read_fault_reaps_child_and_invokes_callback_once(self):
        """Patched transport.os.read raising OSError mid-capture."""
        original_read = transport.os.read
        raised = []

        def bad_read(fd, size):
            error = OSError("injected read failure")
            raised.append(error)
            raise error

        calls = []
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            process = spawn_piped_child(CHILD_FLOOD)
            transport.os.read = bad_read
            try:
                with self.assertRaises(OSError) as caught:
                    self._supervise(process, log_path, lambda: calls.append("cleanup"))
                self.assertIs(caught.exception, raised[0], "original read error must propagate")
                self.assertEqual(len(raised), 1)
                self.assertIsNotNone(process.poll(), "failed read must still reap child")
                self.assertEqual(calls, ["cleanup"])
            finally:
                transport.os.read = original_read
                teardown_child(process)

    def test_callback_raises_runtime_error_after_timeout_child_still_reaped(self):
        """Teardown happens even when the failure callback raises RuntimeError."""
        calls = []

        def raising_callback():
            calls.append("cleanup")
            raise RuntimeError("callback failure after teardown")

        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            process = spawn_piped_child(CHILD_SLEEP)
            try:
                with self.assertRaises(RuntimeError) as raised:
                    self._supervise(process, log_path, raising_callback, wall_timeout=0.5)
                self.assertEqual(calls, ["cleanup"])
                self.assertIsNotNone(process.poll(), "callback error must not skip reap")
                self.assertIn("callback failure", str(raised.exception))
            finally:
                teardown_child(process)

    def test_initial_oserror_is_primary_and_callback_runtime_error_chained(self):
        """Policy: I/O error stays primary; callback error exposed via __cause__."""
        calls = []

        def raising_callback():
            calls.append("cleanup")
            raise RuntimeError("callback failure after teardown")

        original_open = builtins.open
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            process = spawn_piped_child(CHILD_SLEEP)
            builtins.open = lambda *args, **kwargs: _FailingLogHandle()
            try:
                with self.assertRaises(OSError) as caught:
                    self._supervise(process, log_path, raising_callback, wall_timeout=0.5)
                self.assertIsInstance(caught.exception.__cause__, RuntimeError)
                self.assertEqual(calls, ["cleanup"])
                self.assertIsNotNone(process.poll())
            finally:
                builtins.open = original_open
                teardown_child(process)

    def test_cap_plus_one_across_combined_streams_overflows_and_converges_to_cap(self):
        """33 stdout + 32 stderr against cap 64 triggers decisive overflow."""
        byte_cap = 64
        calls = []
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            process = spawn_piped_child(CHILD_CAP_PLUS_ONE)
            try:
                outcome = self._supervise(
                    process, log_path, lambda: calls.append("cleanup"),
                    wall_timeout=5.0, byte_cap=byte_cap,
                )
                self.assertEqual(calls, ["cleanup"])
                self.assertIsNotNone(process.poll())
                self.assertIsNone(
                    outcome.exit_code,
                    "cap overflow must suppress the real exit code",
                )
                self.assertEqual(len(outcome.bounded_output), byte_cap)
            finally:
                teardown_child(process)

    def test_exactly_cap_followed_by_sleep_hits_timeout_not_immediate_overflow(self):
        """Child emitting exactly cap (64) then sleeping must hit wall timeout."""
        byte_cap = 64
        wall_timeout = 0.5
        calls = []
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            process = spawn_piped_child(CHILD_EXACT_CAP_64_THEN_SLEEP)
            try:
                started = time.monotonic()
                outcome = self._supervise(
                    process, log_path, lambda: calls.append("cleanup"),
                    wall_timeout=wall_timeout, byte_cap=byte_cap,
                )
                elapsed = time.monotonic() - started
                self.assertEqual(outcome.bounded_output, b"E" * byte_cap)
                self.assertIsNone(outcome.exit_code)
                self.assertEqual(calls, ["cleanup"])
                self.assertIsNotNone(process.poll())
                self.assertGreaterEqual(elapsed, wall_timeout * 0.8)
                self.assertLess(elapsed, wall_timeout + 4.5)
            finally:
                teardown_child(process)

    def test_invalid_wall_timeouts_and_byte_caps_raise_value_error(self):
        """0/negative/nan/inf wall_timeout and 0/neg/noninteger cap => ValueError."""
        calls = []
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            invalid_cases = [
                ("wall_timeout", {"wall_timeout": bad}) for bad in (0, -1.0, float("nan"), float("inf"))
            ] + [
                ("byte_cap", {"byte_cap": bad}) for bad in (0, -8, 1.5)
            ]
            try:
                for index, (label, kwargs) in enumerate(invalid_cases, start=1):
                    process = spawn_piped_child(CHILD_SLEEP)
                    try:
                        with self.subTest(field=label, kwargs=kwargs):
                            with self.assertRaises(ValueError):
                                self._supervise(
                                    process, log_path, lambda: calls.append("cleanup"),
                                    **kwargs,
                                )
                            self.assertIsNotNone(
                                process.poll(),
                                "invalid %s must reap child" % label,
                            )
                            self.assertEqual(
                                calls,
                                ["cleanup"] * index,
                                "invalid %s must invoke cleanup exactly once" % label,
                            )
                    finally:
                        teardown_child(process)
            finally:
                self.assertEqual(
                    calls, ["cleanup"] * 7,
                    "each invalid case must invoke cleanup exactly once",
                )

    def test_non_piped_stdout_raises_value_error_precondition(self):
        """Documented precondition: stdout/stderr must be pipes (ValueError)."""
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            process = subprocess.Popen(
                [sys.executable, "-I", "-c", CHILD_EXIT0],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            calls = []
            try:
                with self.assertRaises(ValueError):
                    self._supervise(process, log_path, lambda: calls.append("cleanup"))
                self.assertIsNotNone(process.poll(), "invalid-pipe child must be reaped")
                self.assertEqual(calls, ["cleanup"])
            finally:
                teardown_child(process)

    def _install_read_then_select_fault(self, process, sentinel, injected_error):
        """Patch real os.read (recording) and select; select faults after sentinel.

        Returns the started patchers; caller must stop() them in finally.
        """
        recorded = []
        original_read = transport.os.read
        original_select = transport.select.select

        def recording_read(fd, size):
            chunk = original_read(fd, size)
            if chunk:
                recorded.append(chunk)
            return chunk

        def gated_select(*args, **kwargs):
            if sentinel in b"".join(recorded):
                raise injected_error
            return original_select(*args, **kwargs)

        patchers = [
            mock.patch.object(transport.os, "read", recording_read),
            mock.patch.object(transport.select, "select", gated_select),
        ]
        for patcher in patchers:
            patcher.start()
        return patchers

    def test_capture_fault_after_prefix_reaps_callback_once_and_persists_prefix(self):
        """Select OSError injected only after real prefix read: propagate + log."""
        injected = OSError("injected select failure after prefix")
        calls = []
        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            process = spawn_piped_child(CHILD_PREFIX_THEN_SLEEP)
            patchers = []
            try:
                patchers = self._install_read_then_select_fault(
                    process, PREFIX_SENTINEL, injected
                )
                with self.assertRaises(OSError) as caught:
                    self._supervise(
                        process, log_path, lambda: calls.append("cleanup"),
                        wall_timeout=5.0,
                    )
                self.assertIs(
                    caught.exception,
                    injected,
                    "the injected capture OSError must propagate as-is",
                )
                self.assertIsNotNone(
                    process.poll(),
                    "child must be terminated and reaped after capture fault",
                )
                self.assertEqual(
                    calls,
                    ["cleanup"],
                    "on_failure must be invoked exactly once after capture fault",
                )
                self.assertTrue(
                    os.path.exists(log_path),
                    "manager log must exist after capture fault",
                )
                with open(log_path, "rb") as manager_log:
                    persisted = manager_log.read()
                self.assertEqual(
                    persisted,
                    PREFIX_SENTINEL,
                    "captured prefix must be persisted to the manager log",
                )
            finally:
                for patcher in patchers:
                    patcher.stop()
                teardown_child(process)

    def test_capture_fault_with_raising_callback_oserror_primary_and_cause_chained(self):
        """OSError stays primary; callback RuntimeError chained via __cause__."""
        injected = OSError("injected select failure after prefix")
        callback_calls = []

        def recording_on_failure():
            callback_calls.append("cleanup")
            raise RuntimeError("callback failure after capture fault")

        with tempfile.TemporaryDirectory() as workspace:
            log_path = os.path.join(workspace, "worker.log")
            process = spawn_piped_child(CHILD_PREFIX_THEN_SLEEP)
            patchers = []
            try:
                patchers = self._install_read_then_select_fault(
                    process, PREFIX_SENTINEL, injected
                )
                with self.assertRaises(OSError) as caught:
                    self._supervise(
                        process, log_path, recording_on_failure, wall_timeout=5.0
                    )
                self.assertIs(
                    caught.exception,
                    injected,
                    "original injected OSError must remain the primary exception",
                )
                self.assertIsInstance(
                    caught.exception.__cause__,
                    RuntimeError,
                    "callback RuntimeError must be chained as __cause__",
                )
                self.assertIn(
                    "callback failure",
                    str(caught.exception.__cause__),
                )
                self.assertIsNotNone(
                    process.poll(),
                    "child must be terminated and reaped after capture fault",
                )
                self.assertEqual(
                    callback_calls,
                    ["cleanup"],
                    "raising on_failure must still be invoked exactly once",
                )
                self.assertTrue(
                    os.path.exists(log_path),
                    "manager log must exist after capture fault",
                )
                with open(log_path, "rb") as manager_log:
                    persisted = manager_log.read()
                self.assertEqual(
                    persisted,
                    PREFIX_SENTINEL,
                    "captured prefix must be preserved in the manager log",
                )
            finally:
                for patcher in patchers:
                    patcher.stop()
                teardown_child(process)


if __name__ == "__main__":
    unittest.main()
