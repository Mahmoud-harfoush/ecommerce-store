const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.post('/', registerUser);
router.post('/login', loginUser);

// Protected routes - User
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.route('/address')
  .post(protect, addUserAddress);

router.route('/address/:id')
  .put(protect, updateUserAddress)
  .delete(protect, deleteUserAddress);

router.route('/wishlist')
  .get(protect, getUserWishlist)
  .post(protect, addToWishlist);

router.route('/wishlist/:productId')
  .delete(protect, removeFromWishlist);

// Protected routes - Admin
router.route('/')
  .get(protect, admin, getUsers);

router.route('/:id')
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

module.exports = router;