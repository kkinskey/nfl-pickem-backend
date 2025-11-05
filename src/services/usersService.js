import { prisma } from "../lib/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function getUsers() {
  return await prisma.users.findMany({
    select: {
      id: true,
      email: true,
      display_name: true,
      role: true,
      created_at: true,
    },
  });
}

export async function registerUser({ email, password, display_name, role }) {
  // Step 1: Validate the email and password
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // Step 2: Check if user already exists
  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email already registered");
  }

  // Step 3: Hash the Password
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);

  //Step 4: Create user in DB
  return await prisma.users.create({
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
}

export async function login({ email, password }) {
  // Step 1: Validate the email and password
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // Step 2: Check if user exists
  const loginUser = await prisma.users.findUnique({ where: { email } });

  if (!loginUser) {
    throw new Error("Invalid email or password");
  }

  // Step 3: Check if password is valid
  const isMatch = await bcrypt.compare(password, loginUser.password_hash);

  if (!isMatch) {
    throw new Error("Invalid password");
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

  // Step 7: Return both token and user
  return { token, user: safeUser };
}

export async function updateUser({ userId, display_name }) {
  // Build an update payload with only fields that were actually provided
  const dataToUpdate = {};

  if (display_name !== undefined) {
    dataToUpdate.display_name = display_name;
  }

  // If the client didn't send any valid fields, reject the request
  if (Object.keys(dataToUpdate).length === 0) {
    throw new Error("No valid fields provided to update");
  }

  //Update the user in the database
  const updatedUser = await prisma.users.update({
    where: { id: userId },
    data: dataToUpdate,
  });

  // Never return password_hash
  const { password_hash, ...safeUser } = updatedUser;

  return safeUser;
}
