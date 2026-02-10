import { $ } from "bun";

/**
 * Get the current working directory of a process on macOS
 */
async function getProcessCwd(pid: number): Promise<string> {
  try {
    // Use lsof to get the current working directory
    const result = await $`lsof -a -p ${pid} -d cwd -Fn 2>/dev/null`.text();
    const lines = result.trim().split("\n");
    for (const line of lines) {
      if (line.startsWith("n")) {
        return line.slice(1); // Remove the 'n' prefix
      }
    }
  } catch {
    // lsof may not have permission or process may have exited
  }
  return "";
}

export interface ClaudeProcess {
  pid: number;
  ppid: number;
  cpu: number;
  mem: number;
  totalCpu: number; // Including children
  totalMem: number; // Including children
  command: string;
  args: string;
  state: "running" | "paused";
  workingDir: string;
  startTime: string;
  children: number[];
}

export interface ProcessTree {
  [pid: number]: number[]; // parent -> children
}

/**
 * Get all Claude-related processes with their metrics
 */
export async function getClaudeProcesses(): Promise<ClaudeProcess[]> {
  try {
    // Get all processes with detailed info
    // Using ps with specific format for reliable parsing
    const result =
      await $`ps -eo pid,ppid,pcpu,pmem,state,lstart,command`.text();

    const lines = result.trim().split("\n").slice(1); // Skip header
    const processes: ClaudeProcess[] = [];

    for (const line of lines) {
      // Filter for Claude CLI processes (not shell spawns or desktop app)
      if (!isClaudeCliProcess(line)) continue;

      const parsed = parseProcessLine(line);
      if (parsed) {
        processes.push(parsed);
      }
    }

    // Get child processes and working directories for each Claude process
    const processTree = await buildProcessTree();
    const allProcessMetrics = await getAllProcessMetrics();

    // Fetch working directories and aggregate child metrics in parallel
    await Promise.all(
      processes.map(async (proc) => {
        proc.children = getAllDescendants(proc.pid, processTree);
        if (!proc.workingDir) {
          proc.workingDir = await getProcessCwd(proc.pid);
        }

        // Aggregate CPU/MEM from children
        let childCpu = 0;
        let childMem = 0;
        for (const childPid of proc.children) {
          const childMetrics = allProcessMetrics.get(childPid);
          if (childMetrics) {
            childCpu += childMetrics.cpu;
            childMem += childMetrics.mem;
          }
        }
        proc.totalCpu = proc.cpu + childCpu;
        proc.totalMem = proc.mem + childMem;
      })
    );

    // Sort by total CPU usage descending
    return processes.sort((a, b) => b.totalCpu - a.totalCpu);
  } catch (error) {
    // No Claude processes found
    return [];
  }
}

/**
 * Check if a process line represents a Claude CLI session
 */
function isClaudeCliProcess(line: string): boolean {
  // Must contain "claude" in the command
  if (!line.includes("claude")) return false;

  // Exclude shell snapshot processes (these are child shells spawned by Claude)
  if (line.includes(".claude/shell-snapshots")) return false;

  // Exclude Claude desktop app components
  if (line.includes("Claude.app")) return false;

  // Exclude this monitoring process
  if (line.includes("clauditor") || line.includes("claude-monitor")) return false;

  // Must be an actual claude CLI invocation
  // Matches patterns like: "claude ", "/claude ", "claude --"
  const claudeCliPattern = /(^|\s|\/)(claude)(\s|$|--)/;
  return claudeCliPattern.test(line);
}

function parseProcessLine(line: string): ClaudeProcess | null {
  // ps output format: PID PPID %CPU %MEM STATE LSTART(5 fields) COMMAND
  // Example: 12345 12344 5.0 1.2 S Mon Jan 1 12:00:00 2024 /path/to/node ...
  const parts = line.trim().split(/\s+/);
  if (parts.length < 11) return null;

  const pidStr = parts[0];
  const ppidStr = parts[1];
  const cpuStr = parts[2];
  const memStr = parts[3];
  const stateChar = parts[4];

  if (!pidStr || !ppidStr || !cpuStr || !memStr || !stateChar) return null;

  const pid = parseInt(pidStr, 10);
  const ppid = parseInt(ppidStr, 10);
  const cpu = parseFloat(cpuStr);
  const mem = parseFloat(memStr);

  if (isNaN(pid) || isNaN(ppid) || isNaN(cpu) || isNaN(mem)) return null;

  // lstart has 5 fields: Day Month Date Time Year
  const startTime = parts.slice(5, 10).join(" ");

  // Rest is the command
  const fullCommand = parts.slice(10).join(" ");

  // Extract command name and args
  const commandParts = fullCommand.split(" ");
  const firstPart = commandParts[0] ?? "";
  const command = firstPart.split("/").pop() ?? firstPart;
  const args = commandParts.slice(1).join(" ");

  // Determine state: T = stopped (paused), S/R = running/sleeping
  const state: "running" | "paused" = stateChar === "T" ? "paused" : "running";

  // Extract working directory from args if present
  let workingDir = "";
  const cwdMatch = args.match(/--cwd[= ]([^\s]+)/);
  if (cwdMatch?.[1]) {
    workingDir = cwdMatch[1];
  }

  return {
    pid,
    ppid,
    cpu,
    mem,
    totalCpu: cpu, // Will be updated with children
    totalMem: mem, // Will be updated with children
    command,
    args,
    state,
    workingDir,
    startTime,
    children: [],
  };
}

