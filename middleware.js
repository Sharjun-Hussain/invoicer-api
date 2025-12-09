import { NextResponse } from "next/server";


export function middleware(request) {
  // 1. Get the origin from the request
  const origin = request.headers.get("origin");

  // 2. Define ALL allowed origins
  const allowedOrigins = [
    "https://invoicer.inzeedo.com", // Production Website
    "http://localhost:8080",        // Local Development
    "capacitor://localhost",        // iOS App (Standard Capacitor)
    "ionic://localhost",            // iOS App (Alternative)
    "http://localhost",             // Android App (Standard Capacitor)
    "https://localhost",            // Android App (If configured with https)
  ];

  // 3. Prepare the response
  const response = NextResponse.next();

  // 4. Check if the incoming origin is in our allowed list
  if (origin && allowedOrigins.includes(origin)) {
    
    // Allow the specific origin that called us
    response.headers.set("Access-Control-Allow-Origin", origin);
    
    // Standard CORS headers
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version"
    );
  }

  // 5. Handle "Preflight" (OPTIONS) requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { 
      status: 200, 
      headers: response.headers 
    });
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};