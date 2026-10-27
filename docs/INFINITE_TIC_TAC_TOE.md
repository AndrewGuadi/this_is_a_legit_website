# Infinite Tic-Tac-Toe implementation contract

**Status:** playable review candidate, not an independently approved production release.

## Scope

Infinite Tic-Tac-Toe is a local, same-device, two-player strategy game. It has no computer opponent, accounts, matchmaking, sockets, server moves, or online synchronization. The board and match score last for the current page only. An optional sound preference may be stored in the browser; storage denial does not prevent play.

The implementation uses original code, text, and geometric artwork. It adds no third-party runtime dependency, advertising, analytics, game telemetry, or external request.

## Rules

1. X starts the first round. Players alternate after every legal board move; the starting player alternates between rounds.
2. Before choosing a cell, the current player can switch freely between **Place** and **Remove**. Switching does not consume a turn.
3. **Place** adds the current player's mark to an empty cell. **Remove** erases one opposing mark. Occupied placements, empty removals, and removing one's own mark are rejected without changing the turn or board.
4. Three of the current player's marks in any row, column, or diagonal scores one point and completes the round. The completed line remains visible until the players start the next round.
5. A full board without a line is a draw and awards no point. There is no match-ending victory: rounds and scores can continue indefinitely.
6. The game tracks each player's consecutive own turns. If both players repeat their exact action (`place` or `remove`) on the same cell three own-turns in a row, the board resets automatically. This catches the common place/remove/place/remove loop. Scores, round number, and total match moves remain; repeat history clears and the player who did not just move takes the next turn.
7. Reset match requires confirmation. It clears the board, scores, round, loop count, moves, and repeat history. Cancelling preserves the exact match.

## Interface and accessibility

- Nine native cell buttons expose position, contents, available action, and disabled state to assistive technology.
- Tab reaches every control; arrow keys move between cells; Enter or Space activates the focused cell.
- X/O shapes and text labels do not rely on color alone. Visible focus, 44px minimum touch targets, responsive layouts, reduced motion, and live status announcements are included.
- The game is event-driven with no animation or simulation loop. Visibility changes and resizing therefore require no simulation pause.
- Sound is synthesized locally, begins only after user interaction, and can be switched off. Audio failure leaves the complete game playable silently.

## Files

- `static/infinite-tic-tac-toe/core.mjs` — deterministic rules and state transitions.
- `static/infinite-tic-tac-toe/game.mjs` — DOM input, accessible presentation, local sound, and reset dialog.
- `static/infinite-tic-tac-toe/game.css` — responsive game presentation.
- `templates/infinite_tic_tac_toe.html` — game page and instructions.
- `tests/game/infinite-tic-tac-toe.test.mjs` — deterministic rule coverage.
- `tests/browser/infinite-tic-tac-toe.spec.js` — real-browser interaction, touch, accessibility, failure-path, and layout coverage.

## Verification

Run from the repository root:

```sh
node --test tests/game/infinite-tic-tac-toe.test.mjs
python -m unittest -v
npm run test:game
npm run test:browser
```

The browser fixture serves `/games/infinite-tic-tac-toe` at `http://127.0.0.1:5081`. It uses synthetic form data and must never be deployed. Browser viewport/touch emulation is not physical-device evidence. Independent release review and physical-device checks remain required.
