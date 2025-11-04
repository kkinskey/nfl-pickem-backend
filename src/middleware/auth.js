import jwt from "jsonwebtoken";

export function authenticateToken(req, res, next) {
  // Expect header like: Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];
  //console.log("authHeader: ", authHeader); //Debug
  const token = authHeader?.split(" ")[1]; // get the part after "Bearer"
  //console.log("token: ", token); //Debug
  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  try {
    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //console.log("decoded: ", decoded); //debug

    // Attach info from token to req for downstream handlers
    // decoded should contain: { id, email, role, iat, exp }
    req.user = decoded;
    next();
  } catch (err) {
    //console.log("JWT error: ", err); //debug
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
