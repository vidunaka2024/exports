// backend/services/searchService.js
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import logger from '../utils/logger.js';

class SearchService {
  // Advanced search for ads
  async searchAds(searchParams) {
    try {
      const {
        query,
        category,
        type,
        location,
        minPrice,
        maxPrice,
        status,
        sortBy = 'relevance',
        page = 1,
        limit = 20,
      } = searchParams;

      // Build query
      const searchQuery = {};

      // Text search with relevance scoring
      if (query) {
        searchQuery.$text = { $search: query };
      }

      // Filters
      if (category) {
        if (Array.isArray(category)) {
          searchQuery.category = { $in: category };
        } else {
          searchQuery.category = category;
        }
      }

      if (type) searchQuery.type = type;
      if (location) searchQuery.location = location;
      if (status) searchQuery.status = status;

      // Price range
      if (minPrice || maxPrice) {
        searchQuery.minPrice = {};
        if (minPrice) searchQuery.minPrice.$gte = parseFloat(minPrice);
        if (maxPrice) searchQuery.minPrice.$lte = parseFloat(maxPrice);
      }

      // Sorting
      let sort = {};
      switch (sortBy) {
        case 'relevance':
          if (query) {
            sort = { score: { $meta: 'textScore' } };
          } else {
            sort = { createdAt: -1 };
          }
          break;
        case 'price_low':
          sort = { minPrice: 1 };
          break;
        case 'price_high':
          sort = { minPrice: -1 };
          break;
        case 'newest':
          sort = { createdAt: -1 };
          break;
        case 'oldest':
          sort = { createdAt: 1 };
          break;
        default:
          sort = { createdAt: -1 };
      }

      const skip = (page - 1) * limit;

      // Execute search
      let queryBuilder = Ad.find(searchQuery);

      if (query && sortBy === 'relevance') {
        queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
      }

      const [ads, total] = await Promise.all([
        queryBuilder
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('user', 'companyName name')
          .lean(),
        Ad.countDocuments(searchQuery),
      ]);

      // Get facets for filtering
      const facets = await this.getSearchFacets(searchQuery);

      return {
        ads,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        facets,
      };
    } catch (error) {
      logger.error('Error searching ads:', error);
      throw error;
    }
  }

  // Get search facets (for filter UI)
  async getSearchFacets(baseQuery) {
    try {
      const [categories, locations, types] = await Promise.all([
        Ad.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ]),
        Ad.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$location', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ]),
        Ad.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]),
      ]);

      return {
        categories: categories.map((c) => ({ value: c._id, count: c.count })),
        locations: locations.map((l) => ({ value: l._id, count: l.count })),
        types: types.map((t) => ({ value: t._id, count: t.count })),
      };
    } catch (error) {
      logger.error('Error getting search facets:', error);
      return { categories: [], locations: [], types: [] };
    }
  }

  // Get search suggestions
  async getSuggestions(query, type = 'ad') {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const regex = new RegExp(query, 'i');

      if (type === 'ad') {
        const suggestions = await Ad.find({
          $or: [{ title: regex }, { category: regex }],
          status: 'approved',
        })
          .select('title category')
          .limit(10)
          .lean();

        return suggestions.map((s) => ({
          text: s.title,
          category: s.category,
          type: 'ad',
        }));
      } else if (type === 'user') {
        const suggestions = await User.find({
          $or: [{ companyName: regex }, { name: regex }],
        })
          .select('companyName name')
          .limit(10)
          .lean();

        return suggestions.map((s) => ({
          text: s.companyName || s.name,
          type: 'user',
        }));
      }

      return [];
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      return [];
    }
  }

  // Global search across all entities
  async globalSearch(query, page = 1, limit = 20) {
    try {
      const regex = new RegExp(query, 'i');

      const [ads, users, orders] = await Promise.all([
        Ad.find({ $text: { $search: query } })
          .select('title category images')
          .limit(5)
          .lean(),
        User.find({
          $or: [{ companyName: regex }, { name: regex }],
        })
          .select('companyName name email profilePhoto')
          .limit(5)
          .lean(),
        Order.find({ _id: regex })
          .populate('ad', 'title')
          .limit(5)
          .lean(),
      ]);

      return {
        ads: ads.map((a) => ({ ...a, _type: 'ad' })),
        users: users.map((u) => ({ ...u, _type: 'user' })),
        orders: orders.map((o) => ({ ...o, _type: 'order' })),
        total: ads.length + users.length + orders.length,
      };
    } catch (error) {
      logger.error('Error performing global search:', error);
      throw error;
    }
  }
}

export default new SearchService();
