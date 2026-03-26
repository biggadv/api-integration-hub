require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { authRoutes } = require("./routes/auth.routes");
const { processRoutes } = require("./routes/process.routes");
const { emailRoutes } = require("./routes/email.routes");
const { dashboardRoutes } = require("./routes/dashboard.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.status(200).json({ status: "ok", service: "Gestor Legal API" }));

app.use("/auth", authRoutes);
app.use("/processes", processRoutes);
app.use("/emails", emailRoutes);
app.use("/dashboard", dashboardRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno no servidor" });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Gestor Legal API rodando na porta ${port}`);
});
