import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Handle unexpected errors
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
  server.close(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
