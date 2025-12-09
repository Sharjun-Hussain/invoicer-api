import { NextResponse } from "next/server";
import mongoose from "mongoose";
import os from "os";
import connectToDatabase from "../../../lib/db";

export async function GET() {
  const start = performance.now(); // Start timer for latency

  try {
    // 1. Database Connection & Latency Check
    await connectToDatabase();
    
    // Perform a lightweight operation to check read/write responsiveness
    // (checking connection state isn't enough; we need to see if it responds)
    const dbStart = performance.now();
    await mongoose.connection.db.admin().ping();
    const dbEnd = performance.now();
    const dbLatency = (dbEnd - dbStart).toFixed(2) + "ms";

    // 2. System Vitals
    const usedMemory = process.memoryUsage();
    const formatMemory = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

    // 3. Construct the Advanced Payload
    const healthData = {
      status: "healthy", // Global status
      timestamp: new Date().toISOString(),
      
      application: {
        environment: process.env.NODE_ENV,
        node_version: process.version,
        pid: process.pid,
        uptime: formatUptime(process.uptime()),
      },
      
      database: {
        status: getDbStatus(mongoose.connection.readyState),
        latency: dbLatency, // CRITICAL: How fast is your DB?
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      },
      
      system: {
        platform: process.platform,
        arch: os.arch(),
        cpu_cores: os.cpus().length,
        // Load Average (1m, 5m, 15m) - specific to Unix/Linux systems
        load_avg: os.loadavg(), 
        memory: {
          rss: formatMemory(usedMemory.rss), // Resident Set Size (Total physical memory)
          heap_total: formatMemory(usedMemory.heapTotal), // V8's Total Heap
          heap_used: formatMemory(usedMemory.heapUsed), // V8's Used Heap
        }
      }
    };

    // 4. Return with No-Cache Headers
    return NextResponse.json(healthData, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Response-Time": `${(performance.now() - start).toFixed(2)}ms` // Total API Latency
      }
    });

  } catch (error) {
    console.error("Health Check Failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
        database: { status: "disconnected" }
      },
      { status: 503 }
    );
  }
}

// Helper: Convert mongoose readyState number to string
function getDbStatus(code) {
  const statusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
    99: "uninitialized",
  };
  return statusMap[code] || "unknown";
}

// Helper: Format uptime from seconds to HH:MM:SS
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}