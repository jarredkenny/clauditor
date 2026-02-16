import React from "react";
import { Box, Text } from "ink";
import type { ClaudeProcess } from "../utils/process.js";
import { extractProjectName, shortenPath } from "../utils/process.js";
import type { SortMode } from "../App.js";

interface ProcessListProps {
  processes: ClaudeProcess[];
  selectedIndex: number;
  sortMode: SortMode;
}

function getStateIndicator(state: "running" | "paused"): React.ReactNode {
  if (state === "paused") {
    return <Text color="yellow">||</Text>;
  }
  return <Text color="green"></Text>;
}

function getSelectionIndicator(isSelected: boolean): React.ReactNode {
  return <Text color="cyan">{isSelected ? "" : " "}</Text>;
}

function getCpuColor(cpu: number): string {
  if (cpu > 80) return "red";
  if (cpu > 50) return "yellow";
  if (cpu > 20) return "cyan";
  return "green";
}

function getMemColor(mem: number): string {
  if (mem > 50) return "red";
  if (mem > 25) return "yellow";
  return "green";
}

function formatCpu(cpu: number): string {
  return cpu.toFixed(1).padStart(5) + "%";
}

function formatMem(mem: number): string {
  return mem.toFixed(1).padStart(5) + "%";
}

export function ProcessList({ processes, selectedIndex, sortMode }: ProcessListProps) {
  if (processes.length === 0) {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        paddingY={2}
      >
        <Text dimColor>No Claude processes running</Text>
        <Text dimColor>Start a Claude session to see it here</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginY={1}>
      {/* Header Row */}
      <Box paddingX={1} marginBottom={0}>
        <Box width={2}>
          <Text dimColor> </Text>
        </Box>
        <Box width={3}>
          <Text dimColor>ST</Text>
        </Box>
        <Box width={8}>
          <Text dimColor={sortMode !== "pid"} color={sortMode === "pid" ? "cyan" : undefined}>PID{sortMode === "pid" ? " ▼" : ""}</Text>
        </Box>
        <Box width={8}>
          <Text dimColor={sortMode !== "cpu"} color={sortMode === "cpu" ? "cyan" : undefined}>CPU{sortMode === "cpu" ? " ▼" : ""}</Text>
        </Box>
        <Box width={8}>
          <Text dimColor={sortMode !== "mem"} color={sortMode === "mem" ? "cyan" : undefined}>MEM{sortMode === "mem" ? " ▼" : ""}</Text>
        </Box>
        <Box width={8}>
          <Text dimColor>CHILD</Text>
        </Box>
        <Box width={20}>
          <Text dimColor={sortMode !== "project"} color={sortMode === "project" ? "cyan" : undefined}>PROJECT{sortMode === "project" ? " ▼" : ""}</Text>
        </Box>
        <Box flexGrow={1}>
          <Text dimColor>WORKING DIR</Text>
        </Box>
      </Box>

      {/* Separator */}
      <Box paddingX={1}>
        <Text dimColor>{"─".repeat(80)}</Text>
      </Box>

      {/* Process Rows */}
      {processes.map((proc, index) => {
        const isSelected = index === selectedIndex;
        const isPaused = proc.state === "paused";
        const projectName = extractProjectName(proc);
        const workDir = shortenPath(proc.workingDir, 35);

        return (
          <Box
            key={proc.pid}
            paddingX={1}
            backgroundColor={isSelected ? "blue" : undefined}
          >
            <Box width={2}>{getSelectionIndicator(isSelected)}</Box>
            <Box width={3}>{getStateIndicator(proc.state)}</Box>
            <Box width={8}>
              <Text
                color={isSelected ? "white" : undefined}
                bold={isSelected}
                dimColor={isPaused && !isSelected}
              >
                {proc.pid}
              </Text>
            </Box>
            <Box width={8}>
              <Text
                color={isPaused ? "gray" : getCpuColor(proc.totalCpu)}
                bold={!isPaused && proc.totalCpu > 50}
                dimColor={isPaused && !isSelected}
              >
                {formatCpu(proc.totalCpu)}
              </Text>
            </Box>
            <Box width={8}>
              <Text
                color={isPaused ? "gray" : getMemColor(proc.totalMem)}
                bold={!isPaused && proc.totalMem > 25}
                dimColor={isPaused && !isSelected}
              >
                {formatMem(proc.totalMem)}
              </Text>
            </Box>
            <Box width={8}>
              <Text dimColor={proc.children.length === 0 || isPaused}>
                {proc.children.length > 0 ? proc.children.length : "-"}
              </Text>
            </Box>
            <Box width={20}>
              <Text
                color={isSelected ? "white" : isPaused ? "gray" : "cyan"}
                bold={isSelected}
                wrap="truncate"
                dimColor={isPaused && !isSelected}
              >
                {projectName.slice(0, 18)}
              </Text>
            </Box>
            <Box flexGrow={1}>
              <Text dimColor={!isSelected || isPaused} wrap="truncate">
                {workDir}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
