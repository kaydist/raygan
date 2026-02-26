import type {
  AgentTask,
  TaskStatus,
  TaskListState,
  MessageSegment,
} from "../types";

interface ParseResult {
  segments: MessageSegment[];
  taskState: TaskListState | null;
}

function extractFilesFromBlock(block: string): Array<{ filename: string; language: string }> {
  const files: Array<{ filename: string; language: string }> = [];
  const codeBlockRegex = /```(\w+)?(?:\s+filename="([^"]+)")?\n[\s\S]*?```/g;

  let match;
  while ((match = codeBlockRegex.exec(block)) !== null) {
    const language = match[1] || "text";
    const filename = match[2];
    if (filename) {
      files.push({ filename, language });
    }
  }

  return files;
}

export function parseMessageSegments(content: string): ParseResult {
  const tasksHeaderMatch = content.match(/^## Tasks\s*$/m);

  if (!tasksHeaderMatch || tasksHeaderMatch.index === undefined) {
    return { segments: [], taskState: null };
  }

  const approachText = content.slice(0, tasksHeaderMatch.index).trim();
  const afterTasksHeader = content.slice(tasksHeaderMatch.index + tasksHeaderMatch[0].length);

  const uncheckedRegex = /^- \[ \] (.+)$/gm;
  const taskNames: string[] = [];
  let uncheckedMatch;
  while ((uncheckedMatch = uncheckedRegex.exec(afterTasksHeader)) !== null) {
    const name = uncheckedMatch[1]!.trim();
    if (!taskNames.includes(name)) {
      taskNames.push(name);
    }
  }

  if (taskNames.length === 0) {
    return { segments: [], taskState: null };
  }

  const checkedRegex = /^- \[x\] (.+)$/gm;
  const completedNames = new Set<string>();
  let checkedMatch;
  while ((checkedMatch = checkedRegex.exec(content)) !== null) {
    completedNames.add(checkedMatch[1]!.trim());
  }

  const headingRegex = /^### (.+)$/gm;
  const startedNames = new Set<string>();
  let headingMatch;
  while ((headingMatch = headingRegex.exec(content)) !== null) {
    const headingName = headingMatch[1]!.trim();
    if (taskNames.includes(headingName)) {
      startedNames.add(headingName);
    }
  }

  const taskSectionRegex = /^### (.+)$/gm;
  const taskSections: Array<{ name: string; startIndex: number }> = [];
  let sectionMatch;
  while ((sectionMatch = taskSectionRegex.exec(content)) !== null) {
    const sectionName = sectionMatch[1]!.trim();
    if (taskNames.includes(sectionName)) {
      taskSections.push({ name: sectionName, startIndex: sectionMatch.index + sectionMatch[0].length });
    }
  }

  const taskFilesMap = new Map<string, Array<{ filename: string; language: string }>>();
  for (let i = 0; i < taskSections.length; i++) {
    const section = taskSections[i]!;
    const nextSection = taskSections[i + 1];
    const sectionEnd = nextSection
      ? content.lastIndexOf(`### ${nextSection.name}`, nextSection.startIndex)
      : content.length;

    const sectionContent = content.slice(section.startIndex, sectionEnd);
    const files = extractFilesFromBlock(sectionContent);
    if (files.length > 0) {
      taskFilesMap.set(section.name, files);
    }
  }

  const tasks: AgentTask[] = taskNames.map((name, index) => {
    let status: TaskStatus = "pending";
    if (completedNames.has(name)) {
      status = "completed";
    } else if (startedNames.has(name)) {
      status = "in_progress";
    }

    return {
      id: `task-${index}`,
      name,
      status,
      files: taskFilesMap.get(name) ?? [],
    };
  });

  const taskState: TaskListState = {
    tasks,
    completedCount: tasks.filter(t => t.status === "completed").length,
    totalCount: tasks.length,
  };

  const segments: MessageSegment[] = [];

  if (approachText) {
    segments.push({ type: "text", content: approachText });
  }

  segments.push({ type: "task_list", tasks });

  return { segments, taskState };
}
