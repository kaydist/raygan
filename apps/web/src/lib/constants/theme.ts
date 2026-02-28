export const PLAN_BADGE_COLORS: Record<string, string> = {
  free: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  pro: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  team: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

export const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
] as const;

export const THEME = {
  colors: {
    plan: {
      free: "gray",
      starter: "blue",
      pro: "purple",
      team: "amber",
    },
    status: {
      success: "green",
      warning: "yellow",
      error: "red",
      info: "blue",
    },
  },

  spacing: {
    panel: {
      minLeft: 280,
      minRight: 280,
      minCenter: 400,
      minBottom: 150,
    },
    default: {
      left: 25,
      center: 50,
      right: 25,
      bottom: 0,
    },
  },

  animation: {
    fast: 150,
    normal: 200,
    slow: 300,
  },

  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1400,
  },
} as const;
