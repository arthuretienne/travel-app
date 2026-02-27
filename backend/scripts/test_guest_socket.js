
import { io } from 'socket.io-client';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
const SOCKET_URL = 'http://localhost:3001';

// Invitation token from the seed script output (or I can pass it as arg)
// For now I'll hardcode the one I got: a8b18a333b7b80f0bcba7648df41975fd7accb1b934023a1b795d787a4a20f26
const INVITATION_TOKEN = process.argv[2] || 'a8b18a333b7b80f0bcba7648df41975fd7accb1b934023a1b795d787a4a20f26';

async function main() {
    console.log('Testing guest chat flow...');

    // 1. Accept Invitation
    console.log(`Accepting invitation: ${INVITATION_TOKEN}`);
    const acceptRes = await fetch(`${API_URL}/api/invitations/${INVITATION_TOKEN}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestName: 'Socket Test Guest', guestEmail: 'socket@guest.com' }),
    });

    if (!acceptRes.ok) {
        const text = await acceptRes.text();
        console.error('Failed to accept invitation:', acceptRes.status, text);
        process.exit(1);
    }

    const responseBody = await acceptRes.json();
    console.log('Invitation accepted:', responseBody);

    // Handle both { data: { ... } } and direct object responses
    const data = responseBody.data || responseBody;
    const member = data.member || data;
    const trip = data.trip;

    const sessionToken = member?.sessionToken;
    const tripId = trip?.id || member?.tripId;
    const memberId = member?.id;

    if (!sessionToken) {
        console.error('No session token returned!');
        process.exit(1);
    }

    // 2. Connect to Socket
    console.log('Connecting to socket with session token:', sessionToken);
    const socket = io(SOCKET_URL, {
        auth: {
            token: `guest:${sessionToken}`,
        },
    });

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);

        // 3. Join Trip
        console.log('Joining trip:', tripId);
        socket.emit('join-trip', tripId);
    });

    socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
        process.exit(1);
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });

    // 4. Listen for messages
    socket.on('new-message', (msg) => {
        console.log('Received new message:', msg);
        if (msg.content === 'Hello from script!') {
            console.log('✅ Verification SUCCESS: Message received back!');
            socket.disconnect();
            process.exit(0);
        }
    });

    // Wait a bit then send message
    setTimeout(() => {
        console.log('Sending message...');
        socket.emit('send-message', {
            tripId,
            content: 'Hello from script!',
        });
    }, 1000);

    // Timeout
    setTimeout(() => {
        console.error('❌ Verification TIMEOUT: Did not receive message back.');
        socket.disconnect();
        process.exit(1);
    }, 5000);
}

main().catch(console.error);
