const jwt = require("jsonwebtoken");
const expressJwt = require("express-jwt");
const sgMail = require("@sendgrid/mail");
require("dotenv").config();
const User = require("../models/user");

exports.signup = async (req, res) => {
  const userExists = await User.findOne({ email: req.body.email });

  if (userExists) {
    return res.status(403).json({
      error: "Email is taken",
    });
  }

  const user = await new User(req.body);
  await user.save();

  sgMail.setApiKey(process.env.SENGRID_API_KEY);

  const msgToUser = {
    to: req.body.email,
    from: "aviationbookz@gmail.com",
    subject: "Witamy w serwisie aviationbookz!",
    text: `Witaj ${req.body.name}. Twoje konto zostało pomyślnie zarejestrowane w naszym serwisie. Możesz sie zalogować i dodawać swoje ulubione książki poświęcone lotnictwu i/lub komentować posty innych użytkowników.`,
  };

  sgMail
    .send(msgToUser)
    .then((response) => console.log("Email to user send..."))
    .catch((error) => console.log(error));

  res.json({ message: "Signup success!Please login." });
};

exports.signin = (req, res) => {
  const { email, password } = req.body;

  User.findOne({ email }, (err, user) => {
    if (err || !user || user.visible === 0) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    if (!user.authenticate(password)) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

    res.cookie("t", token, { expire: new Date() + 9999 });

    const { _id, email, name, role } = user;

    return res.json({ token, user: { _id, name, email, role } });
  });
};

exports.signout = (req, res) => {
  res.clearCookie("t");
  return res.json({
    message: "Signout success!!",
  });
};

exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
  userProperty: "auth",
});
