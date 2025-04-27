const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Create new user
  const user = await User.create({
    name,
    email,
    password,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Login user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  // Check if user exists and password matches
  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.avatar = req.body.avatar || user.avatar;
    
    // Update password if provided
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Add address to user profile
// @route   POST /api/users/address
// @access  Private
const addUserAddress = asyncHandler(async (req, res) => {
  const { street, city, state, zipCode, country, isDefault } = req.body;

  const user = await User.findById(req.user._id);

  if (user) {
    const address = {
      street,
      city,
      state,
      zipCode,
      country,
      isDefault: isDefault || false,
    };

    // If this address is default, set other addresses to non-default
    if (address.isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    // Add new address
    user.addresses.push(address);

    // If this is the first address, make it default
    if (user.addresses.length === 1) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(201).json(user.addresses);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user address
// @route   PUT /api/users/address/:id
// @access  Private
const updateUserAddress = asyncHandler(async (req, res) => {
  const { street, city, state, zipCode, country, isDefault } = req.body;

  const user = await User.findById(req.user._id);

  if (user) {
    const addressIndex = user.addresses.findIndex(
      a => a._id.toString() === req.params.id
    );

    if (addressIndex >= 0) {
      // Update address fields
      if (street) user.addresses[addressIndex].street = street;
      if (city) user.addresses[addressIndex].city = city;
      if (state) user.addresses[addressIndex].state = state;
      if (zipCode) user.addresses[addressIndex].zipCode = zipCode;
      if (country) user.addresses[addressIndex].country = country;

      // Handle default address
      if (isDefault !== undefined) {
        // If setting to default, update all other addresses
        if (isDefault) {
          user.addresses.forEach((addr, idx) => {
            user.addresses[idx].isDefault = idx === addressIndex;
          });
        } else {
          // If unsetting default, ensure there's still a default address
          user.addresses[addressIndex].isDefault = isDefault;
          
          // Check if any address is set to default
          const hasDefault = user.addresses.some(addr => addr.isDefault);
          
          // If no default address, set the first one as default
          if (!hasDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
          }
        }
      }

      await user.save();
      res.json(user.addresses);
    } else {
      res.status(404);
      throw new Error('Address not found');
    }
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Delete user address
// @route   DELETE /api/users/address/:id
// @access  Private
const deleteUserAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    const address = user.addresses.id(req.params.id);

    if (address) {
      const wasDefault = address.isDefault;
      
      // Remove the address
      address.remove();
      
      // If removed address was default, set another as default
      if (wasDefault && user.addresses.length > 0) {
        user.addresses[0].isDefault = true;
      }

      await user.save();
      res.json(user.addresses);
    } else {
      res.status(404);
      throw new Error('Address not found');
    }
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Add product to wishlist
// @route   POST /api/users/wishlist
// @access  Private
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  const user = await User.findById(req.user._id);

  if (user) {
    // Check if product already in wishlist
    if (user.wishlist.includes(productId)) {
      res.status(400);
      throw new Error('Product already in wishlist');
    }

    user.wishlist.push(productId);
    await user.save();

    res.status(201).json(user.wishlist);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Remove product from wishlist
// @route   DELETE /api/users/wishlist/:productId
// @access  Private
const removeFromWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.wishlist = user.wishlist.filter(
      id => id.toString() !== req.params.productId
    );
    
    await user.save();
    res.json(user.wishlist);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get user wishlist
// @route   GET /api/users/wishlist
// @access  Private
const getUserWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist');

  if (user) {
    res.json(user.wishlist);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// ADMIN CONTROLLERS

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;

  const count = await User.countDocuments({});
  const users = await User.find({})
    .select('-password')
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .sort({ createdAt: -1 });

  res.json({
    users,
    page,
    pages: Math.ceil(count / pageSize),
    totalUsers: count,
  });
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;
    user.isEmailVerified = req.body.isEmailVerified ?? user.isEmailVerified;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isEmailVerified: updatedUser.isEmailVerified,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    await user.remove();
    res.json({ message: 'User removed' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = {
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
};