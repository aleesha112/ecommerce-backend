const dns = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])

const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()
const Product = require('./models/Product')

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
    image: req.body.image
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
    { name: req.body.name, price: req.body.price, image: req.body.image },
    { new: true }
  )
  res.json(updatedProduct)
})
app.listen(5000, () => {
  console.log('Server running on http://localhost:5000')
})