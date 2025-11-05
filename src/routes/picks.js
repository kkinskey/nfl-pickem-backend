import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";

import {
  getPicks,
  getPickById,
  createPick,
  updatePick,
} from "../services/picksService.js";

const router = Router();
// GET View Picks
router.get("/", async (req, res) => {
  try {
    /*
      Extract and convert a query parameter from an HTTP request
      
      EX:
       req.query.userId - Checks if the userId query parameter exists in the request URL.
       Number(req.query.userId) - Converts the string value to a number
       : undefined - If userId is not provided, it defaults to undefined
    */
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const season = req.query.season ? Number(req.query.season) : undefined;
    const week = req.query.week ? Number(req.query.week) : undefined;

    // Calls the service function, getPicks(), and passes in filters (userId, season, week) to retrieve and shape pick data from database.
    const result = await getPicks({ userId, season, week });
    res.status(200).json(result);
  } catch (e) {}
});

// GET View 1 pick
router.get("/:id", async (req, res) => {
  try {
    // convert the string "id" to a number
    const pickId = Number(req.params.id);

    const result = await getPickById({ pickId });
    res.status(200).json(result);
  } catch (e) {
    const status =
      e.message === "Invalid pick id"
        ? 400
        : e.message === "Pick not found"
        ? 404
        : 500;
    res.status(status).json({ error: e.message });
  }
});

// POST Create Picks
router.post("/add", async (req, res) => {
  try {
    const { user_id, game_id, winner, margin } = req.body;
    const newPick = await createPick({ user_id, game_id, winner, margin });

    res.status(201).json(newPick);
  } catch (e) {
    const status = e.message.includes("already exists") ? 409 : 400;
    res.status(status).json({ error: e.message });
  }
});

//PATCH /updatePick
router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const pickId = Number(req.params.id); //Convert the id from a string to a number

    // Pull the allowed fields from the request body
    const { winner, margin } = req.body;

    const updatedPick = await updatePick({
      pickId,
      winner,
      margin,
      user: req.user,
    });

    // Step 11: Success response
    return res.status(200).json({ message: "Pick updated", pick: updatedPick });
  } catch (e) {
    // Handle "record to update not found"
    const status =
      e.message === "Invalid pick id"
        ? 400
        : e.message === "Pick not found" || e.code === "P2025"
        ? 404
        : e.message.includes("access") || e.message.includes("edits")
        ? 403
        : 400;

    res.status(status).json({ error: e.message });
  }
});

export default router;
