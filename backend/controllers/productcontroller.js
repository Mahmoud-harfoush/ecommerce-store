const Product = require('../models/productModel');
const asyncHandler = require('express-async-handler');

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const pageSize = 12;
  const page = Number(req.query.page) || 1;
  
  const keyword = req.query.keyword
    ? {
        name: {
          $regex: req.query.keyword,
          $options: 'i',
        },
      }
    : {};
  
  // Filter by category
  const category = req.query.category
    ? { category: req.query.category }
    : {};
  
  // Filter by price range
  const priceFilter = {};
  if (req.query.minPrice) {
    priceFilter.price = { ...priceFilter.price, $gte: Number(req.query.minPrice) };
  }
  if (req.query.maxPrice) {
    priceFilter.price = { ...priceFilter.price, $lte: Number(req.query.maxPrice) };
  }
  
  // Filter by brand
  const brand = req.query.brand
    ? { brand: req.query.brand }
    : {};
  
  // Filter by rating
  const ratingFilter = req.query.rating
    ? { rating: { $gte: Number(req.query.rating) } }
    : {};
  
  // Sorting
  let sortOption = {};
  if (req.query.sort) {
    switch (req.query.sort) {
      case 'price-asc':
        sortOption = { price: 1 };
        break;
      case 'price-desc':
        sortOption = { price: -1 };
        break;
      case 'rating':
        sortOption = { rating: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }
  } else {
    sortOption = { createdAt: -1 };
  }
  
  const filters = {
    ...keyword,
    ...category,
    ...priceFilter,
    ...brand,
    ...ratingFilter,
  };
  
  const count = await Product.countDocuments(filters);
  const products = await Product.find(filters)
    .sort(sortOption)
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .populate('category', 'name slug');
  
  res.json({
    products,
    page,
    pages: Math.ceil(count / pageSize),
    totalProducts: count,
  });
});

// @desc    Fetch a product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name slug')
    .populate({
      path: 'reviews',
      populate: {
        path: 'user',
        select: 'name avatar',
      },
    });
  
  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Fetch a product by slug
// @route   GET /api/products/slug/:slug
// @access  Public
const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug })
    .populate('category', 'name slug')
    .populate({
      path: 'reviews',
      populate: {
        path: 'user',
        select: 'name avatar',
      },
    });
  
  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 8;
  
  const products = await Product.find({ featured: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('category', 'name slug');
  
  res.json(products);
});

// @desc    Get new arrivals
// @route   GET /api/products/new-arrivals
// @access  Public
const getNewArrivals = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 8;
  
  const products = await Product.find({ newArrival: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('category', 'name slug');
  
  res.json(products);
});

// @desc    Get best sellers
// @route   GET /api/products/best-sellers
// @access  Public
const getBestSellers = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 8;
  
  const products = await Product.find({ bestSeller: true })
    .sort({ rating: -1 })
    .limit(limit)
    .populate('category', 'name slug');
  
  res.json(products);
});

// @desc    Get related products
// @route   GET /api/products/:id/related
// @access  Public
const getRelatedProducts = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 4;
  
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  
  const relatedProducts = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
  })
    .limit(limit)
    .populate('category', 'name slug');
  
  res.json(relatedProducts);
});

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    brand,
    category,
    price,
    stock,
    images,
    features,
    specifications,
    variants,
  } = req.body;
  
  const product = new Product({
    name,
    description,
    brand,
    category,
    price,
    stock,
    images: images || [],
    features: features || [],
    specifications: specifications || {},
    variants: variants || [],
    user: req.user._id,
  });
  
  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    brand,
    category,
    price,
    discount,
    stock,
    images,
    features,
    specifications,
    variants,
    featured,
    newArrival,
    bestSeller,
  } = req.body;
  
  const product = await Product.findById(req.params.id);
  
  if (product) {
    product.name = name || product.name;
    product.description = description || product.description;
    product.brand = brand || product.brand;
    product.category = category || product.category;
    product.price = price !== undefined ? price : product.price;
    product.discount = discount !== undefined ? discount : product.discount;
    product.stock = stock !== undefined ? stock : product.stock;
    if (images) product.images = images;
    if (features) product.features = features;
    if (specifications) product.specifications = specifications;
    if (variants) product.variants = variants;
    product.featured = featured !== undefined ? featured : product.featured;
    product.newArrival = newArrival !== undefined ? newArrival : product.newArrival;
    product.bestSeller = bestSeller !== undefined ? bestSeller : product.bestSeller;
    
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  
  if (product) {
    await product.remove();
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

module.exports = {
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
};