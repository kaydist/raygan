import type { Request, Response } from "express";

import { logger } from "../config";
import { SettingsService } from "../services";

const settingsService = new SettingsService();

export async function getPublicSettings(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await settingsService.getPublicSettings();

    res.json({
      data: settings,
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch public settings");
    res.status(500).json({
      data: null,
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch settings" },
    });
  }
}
