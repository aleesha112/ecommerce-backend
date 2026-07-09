require('dotenv').config()
const dns = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])

const { BrevoClient } = require('@getbrevo/brevo')
const brevoClient = new BrevoClient({ apiKey: process.env.BREVO_API_KEY })

const otpStore = new Map()

const Order = require('./models/Order')
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const Product = require('./models/Product')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('./models/User')

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
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.json([])
  try {
    const decoded = jwt.verify(token, 'secret123')
    const orders = await Order.find({ userId: decoded.id }).sort({ date: -1 })
    res.json(orders)
  } catch {
    res.json([])
  }
})

app.delete('/api/orders/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id)
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

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' })
    }
    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: req.body.role || 'user'
    })
    await newUser.save()
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, 'secret123', { expiresIn: '7d' })
    res.json({ token, user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role } })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' })
    }
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' })
    }
    const token = jwt.sign({ id: user._id, role: user.role }, 'secret123', { expiresIn: '7d' })
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' })
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    otpStore.set(email, { otp, expiry: Date.now() + 10 * 60 * 1000 })
    await brevoClient.transactionalEmails.sendTransacEmail({
      sender: { email: 'aleeshaafzal112@gmail.com', name: 'MyStore' },
      to: [{ email: email }],
      subject: 'MyStore - Email Verification OTP',
      htmlContent: `
        <div style="font-family: Arial; max-width: 500px; margin: 0 auto; padding: 30px; background: #f8f8f8; border-radius: 10px;">
          <h2 style="color: #1a1a2e;">Verify Your Email</h2>
          <p>Your OTP for MyStore registration:</p>
          <h1 style="color: #f0a500; font-size: 36px; letter-spacing: 8px;">${otp}</h1>
          <p style="color: #888;">This OTP expires in 10 minutes.</p>
        </div>
      `
    })
    res.json({ message: 'OTP sent successfully' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Failed to send OTP' })
  }
})

app.post('/api/auth/verify-otp', async (req, res) => {
  const { name, email, password, otp } = req.body
  const stored = otpStore.get(email)
  if (!stored) {
    return res.status(400).json({ message: 'OTP expired or not found' })
  }
  if (stored.otp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' })
  }
  if (Date.now() > stored.expiry) {
    otpStore.delete(email)
    return res.status(400).json({ message: 'OTP expired' })
  }
  otpStore.delete(email)
  const hashedPassword = await bcrypt.hash(password, 10)
  const newUser = new User({ name, email, password: hashedPassword, role: 'user' })
  await newUser.save()
  const token = jwt.sign({ id: newUser._id, role: newUser.role }, 'secret123', { expiresIn: '7d' })
  res.json({ token, user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role } })
})

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: 'Email not registered' })
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    otpStore.set(`reset_${email}`, { otp, expiry: Date.now() + 10 * 60 * 1000 })
    await brevoClient.transactionalEmails.sendTransacEmail({
      sender: { email: 'aleeshaafzal112@gmail.com', name: 'MyStore' },
      to: [{ email: email }],
      subject: 'MyStore - Password Reset OTP',
      htmlContent: `
        <div style="font-family: Arial; max-width: 500px; margin: 0 auto; padding: 30px; background: #f8f8f8; border-radius: 10px;">
          <h2 style="color: #1a1a2e;">Reset Your Password</h2>
          <p>Your OTP for password reset:</p>
          <h1 style="color: #f0a500; font-size: 36px; letter-spacing: 8px;">${otp}</h1>
          <p style="color: #888;">This OTP expires in 10 minutes.</p>
        </div>
      `
    })
    res.json({ message: 'OTP sent to your email' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Failed to send OTP' })
  }
})

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body
  const stored = otpStore.get(`reset_${email}`)
  if (!stored || stored.otp !== otp || Date.now() > stored.expiry) {
    return res.status(400).json({ message: 'Invalid or expired OTP' })
  }
  otpStore.delete(`reset_${email}`)
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await User.findOneAndUpdate({ email }, { password: hashedPassword })
  res.json({ message: 'Password reset successfully' })
})

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000')
})