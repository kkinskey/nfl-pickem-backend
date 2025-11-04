import express from "express";
import cors from "cors";
import usersRouter from "./routes/users.js";
import picksRouter from "./routes/picks.js";
import weeksRouter from "./routes/weeks.js";
import gamesRouter from "./routes/games.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/users", usersRouter);
app.use("/picks", picksRouter);
app.use("/weeks", weeksRouter);
app.use("/games", gamesRouter);

// Health check
app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.set("json spaces", 2); // pretty JSON responses

export default app;
