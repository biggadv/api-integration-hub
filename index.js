const express = require("express");
const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "API running" });
});

app.post("/data", (req, res) => {
  const payload = req.body;

  if (!payload) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  res.status(200).json({
    message: "Data received successfully",
    data: payload
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
