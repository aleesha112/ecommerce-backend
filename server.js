const dns = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])

const Order = require('./models/Order')
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()
const Product = require('./models/Product')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const app = express()
app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected!'))
  .catch((err) => console.log('MongoDB connection error:', err))

app.get('/', (req, res) => {
  res.send('Server is running!')
})

app.get('/api/products', async (req, res) => {
  const products = await Product.find()
  res.json(products)
})

app.post('/api/products', async (req, res) => {
  const newProduct = new Product({
    name: req.body.name,
    price: req.body.price,
    image: req.body.image,
    rating: req.body.rating || 4
  })
  await newProduct.save()
  res.json(newProduct)
})
app.delete('/api/products/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id)
  res.json({ message: 'Product deleted' })
})
app.put('/api/products/:id', async (req, res) => {
  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    { name: req.body.name, price: req.body.price, image: req.body.image, rating: req.body.rating },
    { new: true }
  )
  res.json(updatedProduct)
})
app.post('/api/chat', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent(req.body.message)
    const response = result.response.text()
    res.json({ reply: response })
  } catch (error) {
    console.log(error)
    res.status(500).json({ reply: "Sorry, something went wrong." })
  }
})
app.post('/api/orders', async (req, res) => {
  const newOrder = new Order(req.body)
  await newOrder.save()
  res.json(newOrder)
})

app.get('/api/orders', async (req, res) => {
  const orders = await Order.find().sort({ date: -1 })
  res.json(orders)
})
app.listen(5000, () => {
  console.log('Server running on http://localhost:5000')
})