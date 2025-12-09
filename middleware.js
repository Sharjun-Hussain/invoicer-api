import { NextResponse } from "next/server";

export function middleware(request) {
  // 1. Define the specific allowed origin
  const ALLOWED_ORIGIN = "https://invoicer.inzeedo.com";
  
  // Optional: Add localhost for development, otherwise you can't test your own code!
  // Remove these lines if you want strict production-only locking.
  const DEV_ORIGINS = ["http://localhost:8080", "http://localhost:5173"]; 
  
  // 2. Get the origin from the incoming request
  const origin = request.headers.get("origin");
  const response = NextResponse.next();

  // 3. Logic: Check if the origin matches your allowed domain
  if (origin && (origin === ALLOWED_ORIGIN || DEV_ORIGINS.includes(origin))) {
    
    // Set the strict origin (Not '*')
    response.headers.set("Access-Control-Allow-Origin", origin);
    
    // Standard CORS headers
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version"
    );
  }

  // 4. Handle the "Preflight" (OPTIONS) request instantly
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { 
      status: 200, 
      headers: response.headers 
    });
  }

  return response;
}

// 5. Apply this middleware only to API routes
export const config = {
  matcher: '/api/:path*',
};