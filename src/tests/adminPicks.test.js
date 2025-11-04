import request from "supertest";
import app from "../../src/app.js";
import { generateToken } from "./utils/generateToken.js";

let adminToken;
let userToken;

beforeAll(() => {
  adminToken = generateToken({
    id: 4,
    email: "admin@example.com",
    role: "ADMIN",
  });
  userToken = generateToken({
    id: 3,
    email: "testuser@example.com",
    role: "USER",
  });
});

describe("GET /admin/picks", () => {
  it("should return 401 if no token is provided", async () => {
    const res = await request(app).get("/admin/picks");
    expect(res.statusCode).toBe(401);
  });

  it("should return 403 if user is not admin", async () => {
    const res = await request(app)
      .get("/admin/picks")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.statusCode).toBe(403);
  });

  it("should return picks for valid admin token", async () => {
    const res = await request(app)
      .get("/admin/picks?season=2025&week=1")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
