const express = require('express')
const app = express()
const dotenv = require('dotenv')
const mongoose = require('mongoose')
dotenv.config()
const morgan = require('morgan')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const expressValidator = require('express-validator')


//bring routes
const postRoutes = require('./routes/post')
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/user')


mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true 
})
.then(() => console.log('DB connected!!'))

mongoose.connection.on('error', err => {
    console.log(`DB connection error: ${err.message}`)
})

// middleware
app.use(morgan('dev'))
app.use(bodyParser.json())
app.use(cookieParser())
app.use(expressValidator())
app.use(cors())

//posts api
app.use('/', postRoutes)
app.use('/', authRoutes)
app.use('/', userRoutes)

app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
      res.status(401).json({
          error: 'Unauthorized'
      })
    }
  });

const port = process.env.PORT || 5000

app.listen(port, () => {
    'Server is up and running!'
})