const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load models
const User = require('./models/userModel');
const Product = require('./models/productModel');
const Category = require('./models/categoryModel');
const Order = require('./models/orderModel');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error(`MongoDB connection error: ${err}`);
    process.exit(1);
  });

// Sample data
const users = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: bcrypt.hashSync('123456', 10),
    role: 'admin',
    isEmailVerified: true,
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: bcrypt.hashSync('123456', 10),
    role: 'customer',
    isEmailVerified: true,
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: bcrypt.hashSync('123456', 10),
    role: 'customer',
    isEmailVerified: true,
  },
];

const categories = [
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and gadgets',
    image: '/images/categories/electronics.jpg',
    featured: true,
    order: 1,
  },
  {
    name: 'Clothing',
    slug: 'clothing',
    description: 'Fashionable clothing items',
    image: '/images/categories/clothing.jpg',
    featured: true,
    order: 2,
  },
  {
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    description: 'Products for your home',
    image: '/images/categories/home.jpg',
    featured: true,
    order: 3,
  },
  {
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    description: 'Sports equipment and outdoor gear',
    image: '/images/categories/sports.jpg',
    featured: true,
    order: 4,
  },
];

// Import data function
const importData = async () => {
  try {
    // Clear existing data
    await Order.deleteMany();
    await Product.deleteMany();
    await User.deleteMany();
    await Category.deleteMany();

    // Import users
    const createdUsers = await User.insertMany(users);
    const adminUser = createdUsers[0]._id;

    // Import categories
    const createdCategories = await Category.insertMany(categories);
    
    // Create subcategories
    const electronicsSubcategories = [
      {
        name: 'Smartphones',
        slug: 'smartphones',
        description: 'Mobile phones and accessories',
        parent: createdCategories[0]._id,
        image: '/images/categories/smartphones.jpg',
      },
      {
        name: 'Laptops',
        slug: 'laptops',
        description: 'Laptops and accessories',
        parent: createdCategories[0]._id,
        image: '/images/categories/laptops.jpg',
      },
      {
        name: 'Audio',
        slug: 'audio',
        description: 'Headphones, speakers, and audio devices',
        parent: createdCategories[0]._id,
        image: '/images/categories/audio.jpg',
      },
    ];
    
    const clothingSubcategories = [
      {
        name: "Men's Clothing",
        slug: 'mens-clothing',
        description: 'Clothing for men',
        parent: createdCategories[1]._id,
        image: '/images/categories/mens-clothing.jpg',
      },
      {
        name: "Women's Clothing",
        slug: 'womens-clothing',
        description: 'Clothing for women',
        parent: createdCategories[1]._id,
        image: '/images/categories/womens-clothing.jpg',
      },
    ];
    
    await Category.insertMany([...electronicsSubcategories, ...clothingSubcategories]);
    
    // Create sample products
    // This would be a more extensive list in a real application
    const products = [
      {
        name: 'Premium Wireless Headphones',
        slug: 'premium-wireless-headphones',
        description: 'Experience exceptional sound quality with our Premium Wireless Headphones. Featuring advanced noise cancellation technology, comfortable over-ear design, and up to 30 hours of battery life.',
        brand: 'AudioPro',
        category: createdCategories[0]._id, // Electronics
        price: 199.99,
        stock: 25,
        images: [
          '/images/products/headphones-1.jpg',
          '/images/products/headphones-2.jpg',
          '/images/products/headphones-3.jpg',
        ],
        rating: 4.5,
        numReviews: 12,
        features: [
          'Active Noise Cancellation',
          'Bluetooth 5.0 connectivity',
          '30-hour battery life',
          'Quick charge capability',
          'Built-in microphone for calls',
          'Comfortable memory foam ear cushions',
        ],
        specifications: {
          'Brand': 'AudioPro',
          'Model': 'SoundWave X1',
          'Connectivity': 'Wireless (Bluetooth 5.0)',
          'Battery Life': '30 hours',
          'Weight': '275g',
        },
        variants: [
          {
            name: 'Black',
            colorCode: '#000000',
            stock: 15,
          },
          {
            name: 'Silver',
            colorCode: '#C0C0C0',
            stock: 10,
          },
        ],
        featured: true,
        newArrival: false,
        bestSeller: true,
      },
      {
        name: 'Smartphone X',
        slug: 'smartphone-x',
        description: 'The latest flagship smartphone with cutting-edge features, impressive camera capabilities, and long battery life.',
        brand: 'TechX',
        category: createdCategories[0]._id, // Electronics
        price: 899.99,
        discount: 10,
        stock: 50,
        images: [
          '/images/products/smartphone-1.jpg',
          '/images/products/smartphone-2.jpg',
          '/images/products/smartphone-3.jpg',
        ],
        rating: 4.8,
        numReviews: 24,
        features: [
          '6.7-inch Super AMOLED display',
          '108MP main camera',
          '5000mAh battery',
          '5G connectivity',
          'IP68 water and dust resistance',
          'Fast charging and wireless charging',
        ],
        specifications: {
          'Brand': 'TechX',
          'Model': 'Smartphone X',
          'Display': '6.7-inch Super AMOLED',
          'Processor': 'Octa-core processor',
          'RAM': '8GB',
          'Storage': '256GB',
          'Battery': '5000mAh',
        },
        variants: [
          {
            name: 'Midnight Blue',
            colorCode: '#191970',
            stock: 20,
          },
          {
            name: 'Space Gray',
            colorCode: '#343d46',
            stock: 15,
          },
          {
            name: 'Rose Gold',
            colorCode: '#b76e79',
            stock: 15,
          },
        ],
        featured: true,
        newArrival: true,
        bestSeller: true,
      },
    ];
    
    await Product.insertMany(products);

    console.log('Data imported successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error importing data: ${error}`);
    process.exit(1);
  }
};

// Destroy data function
const destroyData = async () => {
  try {
    await Order.deleteMany();
    await Product.deleteMany();
    await User.deleteMany();
    await Category.deleteMany();

    console.log('Data destroyed successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error destroying data: ${error}`);
    process.exit(1);
  }
};

// Run script based on command line argument
if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}