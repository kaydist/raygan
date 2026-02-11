  
**FRONTEND ARCHITECTURE**

Technical Specification

*Next.js 15  |  React 19  |  shadcn/ui  |  Atomic Design  |  Turborepo Monorepo*

Prepared by Kayode

February 8, 2026  |  Version 1.2

**Personal Product  |  Pre-Launch Planning**

# **Table of Contents**

1\. Overview and Stack Decision

2\. Monorepo Structure

3\. Atomic Design System (shadcn/ui)

4\. Workspace Layout Architecture

5\. Feature Modules

6\. State Management (Zustand Stores)

7\. Real-Time Layer (Socket.io Client)

8\. Routing and Navigation

9\. API Client Layer

10\. Key Frontend Packages

11\. Environment and Configuration

12\. Performance Strategy

13\. Testing Strategy

14\. Coding Standards and Conventions

# **1\. Overview and Stack Decision**

This document specifies the frontend architecture for the AI-powered mobile app builder platform. The frontend serves two distinct purposes: a marketing and authentication surface (server-rendered for SEO and performance), and a complex workspace application (client-heavy SPA for real-time editing across four synchronized panels).

## **1.1 Stack Summary**

| Technology | Version | Role |
| :---- | :---- | :---- |
| Next.js | 15.x (App Router) | Framework. SSR for marketing pages. App Router for workspace SPA. Middleware for auth token refresh. |
| React | 19.x | UI library. Server Components for initial data loading. Client Components for interactive workspace. |
| TypeScript | 5.7+ | Type safety end-to-end. Strict mode enabled. Shared types with backend via monorepo package. |
| shadcn/ui | Latest | Component library foundation. Radix UI primitives \+ Tailwind. Copy-paste model for full control. |
| Tailwind CSS | 4.x | Utility-first styling. Zero runtime overhead. JIT compilation. Design tokens via CSS variables. |
| Zustand | 5.x | Client state management. AST store, UI store, auth store. Synchronous updates for real-time editing. |
| React Query | 5.x (TanStack) | Server state management. API calls, caching, optimistic updates, background refetching. |
| Monaco Editor | @monaco-editor/react 4.x | Code Editor panel. VS Code engine with TypeScript IntelliSense and syntax highlighting. |
| @dnd-kit | 6.x (core \+ sortable) | Drag-and-drop for Builder Mode canvas and component tree reordering. |
| Sandpack | @codesandbox/sandpack-react 2.x | In-browser React Native Web preview. Hot-reloads on AST changes. |
| Socket.io Client | 4.x | WebSocket client for real-time AST sync, preview updates, and terminal streaming. |
| Turborepo | 2.x | Monorepo build orchestration. Parallel builds. Remote caching. |
| pnpm | 9.x | Package manager. Workspace support. Strict dependency resolution. Faster than npm/yarn. |

## **1.2 Why Next.js over Vite SPA**

* SSR for Marketing: landing page, pricing page, docs, and blog need search engine indexing. Next.js App Router renders these as server components with zero client-side JavaScript.

* Middleware: Next.js Edge Middleware handles auth token refresh on every request before it reaches the page. No flash of unauthenticated state.

* API Routes (lightweight): simple proxy endpoints for Stripe webhooks, OAuth callbacks, and image optimization. Heavy API logic stays in the Express backend.

* Vercel Deployment: zero-config deployment with preview URLs per PR, edge caching, and automatic ISR for marketing content.

* App Router: route groups separate (marketing), (auth), (dashboard), and (workspace) with independent layouts, loading states, and error boundaries.

The workspace itself is a heavily client-side application. Server Components are used only for the initial data fetch (project metadata, user plan, model list). All interactive panels (chat, builder, code editor, preview) are client components with Zustand stores.

# **2\. Monorepo Structure**

The project uses Turborepo with pnpm workspaces. The frontend (Next.js) lives in apps/web. Shared types and validation schemas live in packages/shared. The Express backend lives in services/api. This structure allows the frontend and backend to share TypeScript types, Zod validation schemas, and constants without publishing packages.

## **2.1 Top-Level Layout**

project-root/

  apps/

    web/                          \# Next.js 15 frontend (this document)

  packages/

    shared/                        \# Shared types, Zod schemas, constants

    ui/                            \# Extracted shadcn/ui components (optional)

    eslint-config/                 \# Shared ESLint rules

    tsconfig/                      \# Shared TS configs (base, next, node)

  services/

    api/                           \# Express.js backend (separate spec)

  turbo.json

  pnpm-workspace.yaml

  .github/workflows/ci.yml

## **2.2 Frontend Directory Structure (apps/web)**

