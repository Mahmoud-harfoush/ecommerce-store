const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  getNewArrivals,
  getBestSellers,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.route('/').get(getProducts);
router.route('/featured').get(getFeaturedProducts);
router.route('/new-arrivals').get(getNewArrivals);
router.route('/best-sellers').get(getBestSellers);
router.route('/slug/:slug').get(getProductBySlug);
router.route('/:id').get(getProductById);
router.route('/:id/related').get(getRelatedProducts);

// Protected routes
router.route('/').post(protect, admin, createProduct);
router.route('/:id').put(protect, admin, updateProduct).delete(protect, admin, deleteProduct);

module.exports = router;