// Google OAuth Token Exchange Endpoint
// Exchanges authorization code for access token securely

import { NextResponse } from 'next/server';

// Get from environment variable for security
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(req) {
    try {
        const { code, redirect_uri, server_auth_code } = await req.json();

        // Support both web flow (code) and native flow (server_auth_code)
        const authCode = server_auth_code || code;

        if (!authCode) {
            return NextResponse.json(
                { error: 'Missing code or server_auth_code' },
                { status: 400 }
            );
        }

        if (!CLIENT_SECRET) {
            console.error('GOOGLE_CLIENT_SECRET environment variable is not set!');
            return NextResponse.json(
                { error: 'Server configuration error. Please contact administrator.' },
                { status: 500 }
            );
        }

        // Exchange code for access token
        const requestBody = {
            code: authCode,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code'
        };

        // Only add redirect_uri for web flow
        if (!server_auth_code && redirect_uri) {
            requestBody.redirect_uri = redirect_uri;
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('Token exchange failed:', tokenData);
            return NextResponse.json(
                { error: tokenData.error_description || tokenData.error || 'Token exchange failed' },
                { status: tokenResponse.status }
            );
        }

        // Return tokens to client
        return NextResponse.json({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
            id_token: tokenData.id_token // Important for OIDC
        });

    } catch (error) {
        console.error('OAuth token exchange error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
