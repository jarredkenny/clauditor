import React from "react";
import { Box, Text } from "ink";

interface HeaderProps {
  processCount: number;
  totalCpu: number;
  totalMem: number;
}

export function Header({ processCount, totalCpu, totalMem }: HeaderProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
    >
      <Box justifyContent="space-between">
        <Text bold color="cyan">
          {" "}
          CLAUDITOR{" "}
        </Text>
        <Text dimColor>Claude Process Monitor</Text>
      </Box>
      <Box gap={2}>
        <Text>
          <Text dimColor>Processes: </Text>
          <Text color={processCount > 0 ? "green" : "yellow"}>
            {processCount}
          </Text>
        </Text>
        <Text>
          <Text dimColor>Total CPU: </Text>
          <Text color={totalCpu > 80 ? "red" : totalCpu > 50 ? "yellow" : "green"}>
            {totalCpu.toFixed(1)}%
          </Text>
        </Text>
        <Text>
          <Text dimColor>Total Mem: </Text>
          <Text color={totalMem > 80 ? "red" : totalMem > 50 ? "yellow" : "green"}>
            {totalMem.toFixed(1)}%
          </Text>
        </Text>
      </Box>
    </Box>
  );
}
