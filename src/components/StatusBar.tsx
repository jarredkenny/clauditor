import React from "react";
import { Box, Text } from "ink";

import type { SortMode } from "../App.js";

const SORT_LABELS: Record<SortMode, string> = {
  project: "Project",
  cpu: "CPU",
  mem: "Memory",
  pid: "PID",
};

interface StatusBarProps {
  message?: string;
  isError?: boolean;
  sortMode: SortMode;
}

export function StatusBar({ message, isError, sortMode }: StatusBarProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      marginTop={1}
    >
      <Box gap={1} flexWrap="wrap">
        <Text>
          <Text color="cyan" bold>j/k</Text>
          <Text dimColor> Nav</Text>
        </Text>
        <Text dimColor>|</Text>
        <Text>
          <Text color="cyan" bold>g/G</Text>
          <Text dimColor> Top/Bottom</Text>
        </Text>
        <Text dimColor>|</Text>
        <Text>
          <Text color="red" bold>K</Text>
          <Text dimColor> Kill</Text>
        </Text>
        <Text dimColor>|</Text>
        <Text>
          <Text color="yellow" bold>p</Text>
          <Text dimColor> Pause</Text>
        </Text>
        <Text dimColor>|</Text>
        <Text>
          <Text color="green" bold>r</Text>
          <Text dimColor> Resume</Text>
        </Text>
        <Text dimColor>|</Text>
        <Text>
          <Text color="blue" bold>s</Text>
          <Text dimColor> Sort: {SORT_LABELS[sortMode]}</Text>
        </Text>
        <Text dimColor>|</Text>
        <Text>
          <Text color="magenta" bold>R</Text>
          <Text dimColor> Refresh</Text>
        </Text>
        <Text dimColor>|</Text>
        <Text>
          <Text color="gray" bold>q</Text>
          <Text dimColor> Quit</Text>
        </Text>
      </Box>
      {message && (
        <Box marginTop={0}>
          <Text color={isError ? "red" : "green"}>{message}</Text>
        </Box>
      )}
    </Box>
  );
}
