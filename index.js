import express from "express";
import dotenv from "dotenv";
import handler from "./api/create-pin.js";

dotenv.config();
const app = express();
app.use(express.json());

app.post("/api/create-pin", handler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Igloohome Proxy listening on port ${port}`);
});
