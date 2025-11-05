import { Router } from "express";
import { authenticateAdmin } from "../middleware/auth.js";
import { getPicks } from "../services/picksService.js";
import { handleError } from "../utils/handleError.js";

const router = Router();

// GET View Picks (ADMIN)
router.get("/picks", authenticateAdmin, async (req, res) => {
  try {
    // Get all the picks from all the users in the database
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const season = req.query.season ? Number(req.query.season) : undefined;
    const week = req.query.week ? Number(req.query.week) : undefined;

    const result = await getPicks({ userId, season, week });
    // Send response with all the picks
    res.json(result);
  } catch (e) {
    handleError(e, res);
  }
});

export default router;
