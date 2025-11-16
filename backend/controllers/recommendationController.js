// backend/controllers/recommendationController.js
import recommendationService from '../services/recommendationService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Get recommended ads for user
export const getRecommendedAds = asyncHandler(async (req, res) => {
  const { limit = 10, category, location } = req.query;

  const recommendations = await recommendationService.getRecommendedAds(
    req.user.id,
    req.user.role,
    { limit: parseInt(limit), category, location }
  );

  res.json(recommendations);
});

// Get similar ads
export const getSimilarAds = asyncHandler(async (req, res) => {
  const { adId } = req.params;
  const { limit = 5 } = req.query;

  const similarAds = await recommendationService.getSimilarAds(
    adId,
    parseInt(limit)
  );

  res.json(similarAds);
});

// Get trending ads
export const getTrendingAds = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const trendingAds = await recommendationService.getTrendingAds(
    parseInt(limit)
  );

  res.json(trendingAds);
});

// Get recommended users to connect with
export const getRecommendedUsers = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const recommendedUsers = await recommendationService.getRecommendedUsers(
    req.user.id,
    req.user.role,
    parseInt(limit)
  );

  res.json(recommendedUsers);
});
