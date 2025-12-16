import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/db';
import AppVersion from '../../../models/AppVersion';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const clientVersion = searchParams.get('current');

    // Fetch the latest version
    const latestRelease = await AppVersion.findOne().sort({ createdAt: -1 });

    if (!latestRelease) {
      return NextResponse.json({ 
        success: true, 
        message: "No version data found",
        updateAvailable: false 
      });
    }

    // Check version logic
    const updateAvailable = clientVersion ? (latestRelease.version !== clientVersion) : false;

    return NextResponse.json({
      success: true,
      data: {
        latestVersion: latestRelease.version,
        currentClientVersion: clientVersion || "unknown",
        updateAvailable: updateAvailable,
        forceUpdate: latestRelease.forceUpdate,
        changelog: latestRelease.changelog,
        
        // --- LINKS ---
        downloadUrl: latestRelease.downloadUrl,
        backupDownloadUrl: latestRelease.backupDownloadUrl || "" // Return empty string if null
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Version Check Error:", error);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}

// Admin Route to POST new versions
export async function POST(req) {
  try {
    const body = await req.json(); // Body should include { version, downloadUrl, backupDownloadUrl, ... }
    await connectToDatabase();
    
    const newVersion = await AppVersion.create(body);
    
    return NextResponse.json({ success: true, data: newVersion });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
