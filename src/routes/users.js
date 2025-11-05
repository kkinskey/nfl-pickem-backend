import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getUsers,
  registerUser,
  login,
  updateUser,
} from "../services/usersService.js";
import { handleError } from "../utils/handleError.js";

const router = Router();

// GET /users View Profile
router.get("/", async (req, res) => {
  try {
    const users = await getUsers();
    res.status(200).json(users);
  } catch (e) {
    handleError(e, res);
  }
});

//POST /users - Register User
router.post("/", async (req, res) => {
  try {
    const { email, password, display_name, role } = req.body;
    const newUser = await registerUser({ email, password, display_name, role });

    //Step 5: Send a success response but not inluding the password
    res.status(201).json(newUser); // 201 means sucessfully created
  } catch (e) {
    handleError(e, res);
  }
});

//POST /users - Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await login({ email, password });

    // Send user login response
    return res
      .status(200) // 200 ok
      .json({ message: "Login successful", token, user });
  } catch (e) {
    handleError(e, res);
  }
});

//PATCH /updateProfile Note: This currently will only update
// the user's display_name
router.patch("/updateProfile", authenticateToken, async (req, res) => {
  try {
    // req.user was set by authenticateToken using the JWT payload
    const userId = req.user.id;

    // Pull the allowed fields from the request body
    const { display_name } = req.body;

    const safeUser = await updateUser({ userId, display_name });

    return res.status(200).json({ message: "Profile updated", user: safeUser });
  } catch (e) {
    handleError(e, res);
  }
});

export default router;
