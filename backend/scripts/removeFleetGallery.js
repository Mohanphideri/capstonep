require("dotenv").config();

const { connectToDatabase } = require("../src/lib/mongodb");
const { SiteSetting } = require("../src/models/SiteSetting");
const { getStorageProvider } = require("../src/lib/storage/StorageService");

async function main() {
  await connectToDatabase();
  const settings = await SiteSetting.collection.findOne({ key: "default" });
  const items = Array.isArray(settings?.fleetGallery) ? settings.fleetGallery : [];
  let deleted = 0;

  if (items.length) {
    const storage = getStorageProvider();
    for (const item of items) {
      if (!item?.imageKey) continue;
      try {
        await storage.delete(item.imageKey);
        deleted += 1;
      } catch (err) {
        console.error(`[removeFleetGallery] Could not delete stored image ${item.imageKey}:`, err.message);
      }
    }
  }

  const result = await SiteSetting.collection.updateOne(
    { key: "default" },
    { $unset: { fleetGallery: "" } }
  );

  console.log(`[removeFleetGallery] Removed ${items.length} legacy gallery records; deleted ${deleted} stored images; modified ${result.modifiedCount} settings document(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[removeFleetGallery] migration failed:", err);
  process.exit(1);
});
