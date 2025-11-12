import { updateScores } from "../services/updateScores.js";

// Run the update as admin
async function main() {
  try {
    console.log("🔑 Running weekly NFL update as administrator...");
    await updateScores(2025);
    console.log("✅ Weekly update complete.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Update failed:", err);
    process.exit(1);
  }
}

main();
