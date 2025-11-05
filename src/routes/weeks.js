import { Router } from "express";
import { getCurrentWeek, getWeekSchedule } from "../services/weeksService.js";

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

export default router;
