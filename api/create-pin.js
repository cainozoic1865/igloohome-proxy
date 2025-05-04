export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { name, start_time, end_time, device_uuid } = req.body;

  const IGLOO_TOKEN_URL = "https://auth.igloohome.co/oauth2/token";
  const IGLOO_CLIENT_ID = process.env.IGLOO_CLIENT_ID;
  const IGLOO_CLIENT_SECRET = process.env.IGLOO_CLIENT_SECRET;

  try {
    const tokenRes = await fetch(IGLOO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${IGLOO_CLIENT_ID}&client_secret=${IGLOO_CLIENT_SECRET}`
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.status(500).json({ error: "無法取得 token", detail: tokenData });
    }

    const accessToken = tokenData.access_token;

    const pinRes = await fetch(`https://api.igloohome.co/v1/devices/${device_uuid}/pin-generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "time_bound",
        starts_at: start_time,
        ends_at: end_time
      })
    });

    const pinData = await pinRes.json();

    if (!pinRes.ok) {
      return res.status(500).json({ error: "建立 PIN 失敗", detail: pinData });
    }

    return res.status(200).json(pinData);
  } catch (err) {
    return res.status(500).json({ error: "伺服器錯誤", detail: err.message });
  }
}
