# Clauditor - Claude Process Monitor

A terminal UI (TUI) tool for monitoring and managing Claude Code CLI processes.

## Quick Start

```bash
bun run start
# or
bun run src/index.tsx
```

## Features

- **Process Monitoring**: Lists all running Claude CLI sessions with CPU/memory metrics
- **Process Management**: Kill, pause (SIGSTOP), and resume (SIGCONT) processes
- **Child Process Handling**: Actions propagate to all child processes (test runners, etc.)
- **Real-time Updates**: Auto-refreshes every 2 seconds

## Keyboard Controls

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `K` | Kill selected process (with confirmation) |
| `p` | Pause selected process |
| `r` | Resume paused process |
| `R` | Manual refresh |
| `q` | Quit |

## Architecture

```
src/
├── index.tsx           # Entry point
├── App.tsx             # Main application component
├── components/
│   ├── Header.tsx      # Title bar with aggregate metrics
│   ├── ProcessList.tsx # Process table with selection
│   ├── ConfirmModal.tsx # Action confirmation dialog
│   └── StatusBar.tsx   # Keybindings and status messages
└── utils/
    └── process.ts      # Process discovery and management
```

## Process Detection

Detects Claude CLI processes by:
1. Scanning all processes for "claude" in the command
2. Filtering out shell snapshots and desktop app components
3. Fetching working directories via `lsof`
4. Building child process tree for accurate kill/pause propagation

## Development

Use Bun for all operations:

```bash
bun run dev    # Watch mode
bun run build  # Build for distribution
bun test       # Run tests
```

### Bun APIs Used

- `Bun.$` for shell commands (process listing, signals)
- React + Ink for TUI rendering
