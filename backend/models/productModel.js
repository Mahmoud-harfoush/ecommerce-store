const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const variantSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  colorCode: {
    type: String,
  },
  size: {
    type: String,
  },
  sku: {
    type: String,
  },
  price: {
    type: Number,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
  },
  images: [String],
});

const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    features: [String],
    specifications: {
      type: Map,
      of: String,
    },
    variants: [variantSchema],
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    images: [String],
    reviews: [reviewSchema],
    rating: {
      type: Number,
      required: true,
      default: 0,
    },
    numReviews: {
      type: Number,
      required: true,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    newArrival: {
      type: Boolean,
      default: false,
    },
    bestSeller: {
      type: Boolean,
      default: false,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to auto-generate slug if not provided
productSchema.pre('save', function (next) {
  if (!this.isModified('name')) {
    next();
    return;
  }

  this.slug = this.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  next();
});

// Add virtual for discounted price
productSchema.virtual('discountedPrice').get(function () {
  if (this.discount > 0) {
    return this.price - (this.price * this.discount) / 100;
  }
  return this.price;
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;