apps/web/

  public/                          \# Static assets (favicon, og-image, robots.txt)

  src/

    app/                           \# Next.js App Router

      layout.tsx                   \# Root layout (providers, fonts, metadata)

      (marketing)/                 \# Route group: landing, pricing, docs

        page.tsx                   \# Landing page (SSR)

        pricing/page.tsx           \# Pricing page (SSR)

        docs/\[...slug\]/page.tsx    \# Documentation pages (SSR \+ MDX)

        layout.tsx                 \# Marketing layout (nav \+ footer)

      (auth)/                      \# Route group: authentication

        login/page.tsx

        register/page.tsx

        forgot-password/page.tsx

        callback/page.tsx          \# OAuth callback handler

        layout.tsx                 \# Auth layout (centered card)

      (dashboard)/                 \# Route group: user dashboard

        page.tsx                   \# Project list

        settings/page.tsx          \# Account settings

        billing/page.tsx           \# Billing and plan management

        layout.tsx                 \# Dashboard layout (sidebar \+ content)

      (workspace)/                 \# Route group: main workspace

        \[projectId\]/

          page.tsx                 \# Workspace page (4-panel layout)

          loading.tsx              \# Workspace skeleton loader

          error.tsx                \# Workspace error boundary

          layout.tsx              \# Workspace layout (no nav, full-screen)

    components/                    \# Atomic design structure

      index.ts                    \# Barrel export (re-exports atoms, molecules, organisms, templates)

      atoms/                       \# Smallest UI primitives

        index.ts                  \# Barrel export

      molecules/                   \# Combinations of 2-4 atoms

        index.ts                  \# Barrel export

      organisms/                   \# Complex stateful components

        index.ts                  \# Barrel export

      templates/                   \# Page layout structures

        index.ts                  \# Barrel export

    features/                      \# Feature-based modules

      agent/                       \# Agent Mode (chat interface)

        index.ts                  \# Barrel export

      builder/                     \# Builder Mode (visual editor)

        index.ts                  \# Barrel export

      code-editor/                 \# Code Editor (Monaco)

        index.ts                  \# Barrel export

      preview/                     \# Preview (Sandpack \+ QR)

        index.ts                  \# Barrel export

      terminal/                    \# Terminal (xterm.js, Month 2\)

        index.ts                  \# Barrel export

      project/                     \# Project management, templates

        index.ts                  \# Barrel export

      billing/                     \# Billing UI, plan selector

        index.ts                  \# Barrel export

    stores/                        \# Zustand stores

      index.ts                    \# Barrel export

      ast-store.ts

      ui-store.ts

      auth-store.ts

      project-store.ts

      settings-store.ts           \# Backend-driven settings (plans, keys, flags)

    hooks/                         \# Custom React hooks

      index.ts                    \# Barrel export

    lib/                           \# Shared utilities and services

      index.ts                    \# Barrel export (re-exports all subfolders)

      constants/                  \# All constant definitions

        index.ts                  \# Barrel export

        routes.ts                 \# Route path constants (ROUTES.DASHBOARD, ROUTES.WORKSPACE)

        query-keys.ts            \# React Query key factories

        socket-events.ts         \# Socket.io event name constants

        keyboard-shortcuts.ts    \# Shortcut key definitions

        theme.ts                 \# Design tokens, color palette, spacing scale

        defaults.ts              \# Default/fallback values for settings before backend loads

      api/                        \# API communication layer

        index.ts                  \# Barrel export

        api-client.ts            \# Typed REST API client (fetch wrapper)

        socket-client.ts         \# Socket.io singleton and event emitter

        sse-client.ts            \# Server-Sent Events client for /generate streaming

        interceptors.ts          \# Request/response interceptors (auth header, error transform)

        types.ts                 \# API request/response types

      helpers/                    \# Business logic helpers

        index.ts                  \# Barrel export

        ast-helpers.ts           \# AST tree traversal, node lookup, path resolution

        credit-helpers.ts        \# Credit calculation, plan limit checks

        file-helpers.ts          \# File extension detection, path parsing, size formatting

        project-helpers.ts       \# Project slug generation, template resolution

        validation-helpers.ts    \# Form validation, input sanitization

      formatters/                 \# Data formatting functions

        index.ts                  \# Barrel export

        date-formatter.ts        \# formatDate, formatRelativeTime, formatDuration

        number-formatter.ts      \# formatCredits, formatFileSize, formatCurrency

        code-formatter.ts        \# formatCodeBlock, highlightDiff, truncateCode

        string-formatter.ts      \# capitalize, slugify, truncate, pluralize

      utils/                      \# Low-level utility functions

        index.ts                  \# Barrel export

        logger.ts                \# Structured logging (pino-browser or custom)

        cn.ts                    \# className merger (clsx \+ tailwind-merge)

        debounce.ts              \# Debounce and throttle utilities

        storage.ts               \# localStorage wrapper with JSON parse/stringify and TTL

        clipboard.ts             \# Copy to clipboard utility

        error.ts                 \# Custom error classes (APIError, ASTError, AuthError)

    types/                         \# Frontend-specific types

      index.ts                    \# Barrel export

    styles/                        \# Global styles, Tailwind config

  next.config.ts

  tailwind.config.ts

  tsconfig.json

  components.json                  \# shadcn/ui configuration

# **3\. Atomic Design System (shadcn/ui)**

The component hierarchy follows atomic design principles. All base components are built on shadcn/ui, which provides accessible Radix UI primitives styled with Tailwind CSS. The copy-paste model means every component is fully owned and customizable, unlike dependency-based libraries like MUI or Ant Design.

## **3.1 Component Hierarchy**

| Level | Location | Rules | Examples |
| :---- | :---- | :---- | :---- |
| Atoms | components/atoms/ | Pure presentational. No business logic. No store access. Accept only primitive props. Each atom is a single shadcn/ui component or a thin wrapper. | Button, Input, Badge, Avatar, Tooltip, Label, Switch, Separator, Skeleton, Card, ScrollArea |
| Molecules | components/molecules/ | Combine 2-4 atoms into a reusable unit. May have minimal local state (open/closed, hover, focus). Never access Zustand stores directly. Accept typed props. | SearchBar (Input \+ Button \+ Icon), ModelSelector (Select \+ Badge \+ Tooltip), CreditBadge (Badge \+ text \+ progress), FileTreeItem (Icon \+ Label \+ ContextMenu), PropertyField (Label \+ Input \+ Tooltip \+ validation) |
| Organisms | components/organisms/ | Complex components with business logic. May connect to Zustand stores via hooks. May fetch data via React Query. May use Socket.io events. Compose atoms and molecules. | ChatPanel (MessageList \+ PromptInput \+ ModelSelector \+ CreditBadge), PropertyInspector (PropertyField groups \+ tabs), ComponentTree (recursive FileTreeItem \+ DnD), FileExplorer (tree \+ tabs \+ search), ToolbarPanel (mode switcher \+ actions) |
| Templates | components/templates/ | Layout structures only. Define panel positions, responsive breakpoints, resize handles. Never contain business logic or data fetching. Accept children as slots. | WorkspaceTemplate (4-panel resizable), DashboardTemplate (sidebar \+ main), MarketingTemplate (nav \+ hero \+ footer), AuthTemplate (centered card) |
| Pages | app/(...)/page.tsx | Next.js App Router pages. Compose templates with organisms. Handle route params, server-side data loading via async server components, error boundaries. | Workspace page, Dashboard page, Login page, Landing page |

## **3.2 Atoms (components/atoms/)**

Every atom maps to a single shadcn/ui component installed via the CLI. They are used as-is or with thin wrappers for project-specific defaults.

| Atom | shadcn/ui Base | Customization | Usage |
| :---- | :---- | :---- | :---- |
| Button | button | Added size='icon' variant for toolbar actions. Loading state with spinner. | Actions everywhere: submit prompt, save file, deploy, connect backend |
| Input | input | Extended with error state, helper text, character count. | Search bars, property fields, form inputs |
| Badge | badge | Added plan-specific color variants: free (gray), starter (blue), pro (purple), team (gold). | Plan badges, model capability tags, status indicators |
| Card | card | Default with subtle border and hover shadow for interactive cards. | Project cards on dashboard, template cards, model cards |
| Select | select | No changes. Used as-is. | Model selector, backend provider selector, device frame picker |
| Dialog | dialog | Added responsive: full-screen on mobile, centered on desktop. | Confirmations, project creation, deploy settings |
| Tooltip | tooltip | Default 200ms delay. Consistent positioning. | Toolbar icons, credit info, keyboard shortcuts |
| Tabs | tabs | No changes. Used for mode switching and file tabs. | Builder/Code toggle, settings tabs, property inspector tabs |
| ScrollArea | scroll-area | Custom scrollbar styling matching workspace theme. | Chat history, file explorer, component tree, property panels |
| Skeleton | skeleton | Workspace-specific skeletons matching panel layouts. | Loading states for chat, file tree, preview |
| ContextMenu | context-menu | No changes. | Right-click on files, components, project cards |
| DropdownMenu | dropdown-menu | No changes. | User menu, project actions, file actions |
| Sheet | sheet | Used as mobile sidebar. | Mobile navigation, mobile property panel |
| Separator | separator | No changes. | Visual dividers in panels |
| Switch | switch | No changes. | Toggle settings, feature flags |
| Slider | slider | Extended with numeric input alongside for precise values. | Opacity, border radius, font size in property inspector |

## **3.3 Molecules (components/molecules/)**

