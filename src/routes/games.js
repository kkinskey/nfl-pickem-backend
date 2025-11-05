import { Router } from "express";
import { getGameById } from "../services/gamesService.js";

const router = Router();

// GET game details
router.get("/:id", async (req, res) => {
  try {
    // Parse the game id from the URL
    //convert the string "id" to a number.
    const gameId = Number(req.params.id);
    const result = await getGameById({ gameId });
    res.status(200).json(result);
  } catch (e) {
    handleError(e, res);
  }
});

export default router;
