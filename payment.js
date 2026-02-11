const express = require("express");
const Stripe = require("stripe");

function buildPaymentRouter({ readUsers, writeUsers }) {
  const router = express.Router();
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripe = stripeKey ? new Stripe(stripeKey) : null;

  router.post("/checkout", async (req, res) => {
    const user = req.user;

    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "subscription",
          line_items: [
            {
              price_data: {
                currency: "brl",
                product_data: {
                  name: "OAB Quest Premium"
                },
                recurring: { interval: "month" },
                unit_amount: 3990
              },
              quantity: 1
            }
          ],
          success_url: `${process.env.APP_BASE_URL || "http://localhost:3000"}/?premium=success`,
          cancel_url: `${process.env.APP_BASE_URL || "http://localhost:3000"}/?premium=cancel`
        });

        return res.json({
          mode: "stripe",
          checkoutUrl: session.url
        });
      } catch (error) {
        console.warn("Stripe checkout failed. Falling back to sandbox mode.", error.message);
      }
    }

    return res.json({
      mode: "sandbox",
      message: "Sandbox ativo: use /api/payment/confirm-sandbox para liberar premium.",
      sandboxToken: `sandbox-${user.id}-${Date.now()}`
    });
  });

  router.post("/confirm-sandbox", (req, res) => {
    const users = readUsers();
    const index = users.findIndex((u) => u.id === req.user.id);

    if (index < 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    users[index].plan = "premium";
    writeUsers(users);

    return res.json({
      message: "Premium ativado no sandbox com sucesso.",
      plan: "premium"
    });
  });

  return router;
}

module.exports = {
  buildPaymentRouter
};
