"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { Terminal as XTerm } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import type { WebContainerProcess } from "@webcontainer/api";

import { cn } from "@/lib/utils";
import { useWebContainer } from "../hooks/use-web-container";

interface TerminalProps {
  className?: string;
  onReady?: () => void;
}

export function Terminal({ className, onReady }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const shellProcessRef = useRef<WebContainerProcess | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { state, boot, spawn, mountFiles } = useWebContainer();

  const initTerminal = useCallback(async () => {
    if (!containerRef.current || terminalRef.current) return;

    const [
      { Terminal: XTerminal },
      { FitAddon: Fit },
      { WebLinksAddon: WebLinks },
    ] = await Promise.all([
      import("@xterm/xterm"),
      import("@xterm/addon-fit"),
      import("@xterm/addon-web-links"),
    ]);

    const terminal = new XTerminal({
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
        cursorAccent: "#1e1e1e",
        selectionBackground: "#264f78",
        selectionForeground: "#ffffff",
        black: "#000000",
        red: "#cd3131",
        green: "#0dbc79",
        yellow: "#e5e510",
        blue: "#2472c8",
        magenta: "#bc3fbc",
        cyan: "#11a8cd",
        white: "#e5e5e5",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#ffffff",
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Monaco, 'Courier New', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 10000,
      tabStopWidth: 4,
      allowProposedApi: true,
    });

    const fitAddon = new Fit();
    const webLinksAddon = new WebLinks();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.writeln("\x1b[1;36m╔═══════════════════════════════════════════════════════════╗\x1b[0m");
    terminal.writeln("\x1b[1;36m║\x1b[0m  \x1b[1;33mStaq Terminal\x1b[0m - WebContainer-powered development        \x1b[1;36m║\x1b[0m");
    terminal.writeln("\x1b[1;36m╚═══════════════════════════════════════════════════════════╝\x1b[0m");
    terminal.writeln("");
    terminal.writeln("\x1b[90mBooting WebContainer...\x1b[0m");

    setIsReady(true);
    onReady?.();
  }, [onReady]);

  const startShell = useCallback(async () => {
    if (!terminalRef.current) return;

    const terminal = terminalRef.current;

    try {
      await boot();

      terminal.writeln("\x1b[32m✓ WebContainer ready\x1b[0m");
      terminal.writeln("\x1b[90mMounting project files...\x1b[0m");

      await mountFiles();

      terminal.writeln("\x1b[32m✓ Files mounted\x1b[0m");
      terminal.writeln("");
      terminal.writeln("\x1b[90mStarting shell... (type 'help' for commands)\x1b[0m");
      terminal.writeln("");

      const shellProcess = await spawn("jsh");
      if (!shellProcess) {
        terminal.writeln("\x1b[31m✗ Failed to start shell\x1b[0m");
        return;
      }

      shellProcessRef.current = shellProcess;

      shellProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal.write(data);
          },
        })
      );

      const input = shellProcess.input.getWriter();
      terminal.onData((data) => {
        input.write(data);
      });

      terminal.writeln("\x1b[32m✓ Shell ready\x1b[0m");
      terminal.writeln("");
    } catch (err) {
      terminal.writeln(`\x1b[31m✗ Error: ${err instanceof Error ? err.message : "Unknown error"}\x1b[0m`);
    }
  }, [boot, spawn, mountFiles]);

  useEffect(() => {
    initTerminal();
  }, [initTerminal]);

  useEffect(() => {
    if (isReady && state.status === "idle") {
      startShell();
    }
  }, [isReady, state.status, startShell]);

  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener("resize", handleResize);
    const resizeObserver = new ResizeObserver(handleResize);

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (shellProcessRef.current) {
        shellProcessRef.current.kill();
      }
      if (terminalRef.current) {
        terminalRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className={cn("h-full w-full bg-[#1e1e1e]", className)}>
      <div
        ref={containerRef}
        className="h-full w-full p-2"
        style={{ minHeight: "200px" }}
      />
      <style jsx global>{`
        @import "@xterm/xterm/css/xterm.css";
      `}</style>
    </div>
  );
}
