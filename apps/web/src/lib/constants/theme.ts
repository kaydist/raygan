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
