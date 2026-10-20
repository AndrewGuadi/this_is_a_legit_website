# Neon Breaker physical phone review

Run `python tests/game/preview.py` using the project Python environment. This is a local synthetic fixture, **not a production server**. In Codespaces forward port **5084 privately** and open `/__fixture/neon-device` from the named phone. Keep the Codespace running. Do not make the fixture port public.

Enter phone model, OS and browser version, then start the ten-minute check. Play with the touch strip in portrait and landscape; rotation must pause and require Resume. Complete all three stages, try Restart → Keep playing, then replay until the timer finishes. Observe missed touches, controls hidden by safe areas, scrolling outside the game, stutter and heat. Prefer a representative lower-powered phone. A desktop resized to phone dimensions does not satisfy this check.

Save the local JSON report and give TODD the phone details, whether you completed both orientations, and any problems. The report measures active-play frame median/p95, long tasks where supported, and optional JS heap samples. Heap figures are not whole-device memory. Missing browser APIs remain unavailable. Measurements stay in the browser/download and are never sent to the app.

The report identifies the game source content hash. It does not prove human participation or physical hardware by itself; tester observations and a named device are also required. The ten-category review cannot pass until the required real-device and independent play evidence is present.
