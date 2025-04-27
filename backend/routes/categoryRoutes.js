const express = require('express');
const router = express.Router();
const {
  getCategories,
  getMainCategories,
  getCategoryById,
  getCategoryBySlug,
  getProductsByCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getFeaturedCategories,
} = require('../controllers/categoryController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.route('/').get(getCategories);
router.route('/main').get(getMainCategories);
router.route('/featured').get(getFeaturedCategories);
router.route('/slug/:slug').get(getCategoryBySlug);
router.route('/:id').get(getCategoryById);
router.route('/:id/products').get(getProductsByCategory);

// Protected routes
router.route('/').post(protect, admin, createCategory);
router.route('/:id').put(protect, admin, updateCategory).delete(protect, admin, deleteCategory);

module.exports = router;