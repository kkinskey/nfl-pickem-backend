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
    // - verifies the toekn signature using the secret key
    // - returns the decoded payload (usually an object with whatever I encoded plus standard claims: iat, exp).
    // - throws if the token is missing, signature is invalid, token expired, or verification fails for other reasons.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //console.log("decoded: ", decoded); //debug

    // Attach info from token to req for downstream handlers
    // decoded should contain: { id, email, role, iat, exp }
    // - id, email, and role are application- specific claims I included when signing the token.
    // - iat = issued at (timestamp in seconds).
    // - exp = expiration time (timestamp in seconds).
    // Example decoded value: {id: 42, email: "alice@example.com", role: "ADMIN", iat: 1700000000, exp: 1700003600}

    // This stores the decoded token on the request object so later middleware/routes can authorize or personalize responses.
    // This is a common pattern: after authentication, downstream logic uses req.user.id or req.user.role to allow/deny actions.
    req.user = decoded;
    next();
  } catch (err) {
    //console.log("JWT error: ", err); //debug
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function authenticateAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied: Admins only" });
    }
    next();
  });
}
