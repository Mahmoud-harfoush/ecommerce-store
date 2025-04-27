const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const asyncHandler = require('express-async-handler');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    discountPrice,
    totalPrice,
    couponCode,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  // Check if all products are in stock
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    
    if (!product) {
      res.status(404);
      throw new Error(`Product not found: ${item.product}`);
    }

    // Check variant stock if variant is specified
    if (item.variant && item.variant.name) {
      const variant = product.variants.find(v => v.name === item.variant.name);
      
      if (!variant) {
        res.status(404);
        throw new Error(`Variant not found: ${item.variant.name}`);
      }
      
      if (variant.stock < item.quantity) {
        res.status(400);
        throw new Error(`Not enough stock for ${product.name} (${variant.name}). Available: ${variant.stock}`);
      }
    } else if (product.stock < item.quantity) {
      // Check main product stock if no variant
      res.status(400);
      throw new Error(`Not enough stock for ${product.name}. Available: ${product.stock}`);
    }
  }

  // Create new order
  const order = new Order({
    orderItems,
    user: req.user._id,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    discountPrice,
    totalPrice,
    couponCode,
  });

  const createdOrder = await order.save();

  // Update product stock quantities
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    
    if (item.variant && item.variant.name) {
      // Update variant stock
      const variantIndex = product.variants.findIndex(
        v => v.name === item.variant.name
      );
      
      if (variantIndex !== -1) {
        product.variants[variantIndex].stock -= item.quantity;
      }
    } else {
      // Update main product stock
      product.stock -= item.quantity;
    }
    
    await product.save();
  }

  res.status(201).json(createdOrder);
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate({
      path: 'orderItems.product',
      select: 'name images price discount',
    });

  if (order) {
    // Check if the order belongs to the current user or if the user is an admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Not authorized to view this order');
    }

    res.json(order);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.status = 'processing';
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.payer.email_address,
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = 'delivered';
    order.trackingNumber = req.body.trackingNumber || order.trackingNumber;

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, trackingNumber, notes } = req.body;
  const order = await Order.findById(req.params.id);

  if (order) {
    order.status = status || order.status;
    
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }
    
    if (notes) {
      order.notes = notes;
    }

    // If status is delivered, update delivered status
    if (status === 'delivered' && !order.isDelivered) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;

  const count = await Order.countDocuments({ user: req.user._id });
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    orders,
    page,
    pages: Math.ceil(count / pageSize),
    totalOrders: count,
  });
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;

  // Filter by status
  const statusFilter = req.query.status
    ? { status: req.query.status }
    : {};

  // Filter by date range
  const dateFilter = {};
  if (req.query.startDate) {
    dateFilter.createdAt = { ...dateFilter.createdAt, $gte: new Date(req.query.startDate) };
  }
  if (req.query.endDate) {
    const endDate = new Date(req.query.endDate);
    endDate.setDate(endDate.getDate() + 1); // Include orders from the end date
    dateFilter.createdAt = { ...dateFilter.createdAt, $lt: endDate };
  }

  // Search by order number or customer email
  const searchFilter = req.query.search
    ? {
        $or: [
          { orderNumber: { $regex: req.query.search, $options: 'i' } },
          // Using $text index on user.email would be better in production
        ],
      }
    : {};

  const filters = {
    ...statusFilter,
    ...dateFilter,
    ...searchFilter,
  };

  const count = await Order.countDocuments(filters);
  const orders = await Order.find(filters)
    .populate('user', 'id name email')
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    orders,
    page,
    pages: Math.ceil(count / pageSize),
    totalOrders: count,
  });
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Only allow cancellation if order is pending or processing
  if (order.status !== 'pending' && order.status !== 'processing') {
    res.status(400);
    throw new Error('Order cannot be cancelled at this stage');
  }

  // Check if the user is the owner of the order or an admin
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to cancel this order');
  }

  // Update order status to cancelled
  order.status = 'cancelled';
  
  // If order was paid, it will need to be refunded (in production)
  // This would typically involve integration with payment gateway
  
  // Restore product stock quantities
  for (const item of order.orderItems) {
    const product = await Product.findById(item.product);
    
    if (product) {
      if (item.variant && item.variant.name) {
        // Restore variant stock
        const variantIndex = product.variants.findIndex(
          v => v.name === item.variant.name
        );
        
        if (variantIndex !== -1) {
          product.variants[variantIndex].stock += item.quantity;
        }
      } else {
        // Restore main product stock
        product.stock += item.quantity;
      }
      
      await product.save();
    }
  }

  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

module.exports = {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  updateOrderStatus,
  getMyOrders,
  getOrders,
  cancelOrder,
};