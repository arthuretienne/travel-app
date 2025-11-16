// backend/src/routes/searches.js
import express from 'express';
import prisma from '../db/prisma.js';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/searches
 * Sauvegarde une recherche avec ses recommandations
 * Protected route
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { searchParams, recommendations } = req.body;

    if (!searchParams) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'searchParams is required'
      });
    }

    // Create search with recommendations
    const search = await prisma.search.create({
      data: {
        userId: req.user.id,
        searchParams,
        recommendations: {
          create: recommendations?.map(rec => ({
            city: rec.city,
            country: rec.country,
            iataCode: rec.iataCode,
            startDate: new Date(rec.slot.startDate),
            endDate: new Date(rec.slot.endDate),
            duration: rec.slot.duration,
            flightPrice: rec.flightPrice || 0,
            hotelPrice: rec.hotelPrice || 0,
            totalPrice: rec.totalPrice,
            currency: rec.currency || 'EUR',
            score: rec.score,
            matchReason: rec.matchReason,
            seasonReason: rec.seasonReason,
            photoUrl: rec.photoUrl,
            photoCredit: rec.photoCredit,
            fullData: rec,
          })) || [],
        },
      },
      include: {
        recommendations: true,
      },
    });

    console.log('✅ Search saved:', search.id, `(${recommendations?.length || 0} recommendations)`);
    res.json({ search });
  } catch (error) {
    console.error('Save search error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/searches/history
 * Récupère l'historique des recherches de l'utilisateur
 * Protected route
 */
router.get('/history', authenticateUser, async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const searches = await prisma.search.findMany({
      where: { userId: req.user.id },
      include: {
        recommendations: {
          orderBy: { score: 'desc' },
          take: 3, // Top 3 recommendations per search
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.search.count({
      where: { userId: req.user.id },
    });

    console.log('✅ Search history fetched:', searches.length, 'searches');
    res.json({
      searches,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/searches/:id
 * Récupère une recherche spécifique avec toutes ses recommandations
 * Protected route
 */
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const search = await prisma.search.findUnique({
      where: { id },
      include: {
        recommendations: {
          orderBy: { score: 'desc' },
        },
      },
    });

    if (!search) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Search not found'
      });
    }

    // Verify ownership
    if (search.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this search'
      });
    }

    console.log('✅ Search fetched:', search.id);
    res.json({ search });
  } catch (error) {
    console.error('Get search error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/trips/save
 * Sauvegarde un voyage dans la wishlist
 * Protected route
 */
router.post('/trips/save', authenticateUser, async (req, res) => {
  try {
    const { city, country, startDate, endDate, status, notes, tripData } = req.body;

    if (!city || !country || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'city, country, startDate, and endDate are required'
      });
    }

    const savedTrip = await prisma.savedTrip.create({
      data: {
        userId: req.user.id,
        city,
        country,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'wishlist',
        notes,
        tripData: tripData || {},
      },
    });

    console.log('✅ Trip saved:', savedTrip.city, savedTrip.country);
    res.json({ savedTrip });
  } catch (error) {
    console.error('Save trip error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/trips/saved
 * Récupère les voyages sauvegardés
 * Protected route
 */
router.get('/trips/saved', authenticateUser, async (req, res) => {
  try {
    const { status } = req.query;

    const where = {
      userId: req.user.id,
      ...(status && { status }),
    };

    const savedTrips = await prisma.savedTrip.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    console.log('✅ Saved trips fetched:', savedTrips.length, 'trips');
    res.json({ savedTrips });
  } catch (error) {
    console.error('Get saved trips error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * PUT /api/trips/:id
 * Met à jour un voyage sauvegardé
 * Protected route
 */
router.put('/trips/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, tripData } = req.body;

    // Verify ownership
    const existingTrip = await prisma.savedTrip.findUnique({
      where: { id },
    });

    if (!existingTrip) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Trip not found'
      });
    }

    if (existingTrip.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this trip'
      });
    }

    const updatedTrip = await prisma.savedTrip.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(tripData && { tripData }),
      },
    });

    console.log('✅ Trip updated:', updatedTrip.id);
    res.json({ savedTrip: updatedTrip });
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/trips/:id
 * Supprime un voyage sauvegardé
 * Protected route
 */
router.delete('/trips/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existingTrip = await prisma.savedTrip.findUnique({
      where: { id },
    });

    if (!existingTrip) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Trip not found'
      });
    }

    if (existingTrip.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this trip'
      });
    }

    await prisma.savedTrip.delete({
      where: { id },
    });

    console.log('✅ Trip deleted:', id);
    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
