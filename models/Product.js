const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  name: String,
  price: String,
  image: String,
  rating: { type: Number, default: 4 }
})

const Product = mongoose.model('Product', productSchema)

module.exports = Product