import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/db.js";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// GET /users View Profile
router.get("/", async (req, res, next) => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        display_name: true,
        role: true,
        created_at: true,
      },
    });
    res.json(users);
  } catch (e) {
    next(e);
  }
});

//POST /users - Register User
router.post("/", async (req, res, next) => {
  try {
    const { email, password, display_name, role } = req.body;

    // Step 1: Validate the email and password
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" }); // 400 means bad input
    }

    // Step 2: Check if user already exists
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" }); // 409 means duplicate email
    }

    // Step 3: Hash the Password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    //Step 4: Create user in DB
    const newUser = await prisma.users.create({
      data: {
        email,
        password_hash,
        display_name,
        role: role || "USER", //"USER" is a default role since we should only have one "ADMIN"
      },
      select: {
        id: true,
        email: true,
        display_name: true,
        role: true,
        created_at: true,
      },
    });

    //Step 5: Send a success response but not inluding the password
    res.status(201).json(newUser); // 201 means sucessfully created
  } catch (e) {
    //Prisma unique constraint handling
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Email already exists" }); // 409 means duplicate email
    }
    next(e); // fallback for unexpected errors
  }
});

//POST /users - Login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Step 1: Validate the email and password
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" }); // 400 means bad input
    }

    // Step 2: Check if user exists
    const loginUser = await prisma.users.findUnique({ where: { email } });

    if (!loginUser) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Step 3: Check if password is valid
    const isMatch = await bcrypt.compare(password, loginUser.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password or password" });
    }

    // Step 4: Build a token payload (what goes *inside* the token)
    const payload = {
      id: loginUser.id,
      email: loginUser.email,
      role: loginUser.role,
    };

    // Step 5: Sign JWT (JSON WEB TOKEN)
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h", // token will expire in 1 hour
    });

    // Step 6: Remove password_hash before sending the user login response
    const { password_hash, ...safeUser } = loginUser;

    // Step 7: Send user login response
    return res
      .status(200) // 200 ok
      .json({ message: "Login successful", token, user: safeUser });
  } catch (e) {
    next(e);
  }
});

//PATCH /updateProfile Note: This currently will only update
// the user's display_name
router.patch("/updateProfile", authenticateToken, async (req, res, next) => {
  try {
    // req.user was set by authenticateToken using the JWT payload
    const userId = req.user.id;

    // Pull the allowed fields from the request body
    const { display_name } = req.body;

    // Build an update payload with only fields that were actually provided
    const dataToUpdate = {};

    if (display_name !== undefined) {
      dataToUpdate.display_name = display_name;
    }

    // If the client didn't send any valid fields, reject the request
    if (Object.keys(dataToUpdate).length === 0) {
      return res
        .status(400)
        .json({ error: "No valid fields provided to update" });
    }

    //Update the user in the database
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    // Never return password_hash
    const { password_hash, ...safeUser } = updatedUser;

    return res.status(200).json({ message: "Profile updated", user: safeUser });
  } catch (e) {
    next(e);
  }
});

export default router;
