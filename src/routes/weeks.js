import { Router } from "express";
import {
  getCurrentWeek,
  getWeekSchedule,
  createWeek,
} from "../services/weeksService.js";
import { authenticateAdmin } from "../middleware/auth.js";
import { handleError } from "../utils/handleError.js";
const router = Router();

// GET Current Week
router.get("/current", async (req, res) => {
  try {
    const week = await getCurrentWeek();

    res.status(200).json(week);
  } catch (e) {
    handleError(e, res);
  }
});

// GET Week Schedule
router.get("/:id/games", async (req, res) => {
  try {
    // Parse the week id from URL
    //convert the string "id" to a number. ex: "1" -> 1
    const weekId = Number(req.params.id);

    const schedule = await getWeekSchedule({ weekId });

    return res.status(200).json(schedule);
  } catch (e) {
    handleError(e, res);
  }
});

// POST Create week
router.post("/add", authenticateAdmin, async (req, res) => {
  try {
    const { season, week_number, open_at, lock_at, is_finalized, created_at } =
      req.body;
    const newWeek = await createWeek({
      season,
      week_number,
      open_at,
      lock_at,
      is_finalized,
      created_at,
      user: req.user,
    });
    res.status(201).json(newWeek);
  } catch (e) {
    handleError(e, res);
  }
});

export default router;
