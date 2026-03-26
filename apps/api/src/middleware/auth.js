const jwt = require("jsonwebtoken");

const auth = (allowedRoles = []) => (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token não informado" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
      return res.status(403).json({ error: "Sem permissão para esta ação" });
    }
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

module.exports = { auth };