| Molecule | Composed Of | Props | Used In |
| :---- | :---- | :---- | :---- |
| SearchBar | Input \+ Button (icon) \+ kbd hint | { value, onChange, onSubmit, placeholder, shortcutKey? } | File explorer, component palette, template gallery, dashboard |
| ModelSelector | Select \+ Badge \+ Tooltip | { models: Model\[\], selectedId, onSelect, disabled? } | Agent Mode chat header, project settings |
| CreditBadge | Badge \+ text \+ ProgressBar (Tailwind) | { remaining: number, total: number, plan: Plan } | Workspace header, billing page |
| FileTreeItem | Icon (lucide) \+ Label \+ Badge \+ ContextMenu | { file: FileEntry, isActive, onSelect, onContextMenu } | File explorer, component tree |
| PropertyField | Label \+ Input/Select/Slider/ColorPicker \+ Tooltip | { label, type, value, onChange, tooltip?, validation? } | Property inspector in Builder Mode |
| MessageBubble | Card \+ Avatar \+ Badge \+ code block | { message: Message, isUser: boolean } | Agent Mode chat panel |
| ColorPicker | Input \+ Popover \+ color swatch grid | { value: string, onChange, presets?: string\[\] } | Property inspector for color properties |
| DeviceFrame | div styled as phone bezel \+ content slot | { device: 'iphone'|'android'|'tablet', children } | Preview panel wrapper |
| EmptyState | Icon \+ text \+ Button (CTA) | { icon, title, description, action?, onAction? } | Empty project list, no search results, no conversations |
| CommandButton | Button \+ kbd shortcut \+ Tooltip | { label, shortcut, onClick, icon? } | Terminal pre-populated commands, toolbar actions |

## **3.4 Organisms (components/organisms/)**

| Organism | Description | Store Access | Socket Events |
| :---- | :---- | :---- | :---- |
| ChatPanel | Full Agent Mode interface. Message list with streaming, prompt input with model selector, credit display, conversation history loading. | ast-store (reads AST for context), auth-store (credits, plan), project-store (active project) | generate:stream, generate:complete, generate:error |
| PropertyInspector | Builder Mode property editing panel. Shows selected component props organized by category (Layout, Spacing, Typography, Colors, Effects). Tabs for Style, Props, and Events. | ast-store (selected node, update node), ui-store (selected component ID) | None (writes to AST store, which syncs via socket) |
| ComponentTree | Hierarchical tree view of the component AST. Supports drag-and-drop reordering via @dnd-kit. Highlights selected component. Expand/collapse nodes. | ast-store (full tree, selected node), ui-store (expanded nodes) | ast:patched (updates tree on remote changes) |
| FileExplorer | Project file tree with folder expand/collapse, file type icons, modified indicators. Right-click context menu for rename, delete, create. | project-store (file tree), ui-store (active file tab) | preview:reload (updates modified indicators) |
| CodeEditorPanel | Monaco Editor wrapper with file tabs, unsaved changes indicator, diff view toggle, minimap. Handles file switching, save on Ctrl+S. | project-store (file contents), ast-store (bidirectional sync on save) | ast:patched (updates code when AST changes from other modes) |
| PreviewPanel | Sandpack iframe in a device frame mockup. QR code for Expo Go. Device selector dropdown. Error overlay for compilation errors. | project-store (source files for Sandpack), ui-store (selected device) | preview:reload, preview:error |
| ComponentPalette | Draggable grid of available components (native and custom). Search/filter. Categories: Layout, Input, Display, Navigation, Native. Drag into Builder canvas. | ast-store (add node on drop) | None |
| TerminalPanel | xterm.js terminal emulator. Pre-populated command buttons (Install Package, Run Build, Check Errors). Streams output from backend container. | project-store (project ID for container routing) | terminal:output, terminal:input |
| ToolbarPanel | Top toolbar with mode switcher (Agent/Builder/Code), undo/redo, deploy button, share, settings. Responsive: icons-only on narrow screens. | ui-store (active mode), ast-store (undo/redo stack) | None |
| OnboardingWizard | First-time user flow. Choose template or describe app. Select backend provider. Walkthrough of workspace panels. | auth-store (onboarding state), project-store (create project) | None |

## **3.5 Templates (components/templates/)**

| Template | Layout | Slots | Responsive Behavior |
| :---- | :---- | :---- | :---- |
| WorkspaceTemplate | 4-panel resizable grid via react-resizable-panels. Left (Agent), Center (Builder/Code), Right (Preview), Bottom (Terminal). | leftPanel, centerPanel, rightPanel, bottomPanel, toolbar | Below 1024px: single panel with tab switcher. Panels stack vertically on tablet. Mobile shows one panel at a time with bottom tab bar. |
| DashboardTemplate | Sidebar (240px fixed) \+ main content area. Sidebar has nav links, plan badge, and user menu. | sidebar, content, header | Below 768px: sidebar becomes a Sheet (slide-out drawer). Header shows hamburger menu. |
| MarketingTemplate | Full-width. Sticky nav bar \+ content \+ footer. Max-width 1280px centered. | nav, content, footer | Responsive nav collapses to mobile hamburger menu below 768px. |
| AuthTemplate | Centered Card (max 420px) on a subtle gradient background. Logo above card. | card content | Card goes full-width on mobile with reduced padding. |

# **4\. Workspace Layout Architecture**

The workspace is the core product surface. It renders inside the WorkspaceTemplate and contains four resizable panels. This section specifies the panel architecture, resize behavior, persistence, and keyboard navigation.

## **4.1 Panel Configuration**

