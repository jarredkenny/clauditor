# Clauditor

**A terminal UI for monitoring and managing Claude Code sessions**

[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1?logo=bun)](https://bun.sh)
[![React](https://img.shields.io/badge/UI-React%20%2B%20Ink-61dafb?logo=react)](https://github.com/vadimdemedes/ink)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

<img width="1003" height="661" alt="SCR-20260210-gowd" src="https://github.com/user-attachments/assets/302bc1ef-a1f3-4934-bff2-35ff2dcea377" />

<img width="993" height="639" alt="SCR-20260210-goyg" src="https://github.com/user-attachments/assets/02d965cf-b6f1-400f-9c24-6d80662c87e0" />

---

## Overview

Clauditor is a lightweight TUI (Terminal User Interface) tool for developers running multiple Claude Code CLI sessions. It provides real-time visibility into resource consumption and the ability to pause, resume, or terminate sessions on demand.

When running several Claude instances simultaneously, system resources can become constrained. Clauditor solves this by letting you:

- **See** all active Claude sessions with aggregated CPU and memory metrics
- **Pause** resource-heavy sessions to free up CPU (using SIGSTOP)
- **Resume** paused sessions when ready (using SIGCONT)
- **Kill** sessions that are no longer needed

All actions propagate to child processes, including MCP servers, test runners, type checkers, and any other spawned subprocesses.

---

## Installation

### Prerequisites

- [Bun](https://bun.sh) v1.0 or later
- macOS (Linux support untested)

### Install

```bash
# Clone the repository
git clone https://github.com/jarredkenny/clauditor.git
cd clauditor

# Install dependencies
bun install

# Link globally (optional)
bun link
```

### Run

```bash
# If linked globally
clauditor

# Or run directly
bun run start
```

---

## Usage

### Keyboard Controls

| Key | Action |
|:---:|--------|
| `j` / `↓` | Move selection down |
| `k` / `↑` | Move selection up |
| `g` | Jump to first process |
| `G` | Jump to last process |
| `p` | **Pause** selected process and all children |
| `r` | **Resume** selected process and all children |
| `K` | **Kill** selected process and all children |
| `R` | Force refresh process list |
| `q` | Quit |

### Display Columns

| Column | Description |
|--------|-------------|
| **ST** | State indicator: `▶` running, `‖` paused |
| **PID** | Process ID of the Claude session |
| **CPU** | Aggregated CPU usage (parent + all children) |
| **MEM** | Aggregated memory usage (parent + all children) |
| **CHILD** | Number of child processes |
| **PROJECT** | Project name (derived from working directory) |
| **WORKING DIR** | Current working directory of the session |

### Actions

#### Pause (`p`)

Sends `SIGSTOP` to the Claude process and all its descendants. The process tree is frozen in place—no CPU cycles consumed—but remains in memory for instant resumption. Useful for temporarily freeing resources without losing session state.

#### Resume (`r`)

Sends `SIGCONT` to resume a paused process tree. The session continues exactly where it left off.

#### Kill (`K`)

Terminates the process and all children with `SIGKILL`. A confirmation modal prevents accidental termination.

---

## How It Works

### Process Discovery

Clauditor identifies Claude CLI sessions by:

1. Scanning all system processes for `claude` in the command
2. Filtering out Claude desktop app components and shell snapshots
3. Querying each process's working directory via `lsof`
4. Building a complete process tree to identify all descendants

### Metric Aggregation

CPU and memory metrics are aggregated across the entire process tree:

```
Total CPU = Claude process CPU + Σ(child process CPU)
Total MEM = Claude process MEM + Σ(child process MEM)
```

This gives an accurate picture of total resource consumption, including MCP servers, language servers, test runners, and other spawned processes.

### Signal Propagation

When pausing, resuming, or killing, signals are sent to the entire process tree:

```
Pause:  SIGSTOP → children first, then parent
Resume: SIGCONT → parent first, then children
Kill:   SIGKILL → deepest children first, then parent
```

---

## Architecture

```
src/
├── index.tsx              # Application entry point
├── App.tsx                # Main component, state management, keyboard handling
├── components/
│   ├── Header.tsx         # Title bar with aggregate system metrics
│   ├── ProcessList.tsx    # Scrollable process table with selection
│   ├── ConfirmModal.tsx   # Action confirmation dialog
│   └── StatusBar.tsx      # Keyboard shortcut hints and status messages
└── utils/
    └── process.ts         # Process discovery, tree building, signal handling
```

### Tech Stack

- **Runtime:** [Bun](https://bun.sh) — fast JavaScript runtime with native shell integration
- **UI Framework:** [Ink](https://github.com/vadimdemedes/ink) — React for command-line interfaces
- **Process Management:** Native Unix signals via Bun's `$` shell

---

## Development

```bash
# Run in watch mode
bun run dev

# Type check
bun tsc --noEmit

# Build for distribution
bun run build
```

---

## Troubleshooting

### "No Claude processes running"

Clauditor only detects Claude CLI sessions (`claude` command), not the Claude desktop app. Start a Claude Code session in another terminal to see it appear.

### Pause not working

Ensure you have permission to send signals to the target process. Processes owned by other users or running as root may require elevated privileges.

### High refresh rate causing issues

The process list refreshes every 2 seconds. If this causes performance issues, you can modify the interval in `App.tsx`.

---

## License

MIT License — see [LICENSE](LICENSE) for details.
