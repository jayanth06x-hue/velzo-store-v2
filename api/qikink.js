
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

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
      message: "Qikink credentials are missing"
    });
  }

  try {
    const body = new URLSearchParams({
      ClientId: clientId,
      client_secret: clientSecret
    });

    const response = await fetch(
      "https://sandbox.qikink.com/api/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString(),
        signal: AbortSignal.timeout(10000)
      }
    );

    const data = await response.json();

    if (response.ok && data.Accesstoken) {
      return res.status(200).json({
        ok: true,
        message: "Qikink sandbox authentication successful",
        orderCreated: false
      });
    }

    return res.status(502).json({
      ok: false,
      message: "Qikink rejected the authentication request",
      qikinkStatus: response.status
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      message: "Unable to complete Qikink sandbox authentication"
    });
  }
}
