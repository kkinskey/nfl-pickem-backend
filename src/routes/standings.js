import { Router } from "express";
import { authenticateAdmin } from "../middleware/auth.js";
import { handleError } from "../utils/handleError.js";
import {
  calculateWeeklyStandings,
  calculateOverallStandings,
} from "../services/standingsService.js";

import {} from "../services/standingsService.js";

const router = Router();

// POST Calculate weekly standings
router.post("/calculate/weekly", authenticateAdmin, async (req, res) => {
  try {
    const { week_id } = req.body;
    const standings = await calculateWeeklyStandings(Number(week_id));
    res.status(201).json(standings);
  } catch (e) {
    handleError(e, res);
  }
});

// POST Calculate Overall standings
router.post("/calculate/overall", authenticateAdmin, async (req, res) => {
  try {
    const standings = await calculateOverallStandings();
    res.status(201).json(standings);
  } catch (e) {
    handleError(e, res);
  }
});

export default router;
