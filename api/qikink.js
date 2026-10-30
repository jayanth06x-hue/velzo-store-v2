
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      message: "Method not allowed"
    });
  }

  const clientId = process.env.QIKINK_CLIENT_ID;
  const clientSecret = process.env.QIKINK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      ok: false,
      message: "Qikink credentials are missing in Vercel"
    });
  }

  return res.status(200).json({
    ok: true,
    message: "VELZO Qikink backend setup is ready",
    authenticationTested: false,
    orderCreated: false
  });
}
