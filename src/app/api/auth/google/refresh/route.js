// Google OAuth Token Refresh Endpoint
// Refreshes access token using refresh token

import { NextResponse } from 'next/server';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '630293541673-gsgklutdld4brbdfgtgb1n8fnu7i6ckn.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(req) {
    try {
        const { refresh_token } = await req.json();

        if (!refresh_token) {
            return NextResponse.json(
                { error: 'Missing refresh_token' },
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

        // Refresh access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                refresh_token,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'refresh_token'
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('Token refresh failed:', tokenData);
            return NextResponse.json(
                { error: tokenData.error_description || tokenData.error || 'Token refresh failed' },
                { status: tokenResponse.status }
            );
        }

        // Return new access token
        return NextResponse.json({
            access_token: tokenData.access_token,
            expires_in: tokenData.expires_in
        });

    } catch (error) {
        console.error('OAuth token refresh error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
