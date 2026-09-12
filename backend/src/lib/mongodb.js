const mongoose = require("mongoose");
const { env } = require("../env");

/**
 * Reuse the connection across requests instead of reconnecting every time.
 */
let cachedConn = null;
let cachedPromise = null;

async function connectToDatabase() {
  if (cachedConn) return cachedConn;

  if (!cachedPromise) {
    const uri = env.mongodbUri;
    cachedPromise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  try {
    cachedConn = await cachedPromise;
  } catch (err) {
    cachedPromise = null;
    throw err;
  }

  return cachedConn;
}

module.exports = { connectToDatabase };
