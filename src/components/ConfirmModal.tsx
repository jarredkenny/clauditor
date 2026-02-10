import React from "react";
import { Box, Text, useInput } from "ink";

type ModalAction = "kill" | "pause" | "resume";

interface ConfirmModalProps {
  action: ModalAction;
  pid: number;
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const actionConfig = {
  kill: {
    color: "red" as const,
    title: "KILL PROCESS",
    description: "This will terminate the process and all child processes.",
    warning: "This action cannot be undone!",
  },
  pause: {
    color: "yellow" as const,
    title: "PAUSE PROCESS",
    description: "This will suspend the process and all child processes.",
    warning: "Use 'r' to resume later.",
  },
  resume: {
    color: "green" as const,
    title: "RESUME PROCESS",
    description: "This will continue the paused process and all children.",
    warning: "",
  },
};

export function ConfirmModal({
  action,
  pid,
  projectName,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const config = actionConfig[action];

  useInput((input, key) => {
    if (input.toLowerCase() === "y" || key.return) {
      onConfirm();
    } else if (input.toLowerCase() === "n" || key.escape) {
      onCancel();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={config.color}
      paddingX={2}
      paddingY={1}
      marginY={1}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={config.color}>
          {config.title}
        </Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <Text>
          <Text dimColor>Target: </Text>
          <Text bold>{projectName}</Text>
          <Text dimColor> (PID: {pid})</Text>
        </Text>

        <Text dimColor>{config.description}</Text>

        {config.warning && (
          <Text color={config.color} bold>
            {config.warning}
          </Text>
        )}
      </Box>

      <Box marginTop={1} justifyContent="center" gap={2}>
        <Text>
          <Text color="green" bold>
            [Y]es
          </Text>
          <Text dimColor> / </Text>
          <Text color="red" bold>
            [N]o
          </Text>
        </Text>
      </Box>
    </Box>
  );
}
