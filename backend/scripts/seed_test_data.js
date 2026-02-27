
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
console.log('Prisma keys:', Object.keys(prisma));


async function main() {
    console.log('Seeding test data...');

    // Create or find a test user
    const user = await prisma.user.upsert({
        where: { email: 'testowner@example.com' },
        update: {},
        create: {
            email: 'testowner@example.com',
            clerkId: 'test_clerk_id_' + Date.now(),
            firstName: 'Test',
            lastName: 'Owner',
        },
    });

    // Create a trip
    const trip = await prisma.collaborativeTrip.create({
        data: {
            name: 'Guest Chat Test Trip',
            creatorId: user.id,
            status: 'PLANNING',
        },
    });

    // Create an invitation
    const token = crypto.randomBytes(32).toString('hex');
    const invitation = await prisma.tripInvitation.create({
        data: {
            token,
            email: 'guest@example.com',
            tripId: trip.id,
            status: 'pending',
            invitedBy: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });

    console.log('Test data created!');
    console.log('Trip ID:', trip.id);
    console.log('Invitation Token:', token);
    console.log('Invitation Link:', `http://localhost:5174/invite/${token}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