| Panel | Default Width | Min Width | Max Width | Content | Collapsible |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Left (Agent) | 25% | 280px | 40% | ChatPanel organism | Yes (double-click divider or Cmd+1) |
| Center (Builder/Code) | 50% | 400px | 70% | Builder canvas OR CodeEditorPanel (tabbed) | No (always visible) |
| Right (Preview) | 25% | 280px | 40% | PreviewPanel organism | Yes (double-click divider or Cmd+3) |
| Bottom (Terminal) | 0 (collapsed) | 150px | 50% height | TerminalPanel organism | Yes (toggle via Cmd+\`) |

## **4.2 Panel State Persistence**

* Panel sizes and collapsed states are persisted in localStorage (key: workspace-layout-{projectId}).

* When a user returns to a project, the workspace restores to their last layout configuration.

* Default layout presets available: 'Chat Focus' (Agent 40%, Center 60%, Preview hidden), 'Build Focus' (Agent hidden, Center 70%, Preview 30%), 'Code Focus' (Agent hidden, Center 100%, Preview hidden), 'Balanced' (default 25/50/25).

* Layout presets are selectable from the toolbar via a dropdown. Users can also save custom presets.

## **4.3 Keyboard Shortcuts**

| Shortcut | Action | Scope |
| :---- | :---- | :---- |
| Cmd/Ctrl \+ 1 | Toggle Agent panel | Global |
| Cmd/Ctrl \+ 2 | Focus Center panel | Global |
| Cmd/Ctrl \+ 3 | Toggle Preview panel | Global |
| Cmd/Ctrl \+ \` | Toggle Terminal panel | Global |
| Cmd/Ctrl \+ B | Switch to Builder Mode | Center panel |
| Cmd/Ctrl \+ E | Switch to Code Editor | Center panel |
| Cmd/Ctrl \+ S | Save current file | Code Editor |
| Cmd/Ctrl \+ Z | Undo last AST change | Builder/Code Editor |
| Cmd/Ctrl \+ Shift \+ Z | Redo | Builder/Code Editor |
| Cmd/Ctrl \+ K | Open command palette | Global |
| Cmd/Ctrl \+ P | Quick file open | Code Editor |
| Cmd/Ctrl \+ Enter | Submit prompt | Agent chat input |
| Escape | Deselect component / close panel | Builder / any modal |
| Delete / Backspace | Delete selected component | Builder (with confirmation) |
| Cmd/Ctrl \+ D | Duplicate selected component | Builder |

# **5\. Feature Modules**

Each major feature has its own directory under src/features/. Feature modules contain feature-specific components, hooks, utilities, and types. They import from the shared component library (atoms, molecules, organisms) but never import from other feature modules directly. Cross-feature communication happens exclusively through Zustand stores.

## **5.1 Agent Mode (features/agent/)**

features/agent/

  index.ts                    \# Barrel export

  components/

    index.ts                  \# Barrel export

    PromptInput.tsx          \# Text area \+ model selector \+ submit button

    MessageList.tsx          \# Scrollable message history

    StreamingMessage.tsx     \# Renders AI response with streaming text effect

    CodeBlock.tsx            \# Syntax-highlighted code in messages

    ASTOperationPreview.tsx  \# Shows pending AST changes before applying

  hooks/

    index.ts                  \# Barrel export

    useGenerate.ts           \# React Query mutation for POST /generate (SSE)

    useConversation.ts       \# React Query query for conversation history

    useModelList.ts          \# React Query query for available models

  utils/

    index.ts                  \# Barrel export

    sse-parser.ts            \# Parse Server-Sent Events stream

    message-formatter.ts     \# Format code blocks, links, AST references

  types/

    index.ts                  \# Barrel export

    agent.types.ts           \# Message, StreamChunk, GenerateRequest

Key behaviors: prompt submission streams the response via SSE. As text chunks arrive, they render in real-time in the StreamingMessage component. As AST operation events arrive, they are applied to the Zustand AST store immediately, causing Builder and Preview to update in real-time while the AI is still generating. If generation fails, the reserved credit is refunded and an error message is shown.

## **5.2 Builder Mode (features/builder/)**

features/builder/

  index.ts                    \# Barrel export

  components/

    index.ts                  \# Barrel export

    BuilderCanvas.tsx        \# Main visual canvas rendering AST as elements

    SelectionOverlay.tsx     \# Blue border \+ resize handles on selected component

    DragOverlay.tsx          \# Ghost element during drag-and-drop

    PropertyPanel.tsx        \# Right sidebar with property categories

    StyleEditor.tsx          \# CSS property editor (padding, margin, colors, etc.)

    PropsEditor.tsx          \# Component prop editor (text, source, handlers)

    EventsEditor.tsx         \# Event handler editor (onPress, onChange, etc.)

    ComponentTreePanel.tsx   \# Left sidebar tree view (uses ComponentTree organism)

    ComponentPalettePanel.tsx \# Draggable component library grid

  hooks/

    index.ts                  \# Barrel export

    useSelection.ts          \# Selected component ID and focus management

    useDragDrop.ts           \# @dnd-kit integration for canvas and tree

    usePropertyEdit.ts       \# Debounced property updates to AST store

    useCanvasZoom.ts         \# Zoom and pan controls for the canvas

  utils/

    index.ts                  \# Barrel export

    ast-to-elements.ts       \# Convert AST nodes to React elements for canvas

    style-parser.ts          \# Parse React Native styles for property panel

    property-schema.ts       \# Define editable properties per component type

Key behaviors: clicking a component on the canvas selects it and opens its properties in the PropertyPanel. Property changes update the Zustand AST store immediately (optimistic). The store emits a WebSocket ast:patch event to sync with the server and other clients. Drag-and-drop uses @dnd-kit with sortable context for reordering within a parent and droppable context for moving between parents. All edits are free (no credits consumed).

## **5.3 Code Editor (features/code-editor/)**

features/code-editor/

  index.ts                    \# Barrel export

  components/

    index.ts                  \# Barrel export

    MonacoWrapper.tsx        \# Monaco Editor with project-specific config

    FileTabs.tsx             \# Open file tabs with unsaved indicator

    StatusBar.tsx            \# Line/col, language, encoding, AST sync status

  hooks/

    index.ts                  \# Barrel export

    useMonaco.ts             \# Monaco instance management and configuration

    useFileSync.ts           \# Bidirectional sync: file content \<-\> AST store

    useAutoComplete.ts       \# Custom autocomplete for project-specific types

  utils/

    index.ts                  \# Barrel export

    monaco-config.ts         \# TypeScript compiler options, theme, keybindings

    file-language-map.ts     \# File extension to Monaco language mapping

Key behaviors: when a user edits code in Monaco and saves (Ctrl+S), the file content is parsed by the AST Engine on the backend. If the parse is successful, the AST store is updated with the new tree, and Builder Mode and Preview reflect the changes. If the parse fails (syntax error), the error is shown in the StatusBar and the AST is not updated. When the AST changes from Agent Mode or Builder Mode, the Code Editor receives the updated file content via the Zustand store subscription and refreshes the Monaco model.

## **5.4 Preview (features/preview/)**

features/preview/

  index.ts                    \# Barrel export

  components/

    index.ts                  \# Barrel export

    SandpackPreview.tsx      \# Sandpack iframe wrapper with error overlay

    QRCodeDisplay.tsx        \# QR code for Expo Go with copy URL button

    DeviceSelector.tsx       \# iPhone / Android / Tablet frame picker

    NativeFeatureWarning.tsx \# Badge for features requiring dev build

  hooks/

    index.ts                  \# Barrel export

    useSandpackSync.ts       \# Push AST-serialized files to Sandpack instance

    useExpoPreview.ts        \# Manage Expo dev server connection and QR URL

  utils/

    index.ts                  \# Barrel export

    sandpack-setup.ts        \# Sandpack template config for React Native Web

    file-transformer.ts      \# Transform RN source to RN Web compatible

Key behaviors: the preview has two channels. Browser Preview uses Sandpack to render React Native Web in an iframe. It updates by pushing the latest file contents from the project store to the Sandpack instance. Device Preview uses Expo Go via QR code. The QR code points to an Expo dev server running on the backend. When files change, the Expo dev server pushes hot updates to the connected device. Both channels render from the same AST, but Sandpack shows a web approximation while Expo Go shows actual native rendering.

## **5.5 Terminal (features/terminal/) \- Month 2**

features/terminal/

  index.ts                    \# Barrel export

  components/

    index.ts                  \# Barrel export

    TerminalEmulator.tsx     \# xterm.js wrapper with fit addon

    CommandPalette.tsx       \# Pre-populated command buttons

  hooks/

    index.ts                  \# Barrel export

    useTerminalSocket.ts     \# Socket.io terminal:input / terminal:output

  utils/

    index.ts                  \# Barrel export

    terminal-theme.ts        \# Terminal color scheme matching workspace theme

Key behaviors: the terminal connects to a sandboxed container on the backend allocated to the user's project. Commands typed in xterm.js are sent via Socket.io to the backend, which pipes them to the container's shell. Output is streamed back in real-time. Pre-populated command buttons (Install Package, Run Build, Check Errors, Start Expo) are available for non-technical users. The terminal is gated to Team tier and above.

# **6\. State Management (Zustand Stores)**

Zustand is the client-side state management solution. It provides synchronous, subscription-based state updates with minimal boilerplate. The application uses four stores, each with a single responsibility. Stores are defined in src/stores/ and accessed via custom hooks.

## **6.1 AST Store (ast-store.ts)**

The most critical store in the application. Holds the Component AST, provides CRUD operations, and manages undo/redo history. Uses the immer middleware for immutable updates.

interface ASTStore {

  // State

  ast: ASTNode | null;

  selectedNodeId: string | null;

  undoStack: ASTSnapshot\[\];

  redoStack: ASTSnapshot\[\];

  lastSyncedVersion: number;

  isDirty: boolean;

  // Actions

  setAST: (ast: ASTNode) \=\> void;

  selectNode: (nodeId: string | null) \=\> void;

  updateNode: (nodeId: string, updates: Partial\<ASTNode\>) \=\> void;

  addNode: (parentId: string, node: ASTNode, index?: number) \=\> void;

  removeNode: (nodeId: string) \=\> void;

  moveNode: (nodeId: string, newParentId: string, index: number) \=\> void;

  duplicateNode: (nodeId: string) \=\> void;

  applyPatch: (patches: JSONPatch\[\]) \=\> void;

  undo: () \=\> void;

  redo: () \=\> void;

  // Selectors

  getNode: (nodeId: string) \=\> ASTNode | undefined;

  getSelectedNode: () \=\> ASTNode | undefined;

  getChildren: (nodeId: string) \=\> ASTNode\[\];

  getAncestors: (nodeId: string) \=\> ASTNode\[\];

}

* Every mutation pushes the previous state to undoStack (capped at 50 entries) and clears redoStack.

* After every mutation, a JSON Patch diff is computed and emitted via Socket.io (ast:patch event) for server sync and other clients.

* The store subscribes to incoming ast:patched WebSocket events from the server to apply remote changes (from Agent Mode generation or other browser tabs).

* Version numbers prevent conflicts: if an incoming patch has a version lower than lastSyncedVersion, it is rejected and a full ast:snapshot is requested.

## **6.2 UI Store (ui-store.ts)**

interface UIStore {

  // Panel state

  activeMode: 'agent' | 'builder' | 'code-editor';

  isLeftPanelOpen: boolean;

  isRightPanelOpen: boolean;

  isBottomPanelOpen: boolean;

  panelSizes: { left: number; center: number; right: number; bottom: number };

  // Builder state

  canvasZoom: number;

  canvasOffset: { x: number; y: number };

  expandedTreeNodes: Set\<string\>;

  propertyTab: 'style' | 'props' | 'events';

  // Code Editor state

  openFileTabs: string\[\];

  activeFileTab: string | null;

  // Global UI

  commandPaletteOpen: boolean;

  theme: 'light' | 'dark' | 'system';

}

## **6.3 Auth Store (auth-store.ts)**

interface AuthStore {

  user: User | null;

  plan: Plan;

  creditsRemaining: number;

  creditsTotal: number;

  creditsResetAt: Date | null;

  isAuthenticated: boolean;

  // Actions

  setUser: (user: User) \=\> void;

  updateCredits: (remaining: number) \=\> void;

  logout: () \=\> void;

}

## **6.4 Project Store (project-store.ts)**

interface ProjectStore {

  project: Project | null;

  files: Map\<string, FileEntry\>;

  fileTree: FileTreeNode\[\];

  backendSchema: BackendSchema | null;

  connectedBackend: string | null;

  isLoading: boolean;

  // Actions

  loadProject: (projectId: string) \=\> Promise\<void\>;

  updateFile: (path: string, content: string) \=\> void;

  createFile: (path: string, content: string) \=\> void;

  deleteFile: (path: string) \=\> void;

  setBackendSchema: (schema: BackendSchema) \=\> void;

}

## **6.5 Settings Store (settings-store.ts)**

The settings store holds all configuration fetched from the backend's settings table. It is the first store initialized on app load. No other store or component should hardcode values that belong in settings (plans, keys, feature flags, provider lists).

interface SettingsStore {

  // State (all fetched from GET /api/v1/settings)

  supabaseUrl: string | null;

  supabaseAnonKey: string | null;

  stripePublishableKey: string | null;

  paystackPublicKey: string | null;

  plans: Plan\[\];

  enabledModels: ModelSummary\[\];

  enabledBackends: BackendSummary\[\];

  featureFlags: Record\<string, boolean\>;

  maxProjectsPerPlan: Record\<PlanTier, number\>;

  isLoaded: boolean;

  isMaintenanceMode: boolean;

  // Actions

  loadSettings: () \=\> Promise\<void\>;

  refreshSettings: () \=\> Promise\<void\>;

  isFeatureEnabled: (flag: string) \=\> boolean;

  getPlanById: (planId: string) \=\> Plan | undefined;

}

* Initialization: loadSettings() is called in the root layout (app/layout.tsx) inside a useEffect. A full-screen skeleton is shown until isLoaded becomes true.

* Background refresh: refreshSettings() is called every 5 minutes via a React Query background refetch. This picks up admin changes (new models enabled, plan price changes, feature flag toggles) without requiring a page reload.

* Supabase client: the Supabase auth client is initialized lazily after settings load, using supabaseUrl and supabaseAnonKey from this store. It is not initialized from environment variables.

* Stripe Elements: the Stripe provider wrapping the billing page reads stripePublishableKey from this store. If the key is null (settings not loaded), Stripe Elements do not render.

* Fallback defaults: if the settings fetch fails (backend down), the store falls back to values from lib/constants/defaults.ts to allow basic app rendering with a degraded experience banner.

# **7\. Real-Time Layer (Socket.io Client)**

The Socket.io client is a singleton initialized in src/lib/api/socket-client.ts and exported via the barrel at @/lib/api. It connects when the workspace page mounts and disconnects on unmount. Authentication is handled by passing the JWT as a query parameter during the connection handshake.

## **7.1 Connection Lifecycle**

1. Workspace page mounts. useEffect calls socketClient.connect(jwt, projectId).

2. Socket.io establishes WebSocket connection to the Express backend with the JWT and project ID.

3. Backend verifies JWT, joins the socket to the project room, and sends an ast:snapshot event with the current server-side AST.

4. Client receives ast:snapshot and initializes the Zustand AST store.

5. All subsequent AST changes flow bidirectionally via ast:patch and ast:patched events.

6. When the user navigates away, useEffect cleanup calls socketClient.disconnect(). Socket leaves the project room.

## **7.2 Client Event Handlers**

| Event | Direction | Handler | Store Updated |
| :---- | :---- | :---- | :---- |
| ast:patched | Server to Client | Apply JSON Patch to AST store. Skip if patch originated from this client (echo prevention). | ast-store |
| ast:snapshot | Server to Client | Replace entire AST store state. Used on initial connect and conflict recovery. | ast-store |
| ast:conflict | Server to Client | Show toast warning. Request fresh ast:snapshot from server. Reset local undo stack. | ast-store |
| generate:stream | Server to Client | Append text chunk to streaming message in Agent Mode chat. | Feature-local state in ChatPanel |
| generate:complete | Server to Client | Mark message as complete. Apply AST operations. Update credit count. | ast-store, auth-store |
| generate:error | Server to Client | Show error in chat. Refund credit display. | auth-store |
| preview:reload | Server to Client | Trigger Sandpack file update and Expo hot reload. | project-store (file contents) |
| preview:error | Server to Client | Show error overlay in preview panel. | Feature-local state in PreviewPanel |
| terminal:output | Server to Client | Write data to xterm.js terminal buffer. | Feature-local state in TerminalPanel |
| presence:join | Server to Client | Show collaborator avatar in toolbar (future: Month 4+). | UI display only |
| presence:leave | Server to Client | Remove collaborator avatar. | UI display only |

# **8\. Routing and Navigation**

Next.js App Router handles all routing. Route groups separate the four main sections of the application. Each group has its own layout, loading state, and error boundary.

## **8.1 Route Map**

| Route | Group | Rendering | Auth Required | Description |
| :---- | :---- | :---- | :---- | :---- |
| / | (marketing) | SSR (static) | No | Landing page |
| /pricing | (marketing) | SSR (static) | No | Pricing page |
| /docs/\[...slug\] | (marketing) | SSR (ISR 1hr) | No | Documentation |
| /login | (auth) | SSR | No (redirect if authed) | Login form |
| /register | (auth) | SSR | No (redirect if authed) | Registration form |
| /forgot-password | (auth) | SSR | No | Password reset request |
| /callback | (auth) | Client | No | OAuth callback handler |
| /dashboard | (dashboard) | Server Component \+ Client | Yes | Project list |
| /dashboard/settings | (dashboard) | Server Component \+ Client | Yes | Account settings |
| /dashboard/billing | (dashboard) | Server Component \+ Client | Yes | Billing management |
| /workspace/\[projectId\] | (workspace) | Server Component (data) \+ Client (workspace) | Yes \+ project owner | Main workspace |

## **8.2 Middleware (middleware.ts)**

Next.js Edge Middleware runs on every request before it reaches the page. It handles three concerns:

* Auth Token Refresh: checks if the access token in the cookie is expired or within 5 minutes of expiry. If so, calls the backend's POST /api/v1/auth/refresh endpoint to get a new access token and sets the updated cookie. The backend handles all Supabase interaction for token refresh. This prevents any flash of unauthenticated state.

* Route Protection: redirects unauthenticated users from (dashboard) and (workspace) routes to /login. Redirects authenticated users from /login and /register to /dashboard.

* Project Access: for /workspace/\[projectId\] routes, the middleware does NOT verify project ownership (that would require a database call). Ownership is verified by the server component data fetch and the Express API via RLS.

# **9\. API Client Layer**

The frontend communicates with the Express backend via a typed API client built on fetch \+ React Query. The client is defined in src/lib/api/api-client.ts and exported via the barrel at src/lib/api/index.ts. All consumers import from @/lib/api.

## **9.1 API Client Architecture**

// src/lib/api/api-client.ts

const BASE\_URL \= process.env.NEXT\_PUBLIC\_API\_URL;

async function request\<T\>(path: string, options?: RequestInit): Promise\<T\> {

  const token \= getAccessToken(); // from httpOnly cookie, set by backend auth endpoints

  const res \= await fetch(\`${BASE\_URL}${path}\`, {

    ...options,

    headers: {

      'Content-Type': 'application/json',

      'Authorization': \`Bearer ${token}\`,

      ...options?.headers,

    },

  });

  if (\!res.ok) throw new APIError(res.status, await res.json());

  return res.json();

}

export const api \= {

  projects: {

    list: (params?) \=\> request\<ProjectListResponse\>('/api/v1/projects', ...),

    get: (id) \=\> request\<ProjectResponse\>(\`/api/v1/projects/${id}\`),

    create: (data) \=\> request\<ProjectResponse\>('/api/v1/projects', { method: 'POST', body: ... }),

    update: (id, data) \=\> request\<ProjectResponse\>(\`/api/v1/projects/${id}\`, { method: 'PATCH', ... }),

    delete: (id) \=\> request\<void\>(\`/api/v1/projects/${id}\`, { method: 'DELETE' }),

  },

  generate: {

    stream: (data) \=\> fetchSSE('/api/v1/generate', data), // SSE helper

    history: (projectId, params?) \=\> request\<ConversationResponse\>(...),

  },

  models: {

    list: () \=\> request\<ModelsResponse\>('/api/v1/models'),

  },

  billing: {

    get: () \=\> request\<BillingResponse\>('/api/v1/billing'),

    subscribe: (data) \=\> request\<SubscriptionResponse\>(...),

  },

  settings: {

    get: () \=\> request\<SettingsResponse\>('/api/v1/settings'), // No auth required for public settings

  },

  // ... other resource groups

};

## **9.2 React Query Integration**

React Query wraps the API client for caching, background refetching, and optimistic updates:

* Query keys follow the pattern: \['resource', id?, params?\]. Example: \['projects', projectId\], \['models'\], \['settings'\], \['billing'\].

* Stale time: 5 minutes for project list and settings, 30 seconds for billing (credits change frequently), Infinity for static data. Settings use background refetch to pick up admin changes without page reload.

* Optimistic updates: project rename, file save, and property edits update the cache immediately and roll back on error.

* Prefetching: when the user hovers over a project card, the project data and file tree are prefetched for instant workspace loading.

# **10\. Key Frontend Packages**

| Package | Version | Purpose | Bundle Impact |
| :---- | :---- | :---- | :---- |
| next | 15.x | Framework, SSR, routing, middleware | N/A (framework) |
| react \+ react-dom | 19.x | UI library | \~45KB gzipped |
| typescript | 5.7+ | Type checking (dev only) | 0KB (compile time) |
| tailwindcss | 4.x | Utility CSS | \~10KB gzipped (purged) |
| @radix-ui/\* | latest | Accessible primitives (shadcn foundation) | \~5KB per component used |
| zustand | 5.x | Client state | \~1KB gzipped |
| immer | 10.x | Immutable updates for AST store | \~6KB gzipped |
| @tanstack/react-query | 5.x | Server state, caching | \~12KB gzipped |
| @monaco-editor/react | 4.x | Code editor (lazy loaded) | \~2MB (loaded on demand for workspace only) |
| @dnd-kit/core \+ sortable | 6.x | Drag and drop | \~15KB gzipped |
| @codesandbox/sandpack-react | 2.x | Browser preview | \~200KB (loaded on demand) |
| socket.io-client | 4.x | WebSocket | \~15KB gzipped |
| @xterm/xterm | 5.x | Terminal emulator | \~100KB (loaded on demand, Month 2\) |
| react-resizable-panels | 2.x | Panel layout | \~5KB gzipped |
| qrcode.react | 4.x | QR code generation | \~8KB gzipped |
| zod | 3.x | Runtime validation | \~13KB gzipped |
| lucide-react | latest | Icons | Tree-shaken, \~200B per icon |
| fast-json-patch | 3.x | RFC 6902 JSON Patch | \~4KB gzipped |
| class-variance-authority | latest | shadcn variant helper | \~1KB gzipped |
| clsx \+ tailwind-merge | latest | ClassName utilities (cn helper) | \~2KB gzipped |

Total estimated workspace bundle: approximately 130KB gzipped for the initial JavaScript (excluding Monaco, Sandpack, and xterm which are lazy-loaded). Monaco loads an additional 2MB when the user switches to Code Editor mode. Sandpack loads approximately 200KB when the preview panel is first rendered. These large dependencies are code-split and only loaded when the user interacts with the relevant panel.

# **11\. Environment and Configuration**

## **11.1 Environment Variables**

The frontend exposes only three environment variables. All other configuration (Supabase credentials, Stripe keys, feature flags, plan definitions) is fetched from the backend's settings table at runtime via GET /api/v1/settings. This means sensitive keys never appear in the frontend bundle, and configuration changes do not require a frontend redeployment.

| Variable | Example Value | Description |
| :---- | :---- | :---- |
| NEXT\_PUBLIC\_API\_URL | https://api.yourdomain.com | Express backend base URL. All API calls and settings are fetched from here. |
| NEXT\_PUBLIC\_WS\_URL | wss://api.yourdomain.com | Socket.io WebSocket URL for real-time AST sync, preview, and terminal. |
| NEXT\_PUBLIC\_SENTRY\_DSN | https://xxx@sentry.io/xxx | Sentry DSN for frontend error tracking. |
| SENTRY\_AUTH\_TOKEN | sntrys\_... | Server-only. For source map uploads during CI build. Not exposed to client. |

## **11.2 Backend Settings Table**

All runtime configuration is stored in a settings table on the backend and fetched by the frontend on app initialization via GET /api/v1/settings. This endpoint returns only the settings the frontend is authorized to see (no server-side secrets). The response is cached by React Query with a 5-minute stale time and refreshed in the background.

### **Settings Fetched at Runtime**

| Setting Key | Example Value | Purpose | Cached |
| :---- | :---- | :---- | :---- |
| supabase\_url | https://xxx.supabase.co | Supabase project URL for auth client initialization | Yes (app lifetime) |
| supabase\_anon\_key | eyJhbGciOiJI... | Supabase anonymous key for auth (safe to expose, scoped by RLS) | Yes (app lifetime) |
| stripe\_publishable\_key | pk\_live\_... | Stripe publishable key for payment elements | Yes (app lifetime) |
| paystack\_public\_key | pk\_live\_... | Paystack public key for African payment integration | Yes (app lifetime) |
| plans | \[ { id, name, price, credits, features } \] | Plan definitions including pricing, credit limits, and feature flags per tier | Yes (5 min) |
| enabled\_models | \[ { id, name, provider, tags } \] | AI models currently enabled by admin (for model selector UI) | Yes (5 min) |
| enabled\_backends | \[ { id, name, provider } \] | Backend providers currently enabled by admin | Yes (5 min) |
| feature\_flags | { terminal: true, comparison: false } | Feature toggles controlled from admin dashboard | Yes (5 min) |
| max\_projects\_per\_plan | { free: 3, starter: 10, pro: 50, team: \-1 } | Project limits per plan | Yes (5 min) |
| maintenance\_mode | false | If true, show maintenance banner on all pages | Yes (30 sec) |

This architecture means the frontend has zero hardcoded Supabase, Stripe, or Paystack keys. If you rotate a Supabase anon key, change Stripe accounts, or add a new payment provider, you update the settings table in the backend and every frontend client picks up the change within 5 minutes without any redeployment.

### **Settings Store (stores/settings-store.ts)**

interface SettingsStore {

  // State

  supabaseUrl: string | null;

  supabaseAnonKey: string | null;

  stripePublishableKey: string | null;

  paystackPublicKey: string | null;

  plans: Plan\[\];

  enabledModels: ModelSummary\[\];

  enabledBackends: BackendSummary\[\];

  featureFlags: Record\<string, boolean\>;

  maxProjectsPerPlan: Record\<Plan, number\>;

  isLoaded: boolean;

  isMaintenanceMode: boolean;

  // Actions

  loadSettings: () \=\> Promise\<void\>;

  refreshSettings: () \=\> Promise\<void\>;

}

The settings store is initialized in the root layout (app/layout.tsx) before any child component renders. A loading skeleton is shown until isLoaded is true. This ensures Supabase auth, Stripe elements, and plan data are available before any authenticated route or payment flow renders.

## **11.3 Next.js Configuration Highlights**

* Turbopack enabled for development (next dev \--turbo) for faster hot module replacement.

* Image optimization configured for domains fetched from backend settings (Supabase Storage, Cloudflare R2). Domains are set via next.config.ts remotePatterns.

* Transpile packages: @packages/shared for monorepo shared types.

* Webpack config: Monaco Editor uses the MonacoWebpackPlugin for worker bundling in production builds.

* Headers: strict CSP allowing Sandpack iframe, Socket.io connections, and domains resolved at runtime from settings.

* Rewrites: /api/\* proxied to Express backend in development for CORS-free local development.

# **12\. Performance Strategy**

## **12.1 Code Splitting**

* Route-based splitting: each route group (marketing, auth, dashboard, workspace) is a separate chunk. The workspace bundle is never loaded for marketing visitors.

* Component-level splitting: Monaco Editor, Sandpack, and xterm.js are loaded via next/dynamic with ssr: false. They load only when the user interacts with the relevant panel.

* Feature module splitting: each feature (agent, builder, code-editor, preview, terminal) is dynamically imported when its panel becomes visible.

## **12.2 Rendering Strategy**

* Marketing pages: fully server-rendered with static generation where possible. ISR (Incremental Static Regeneration) for docs pages with 1-hour revalidation.

* Dashboard: server component fetches project list on the server, streams the response. Client components handle interactions (search, filter, sort).

* Workspace: server component fetches project metadata and user plan. The entire workspace UI is client-rendered for real-time interactivity.

## **12.3 Performance Targets**

| Metric | Marketing Pages | Dashboard | Workspace |
| :---- | :---- | :---- | :---- |
| LCP (Largest Contentful Paint) | \< 1.2 seconds | \< 2.0 seconds | \< 3.0 seconds |
| FID (First Input Delay) | \< 50ms | \< 100ms | \< 100ms |
| CLS (Cumulative Layout Shift) | \< 0.05 | \< 0.1 | \< 0.1 |
| Initial JS Bundle | \< 80KB gzipped | \< 100KB gzipped | \< 130KB gzipped |
| TTI (Time to Interactive) | \< 1.5 seconds | \< 2.5 seconds | \< 4.0 seconds |
| AST Update to Preview Render | N/A | N/A | \< 500ms |

# **13\. Testing Strategy**

## **13.1 Testing Stack**

| Layer | Tool | Coverage Target | What It Tests |
| :---- | :---- | :---- | :---- |
| Unit | Vitest | 80%+ of utility functions and store logic | Zustand store actions, AST operations, JSON Patch diffing, formatters, parsers |
| Component | Vitest \+ React Testing Library | All organisms, key molecules | Component rendering, user interactions, store integration, accessibility |
| Integration | Playwright | Critical user flows | End-to-end: create project, generate via Agent, edit in Builder, preview, deploy |
| Visual Regression | Chromatic (Storybook) | All atoms and molecules | Visual appearance consistency across changes |
| Accessibility | axe-core via Playwright | All pages | WCAG 2.1 AA compliance for all interactive elements |

## **13.2 Testing Conventions**

* Test files co-located: ComponentName.test.tsx lives next to ComponentName.tsx.

* Store tests: each Zustand store has a dedicated test file testing all actions and selectors in isolation.

* Mock strategy: API calls mocked via MSW (Mock Service Worker). Socket.io mocked via a custom test helper. Settings store pre-populated with test fixtures. Auth mocked via a test wrapper that injects a fake JWT.

* CI requirement: all tests must pass before PR merge. Coverage report generated but not gated (target is aspirational, not blocking).

# **14\. Coding Standards and Conventions**

## **14.1 Barrel Export Convention**

Every folder in the project must have an index.ts barrel export file. This is a non-negotiable convention that ensures clean, predictable import paths across the codebase. Barrel exports allow consumers to import from a folder path rather than reaching into individual files.

### **Rules**

* Every directory that contains exportable modules must have an index.ts that re-exports all public members.

* Imports should always reference the folder, never the individual file. Use: import { Button, Input } from '@/components/atoms' rather than import { Button } from '@/components/atoms/Button'.

* Barrel files use named re-exports exclusively. No default exports in barrel files.

* Nested barrel files roll up into parent barrels. The top-level lib/index.ts re-exports from lib/constants, lib/api, lib/helpers, lib/formatters, and lib/utils.

* Feature module barrel files (features/agent/index.ts) export only the public API of that feature. Internal components, hooks, and utilities that are not used outside the feature are not re-exported.

* Circular dependency prevention: barrel files must never create circular imports. If module A imports from module B and module B imports from module A, refactor the shared dependency into a separate module.

### **Barrel Export Examples**

// components/atoms/index.ts

export { Button } from './Button';

export { Input } from './Input';

export { Badge } from './Badge';

export { Card } from './Card';

export { Tooltip } from './Tooltip';

// ... all atoms

// components/index.ts

export \* from './atoms';

export \* from './molecules';

export \* from './organisms';

export \* from './templates';

// lib/constants/index.ts

export { ROUTES } from './routes';

export { QUERY\_KEYS } from './query-keys';

export { SOCKET\_EVENTS } from './socket-events';

export { SHORTCUTS } from './keyboard-shortcuts';

export { THEME } from './theme';

export { DEFAULTS } from './defaults';

// lib/api/index.ts

export { api } from './api-client';

export { socketClient } from './socket-client';

export { createSSEStream } from './sse-client';

export { withAuth, withErrorTransform } from './interceptors';

export type { APIError, APIResponse } from './types';

// lib/helpers/index.ts

export { findNode, traverseAST, getNodePath } from './ast-helpers';

export { hasCredits, getCreditsForPlan } from './credit-helpers';

export { getFileExtension, formatFileSize } from './file-helpers';

export { generateSlug, resolveTemplate } from './project-helpers';

export { validateEmail, sanitizeInput } from './validation-helpers';

// lib/formatters/index.ts

export { formatDate, formatRelativeTime, formatDuration } from './date-formatter';

export { formatCredits, formatFileSize, formatCurrency } from './number-formatter';

export { formatCodeBlock, highlightDiff } from './code-formatter';

export { capitalize, slugify, truncate, pluralize } from './string-formatter';

// lib/utils/index.ts

export { logger } from './logger';

export { cn } from './cn';

export { debounce, throttle } from './debounce';

export { storage } from './storage';

export { copyToClipboard } from './clipboard';

export { APIError, ASTError, AuthError } from './error';

// lib/index.ts (top-level barrel)

export \* from './constants';

export \* from './api';

export \* from './helpers';

export \* from './formatters';

export \* from './utils';

// features/agent/index.ts (public API only)

export { ChatPanel } from './components';

export { useGenerate, useConversation, useModelList } from './hooks';

export type { Message, StreamChunk, GenerateRequest } from './types';

### **Import Usage (Consumer Side)**

// Clean imports from barrel exports

import { Button, Badge, Input } from '@/components/atoms';

import { ChatPanel, PropertyInspector } from '@/components/organisms';

import { ROUTES, QUERY\_KEYS, SOCKET\_EVENTS } from '@/lib/constants';

import { api, socketClient } from '@/lib/api';

import { findNode, hasCredits } from '@/lib/helpers';

import { formatDate, formatCredits } from '@/lib/formatters';

import { logger, cn } from '@/lib/utils';

import { useSettingsStore } from '@/stores';  // plans, models, flags from backend

import { useGenerate } from '@/features/agent';

// NEVER do this:

// import { Button } from '@/components/atoms/Button';       // BAD

// import { logger } from '@/lib/utils/logger';              // BAD

// import { formatDate } from '@/lib/formatters/date-formatter'; // BAD

The no-direct-file-import rule is enforced via the ESLint no-restricted-imports rule configured in the shared ESLint config. Any import that bypasses a barrel file triggers a lint error with an auto-fixable suggestion.

## **14.2 File Naming**

* Components: PascalCase. Example: ChatPanel.tsx, ModelSelector.tsx

* Hooks: camelCase with use prefix. Example: useGenerate.ts, useSelection.ts

* Utilities and helpers: kebab-case. Example: ast-helpers.ts, date-formatter.ts

* Constants: kebab-case. Example: query-keys.ts, socket-events.ts

* Types: kebab-case with .types.ts suffix. Example: agent.types.ts, ast.types.ts

* Stores: kebab-case with \-store suffix. Example: ast-store.ts, ui-store.ts

* Barrel exports: always index.ts in every directory

* Tests: same name as source with .test.tsx or .test.ts suffix

## **14.3 Component Conventions**

* All components use named exports (no default exports) except Next.js pages which require default exports.

* Props interfaces are defined inline for simple components or in a co-located .types.ts file for complex ones.

* Components accept a className prop for external styling override via Tailwind's cn() utility.

* Event handlers are prefixed with on (onSelect, onChange, onSubmit) in props and handle (handleSelect, handleChange, handleSubmit) in implementation.

* All interactive elements must have accessible labels (aria-label, aria-labelledby, or visible label.

## **14.4 Import Order**

* 1\. React and Next.js imports

* 2\. Third-party library imports

* 3\. Shared package imports (@packages/shared)

* 4\. Store imports (@/stores via barrel)

* 5\. Component imports (@/components via barrel: atoms, molecules, organisms)

* 6\. Lib imports (@/lib via barrel: constants, api, helpers, formatters, utils)

* 7\. Feature-local imports (relative paths via local barrel)

* 8\. Type-only imports last (import type { ... })

Enforced via ESLint import/order rule with groups configured in the shared ESLint config.

## **14.5 ESLint and Prettier**

* ESLint: extends next/core-web-vitals, typescript-eslint/recommended, and custom rules for import order, no unused variables, consistent return types, and no-restricted-imports (enforce barrel exports).

* Prettier: 100 character line width, single quotes, trailing commas, 2-space indentation. Runs on save and in CI.

* Husky \+ lint-staged: pre-commit hook runs ESLint and Prettier on staged files only.

*End of Frontend Architecture Specification  |  Version 1.2  |  February 2026*