/**
 * Get CPU and memory metrics for all processes
 */
async function getAllProcessMetrics(): Promise<Map<number, { cpu: number; mem: number }>> {
  const metrics = new Map<number, { cpu: number; mem: number }>();

  try {
    const result = await $`ps -eo pid,pcpu,pmem`.text();
    const lines = result.trim().split("\n").slice(1); // Skip header

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pidStr = parts[0];
      const cpuStr = parts[1];
      const memStr = parts[2];

      if (!pidStr || !cpuStr || !memStr) continue;

      const pid = parseInt(pidStr, 10);
      const cpu = parseFloat(cpuStr);
      const mem = parseFloat(memStr);

      if (!isNaN(pid) && !isNaN(cpu) && !isNaN(mem)) {
        metrics.set(pid, { cpu, mem });
      }
    }
  } catch {
    // Ignore errors
  }

  return metrics;
}

async function buildProcessTree(): Promise<ProcessTree> {
  try {
    const result = await $`ps -eo pid,ppid`.text();
    const lines = result.trim().split("\n").slice(1); // Skip header
    const tree: ProcessTree = {};

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pidStr = parts[0];
      const ppidStr = parts[1];

      if (!pidStr || !ppidStr) continue;

      const pid = parseInt(pidStr, 10);
      const ppid = parseInt(ppidStr, 10);

      if (!isNaN(pid) && !isNaN(ppid)) {
        if (!tree[ppid]) tree[ppid] = [];
        tree[ppid]!.push(pid);
      }
    }

    return tree;
  } catch {
    return {};
  }
}

function getAllDescendants(pid: number, tree: ProcessTree): number[] {
  const descendants: number[] = [];
  const children = tree[pid] || [];

  for (const child of children) {
    descendants.push(child);
    descendants.push(...getAllDescendants(child, tree));
  }

  return descendants;
}

/**
 * Kill a process and all its children
 */
export async function killProcess(pid: number): Promise<boolean> {
  try {
    // Get all descendants first
    const tree = await buildProcessTree();
    const descendants = getAllDescendants(pid, tree);

    // Kill children first (in reverse order - deepest first)
    for (const childPid of descendants.reverse()) {
      try {
        await $`kill -9 ${childPid}`.quiet();
      } catch {
        // Child may have already exited
      }
    }

    // Kill the main process
    await $`kill -9 ${pid}`.quiet();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Pause a process and all its children using SIGSTOP
 */
export async function pauseProcess(pid: number): Promise<boolean> {
  try {
    const tree = await buildProcessTree();
    const descendants = getAllDescendants(pid, tree);

    // Pause children first
    for (const childPid of descendants) {
      try {
        await $`kill -STOP ${childPid}`.quiet();
      } catch {
        // Child may have already exited
      }
    }

    // Pause the main process
    await $`kill -STOP ${pid}`.quiet();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Resume a paused process and all its children using SIGCONT
 */
export async function resumeProcess(pid: number): Promise<boolean> {
  try {
    const tree = await buildProcessTree();
    const descendants = getAllDescendants(pid, tree);

    // Resume the main process first
    await $`kill -CONT ${pid}`.quiet();

    // Resume children
    for (const childPid of descendants) {
      try {
        await $`kill -CONT ${childPid}`.quiet();
      } catch {
        // Child may have already exited
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get aggregated system metrics
 */
export async function getSystemMetrics(): Promise<{
  totalCpu: number;
  totalMem: number;
  processCount: number;
}> {
  const processes = await getClaudeProcesses();
  return {
    totalCpu: processes.reduce((sum, p) => sum + p.cpu, 0),
    totalMem: processes.reduce((sum, p) => sum + p.mem, 0),
    processCount: processes.length,
  };
}

/**
 * Format bytes to human readable
 */
export function formatMemory(percent: number, totalMemGB: number = 16): string {
  const usedGB = (percent / 100) * totalMemGB;
  if (usedGB < 1) {
    return `${(usedGB * 1024).toFixed(0)}MB`;
  }
  return `${usedGB.toFixed(1)}GB`;
}

/**
 * Get a shortened version of the working directory
 */
export function shortenPath(path: string, maxLen: number = 30): string {
  if (!path) return "-";
  if (path.length <= maxLen) return path;

  const parts = path.split("/");
  if (parts.length <= 2) return path;

  // Try to show last 2 parts
  const shortened = ".../" + parts.slice(-2).join("/");
  if (shortened.length <= maxLen) return shortened;

  const lastPart = parts[parts.length - 1] ?? "";
  return ".../" + lastPart.slice(0, maxLen - 4);
}

/**
 * Extract project name from command args or path
 */
export function extractProjectName(proc: ClaudeProcess): string {
  // If we have a working directory, use its last component
  if (proc.workingDir) {
    const parts = proc.workingDir.split("/").filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1] ?? proc.workingDir;
    }
  }

  // Try to find project path from args
  const args = proc.args;

  // Look for common patterns in claude-code args
  const patterns = [
    /--cwd[= ]([^\s]+)/,
    /--project[= ]([^\s]+)/,
    /"([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = args.match(pattern);
    if (match) {
      const path = match[1];
      if (path) {
        const parts = path.split("/");
        return parts[parts.length - 1] || path;
      }
    }
  }

  // Check for --resume flag
  if (args.includes("--resume")) {
    return "resumed session";
  }

  // Truncate long args for display
  if (args.length > 20) {
    return args.slice(0, 20) + "...";
  }

  return args || proc.command;
}
