const express = require("express");
const app = express();
const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config();
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const expressValidator = require("express-validator");
const path = require("path");

//bring routes
const postRoutes = require("./routes/post");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");

mongoose
  .connect(process.env.MONGO_URI, {
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => console.log("DB connected!!"));

mongoose.connection.on("error", (err) => {
  console.log(`DB connection error: ${err.message}`);
});

// middleware
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(expressValidator());
app.use(cors());

//posts api
app.use("/api", postRoutes);
app.use("/api", authRoutes);
app.use("/api", userRoutes);

app.use(function (err, req, res, next) {
  if (err.name === "UnauthorizedError") {
    res.status(401).json({
      error: "Unauthorized",
    });
  }
});

//for Heroku!!
app.use(express.static("../frontend/build"));
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../frontend", "build", "index.html"));
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  "Server is up and running!";
});
