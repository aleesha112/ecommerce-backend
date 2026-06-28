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

    const systemInstruction = `You are a helpful customer support assistant for an online store called "MyStore" (e-commerce website). 
    The store sells electronics including smartphones, laptops, earbuds, power banks, chargers, and bluetooth speakers.
    When greeted, briefly introduce yourself and the store, then ask how you can help.
    Only answer questions related to the store, its products, shipping, discounts, or shopping help.
    If asked something unrelated to the store, politely redirect the conversation back to how you can help with their shopping.
    Keep responses friendly, concise, and helpful.`

    const result = await model.generateContent(`${systemInstruction}\n\nUser message: ${req.body.message}`)
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
app.delete('/api/orders/:id', async (req, res) => {
  await Order.findByIdAndDelete(req.params.id)
  res.json({ message: 'Order deleted' })
})
app.put('/api/orders/:id/status', async (req, res) => {
  const updatedOrder = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  )
  res.json(updatedOrder)
})
app.listen(5000, () => {
  console.log('Server running on http://localhost:5000')
})