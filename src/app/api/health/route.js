import { NextResponse } from "next/server";
import mongoose from "mongoose";
import os from "os";

import connectToDatabase from "../../../lib/db";
export async function GET(req) {
  // 1. Check for the Secret Key in Headers
  const authHeader = req.headers.get("x-health-key");
  const isAdmin = authHeader === process.env.HEALTH_CHECK_KEY;

  try {
    // Basic Check (Safe for everyone)
    await connectToDatabase();
    const isDbConnected = mongoose.connection.readyState === 1;

    // IF NOT ADMIN: Return minimal info only
    if (!isAdmin) {
      if (isDbConnected) {
        return NextResponse.json({ status: "ok" }, { status: 200 });
      } else {
        return NextResponse.json({ status: "error" }, { status: 503 });
      }
    }

    // --- SENSITIVE DATA SECTION (Only runs if isAdmin is true) ---
    
    // Calculate Latency
    const start = performance.now();
    await mongoose.connection.db.admin().ping();
    const latency = (performance.now() - start).toFixed(2) + "ms";

    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      sensitive_info: {
        node_env: process.env.NODE_ENV,
        node_version: process.version,
        memory_usage: process.memoryUsage(),
        db_host: mongoose.connection.host,
        load_avg: os.loadavg(),
      },
      performance: {
        db_latency: latency,
        uptime: process.uptime(),
      }
    };

    return NextResponse.json(healthData, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { status: "error", message: isAdmin ? error.message : "Internal Error" }, 
      { status: 500 }
    );
  }
}