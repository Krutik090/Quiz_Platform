import mongoose from "mongoose";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

export async function connectMongo(): Promise<void> {
  mongoose.set("strictQuery", true);

  mongoose.connection.on("error", (err) => logger.error({ err }, "MongoDB connection error"));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));

  await mongoose.connect(env.MONGO_URI);
  logger.info("MongoDB connected");
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
