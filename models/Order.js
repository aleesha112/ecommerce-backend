const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  fullName: String,
  address: String,
  city: String,
  postalCode: String,
  phone: String,
  items: Array,
  subtotal: String,
  discount: String,
  shipping: String,
  total: String,
  status: { type: String, default: "Processing" },
  date: { type: Date, default: Date.now }
})

const Order = mongoose.model('Order', orderSchema)

module.exports = Order