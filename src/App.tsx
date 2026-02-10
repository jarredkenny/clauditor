import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { Header } from "./components/Header.js";
import { ProcessList } from "./components/ProcessList.js";
import { StatusBar } from "./components/StatusBar.js";
import { ConfirmModal } from "./components/ConfirmModal.js";
import {
  getClaudeProcesses,
  killProcess,
  pauseProcess,
  resumeProcess,
  extractProjectName,
  type ClaudeProcess,
} from "./utils/process.js";

type ModalState = {
  show: boolean;
  action: "kill" | "pause" | "resume";
  process: ClaudeProcess | null;
};

export function App() {
  const { exit } = useApp();
  const [processes, setProcesses] = useState<ClaudeProcess[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [modal, setModal] = useState<ModalState>({
    show: false,
    action: "kill",
    process: null,
  });

  // Calculate totals (using aggregated metrics that include children)
  const totalCpu = processes.reduce((sum, p) => sum + p.totalCpu, 0);
  const totalMem = processes.reduce((sum, p) => sum + p.totalMem, 0);

  // Fetch processes
  const refreshProcesses = useCallback(async () => {
    try {
      const procs = await getClaudeProcesses();
      setProcesses((prev) => {
        // Adjust selection if needed
        setSelectedIndex((idx) => {
          if (idx >= procs.length && procs.length > 0) {
            return procs.length - 1;
          }
          return idx;
        });
        return procs;
      });
    } catch (error) {
      showMessage("Failed to fetch processes", true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and auto-refresh
  useEffect(() => {
    refreshProcesses();
    const interval = setInterval(refreshProcesses, 2000);
    return () => clearInterval(interval);
  }, [refreshProcesses]);

  // Show temporary message
  const showMessage = (text: string, isError: boolean = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 3000);
  };

  // Get currently selected process
  const selectedProcess = processes[selectedIndex] || null;

  // Handle modal confirm
  const handleModalConfirm = async () => {
    if (!modal.process) return;

    const { action, process } = modal;
    const projectName = extractProjectName(process);

    setModal({ show: false, action: "kill", process: null });

    try {
      let success = false;
      switch (action) {
        case "kill":
          success = await killProcess(process.pid);
          if (success) {
            showMessage(`Killed ${projectName} (PID ${process.pid})`);
          } else {
            showMessage(`Failed to kill ${projectName}`, true);
          }
          break;
        case "pause":
          success = await pauseProcess(process.pid);
          if (success) {
            showMessage(`Paused ${projectName} (PID ${process.pid})`);
          } else {
            showMessage(`Failed to pause ${projectName}`, true);
          }
          break;
        case "resume":
          success = await resumeProcess(process.pid);
          if (success) {
            showMessage(`Resumed ${projectName} (PID ${process.pid})`);
          } else {
            showMessage(`Failed to resume ${projectName}`, true);
          }
          break;
      }

      // Refresh after action
      await refreshProcesses();
    } catch (error) {
      showMessage(`Action failed: ${error}`, true);
    }
  };

  // Handle modal cancel
  const handleModalCancel = () => {
    setModal({ show: false, action: "kill", process: null });
  };

  // Keyboard input (only when modal is not shown)
  useInput(
    (input, key) => {
      if (modal.show) return;

      // Navigation
      if (input === "j" || key.downArrow) {
        setSelectedIndex((prev) => Math.min(prev + 1, processes.length - 1));
      } else if (input === "k" || key.upArrow) {
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
      // Page navigation
      else if (input === "g") {
        setSelectedIndex(0);
      } else if (input === "G") {
        setSelectedIndex(Math.max(0, processes.length - 1));
      }
      // Kill (capital K)
      else if (input === "K") {
        if (selectedProcess) {
          setModal({ show: true, action: "kill", process: selectedProcess });
        }
      }
      // Pause
      else if (input === "p") {
        if (selectedProcess && selectedProcess.state === "running") {
          setModal({ show: true, action: "pause", process: selectedProcess });
        } else if (selectedProcess?.state === "paused") {
          showMessage("Process is already paused. Use 'r' to resume.", true);
        }
      }
      // Resume
      else if (input === "r") {
        if (selectedProcess && selectedProcess.state === "paused") {
          setModal({ show: true, action: "resume", process: selectedProcess });
        } else if (selectedProcess?.state === "running") {
          showMessage("Process is already running.", true);
        }
      }
      // Refresh (capital R)
      else if (input === "R") {
        setLoading(true);
        refreshProcesses().then(() => showMessage("Refreshed"));
      }
      // Quit
      else if (input === "q" || (key.ctrl && input === "c")) {
        exit();
      }
    },
    { isActive: !modal.show }
  );

  if (loading && processes.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header processCount={0} totalCpu={0} totalMem={0} />
        <Box justifyContent="center" paddingY={2}>
          <Text color="cyan">Loading processes...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Header
        processCount={processes.length}
        totalCpu={totalCpu}
        totalMem={totalMem}
      />

      {modal.show && modal.process ? (
        <ConfirmModal
          action={modal.action}
          pid={modal.process.pid}
          projectName={extractProjectName(modal.process)}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      ) : (
        <ProcessList processes={processes} selectedIndex={selectedIndex} />
      )}

      <StatusBar message={message?.text} isError={message?.isError} />
    </Box>
  );
}
