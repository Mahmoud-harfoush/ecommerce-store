const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
const asyncHandler = require('express-async-handler');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({})
    .sort({ order: 1, name: 1 })
    .populate('subcategories');
  
  res.json(categories);
});

// @desc    Get top level categories (no parent)
// @route   GET /api/categories/main
// @access  Public
const getMainCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ parent: null })
    .sort({ order: 1, name: 1 })
    .populate('subcategories');
  
  res.json(categories);
});

// @desc    Get category by ID
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).populate('subcategories');
  
  if (category) {
    res.json(category);
  } else {
    res.status(404);
    throw new Error('Category not found');
  }
});

// @desc    Get category by slug
// @route   GET /api/categories/slug/:slug
// @access  Public
const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug })
    .populate('subcategories');
  
  if (category) {
    res.json(category);
  } else {
    res.status(404);
    throw new Error('Category not found');
  }
});

// @desc    Get products by category
// @route   GET /api/categories/:id/products
// @access  Public
const getProductsByCategory = asyncHandler(async (req, res) => {
  const pageSize = 12;
  const page = Number(req.query.page) || 1;
  
  const category = await Category.findById(req.params.id);
  
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }
  
  // Get all subcategory IDs
  const subcategories = await Category.find({ parent: category._id });
  const categoryIds = [category._id, ...subcategories.map(subcat => subcat._id)];
  
  // Filter options
  const filters = { category: { $in: categoryIds } };
  
  // Price range filter
  if (req.query.minPrice || req.query.maxPrice) {
    filters.price = {};
    if (req.query.minPrice) {
      filters.price.$gte = Number(req.query.minPrice);
    }
    if (req.query.maxPrice) {
      filters.price.$lte = Number(req.query.maxPrice);
    }
  }
  
  // Brand filter
  if (req.query.brands) {
    const brands = req.query.brands.split(',');
    filters.brand = { $in: brands };
  }
  
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
  
  const count = await Product.countDocuments(filters);
  const products = await Product.find(filters)
    .sort(sortOption)
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .populate('category', 'name slug');
  
  // Get unique brands in this category for filtering
  const brands = await Product.distinct('brand', { category: { $in: categoryIds } });
  
  // Get price range in this category
  const priceStats = await Product.aggregate([
    { $match: { category: { $in: categoryIds } } },
    {
      $group: {
        _id: null,
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    }
  ]);
  
  const priceRange = priceStats.length > 0
    ? { min: priceStats[0].minPrice, max: priceStats[0].maxPrice }
    : { min: 0, max: 0 };
  
  res.json({
    products,
    page,
    pages: Math.ceil(count / pageSize),
    totalProducts: count,
    filters: {
      brands,
      priceRange
    },
    category
  });
});

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, parent, image, icon, featured, order } = req.body;
  
  const category = new Category({
    name,
    description: description || '',
    parent: parent || null,
    image: image || '',
    icon: icon || '',
    featured: featured || false,
    order: order || 0
  });
  
  const createdCategory = await category.save();
  res.status(201).json(createdCategory);
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  const { name, description, parent, image, icon, featured, order } = req.body;
  
  const category = await Category.findById(req.params.id);
  
  if (category) {
    // Prevent category from being its own parent
    if (parent && parent.toString() === category._id.toString()) {
      res.status(400);
      throw new Error('Category cannot be its own parent');
    }
    
    // Check for circular references
    if (parent) {
      let parentCategory = await Category.findById(parent);
      let parentId = parentCategory ? parentCategory.parent : null;
      
      while (parentId) {
        if (parentId.toString() === category._id.toString()) {
          res.status(400);
          throw new Error('Circular reference detected in category hierarchy');
        }
        
        const nextParent = await Category.findById(parentId);
        parentId = nextParent ? nextParent.parent : null;
      }
    }
    
    category.name = name || category.name;
    category.description = description !== undefined ? description : category.description;
    category.parent = parent !== undefined ? parent : category.parent;
    category.image = image !== undefined ? image : category.image;
    category.icon = icon !== undefined ? icon : category.icon;
    category.featured = featured !== undefined ? featured : category.featured;
    category.order = order !== undefined ? order : category.order;
    
    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } else {
    res.status(404);
    throw new Error('Category not found');
  }
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  
  if (category) {
    // Check if category has subcategories
    const hasSubcategories = await Category.exists({ parent: category._id });
    
    if (hasSubcategories) {
      res.status(400);
      throw new Error('Cannot delete category with subcategories. Please move or delete subcategories first.');
    }
    
    // Check if category has products
    const hasProducts = await Product.exists({ category: category._id });
    
    if (hasProducts) {
      res.status(400);
      throw new Error('Cannot delete category with associated products. Please move or delete products first.');
    }
    
    await category.remove();
    res.json({ message: 'Category removed' });
  } else {
    res.status(404);
    throw new Error('Category not found');
  }
});

// @desc    Get featured categories
// @route   GET /api/categories/featured
// @access  Public
const getFeaturedCategories = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 6;
  
  const categories = await Category.find({ featured: true })
    .sort({ order: 1, name: 1 })
    .limit(limit);
  
  // Get product count for each category
  const categoryIds = categories.map(cat => cat._id);
  const productCounts = await Product.aggregate([
    { $match: { category: { $in: categoryIds } } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  
  // Create a map of category ID to product count
  const countMap = {};
  productCounts.forEach(item => {
    countMap[item._id] = item.count;
  });
  
  // Add product count to each category
  const categoriesWithCount = categories.map(category => {
    const categoryObj = category.toObject();
    categoryObj.productCount = countMap[category._id] || 0;
    return categoryObj;
  });
  
  res.json(categoriesWithCount);
});

module.exports = {
  getCategories,
  getMainCategories,
  getCategoryById,
  getCategoryBySlug,
  getProductsByCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getFeaturedCategories,
};