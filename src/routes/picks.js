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
  } catch (e) {
    handleError(e, res);
  }
});

// GET View 1 pick
router.get("/:id", async (req, res) => {
  try {
    // convert the string "id" to a number
    const pickId = Number(req.params.id);

    const result = await getPickById({ pickId });
    res.status(200).json(result);
  } catch (e) {
    handleError(e, res);
  }
});

// POST Create Picks
router.post("/add", async (req, res) => {
  try {
    const { user_id, game_id, winner, margin } = req.body;
    const newPick = await createPick({ user_id, game_id, winner, margin });

    res.status(201).json(newPick);
  } catch (e) {
    handleError(e, res);
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
    handleError(e, res);
  }
});

export default router;
