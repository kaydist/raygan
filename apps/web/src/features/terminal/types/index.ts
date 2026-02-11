// Terminal feature types (Month 2)
export interface TerminalCommand {
  id: string;
  label: string;
  command: string;
  description?: string;
}

export interface TerminalSession {
  id: string;
  projectId: string;
  isConnected: boolean;
}
