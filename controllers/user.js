const fs = require("fs");
const formidable = require("formidable");
const _ = require("lodash");
const User = require("../models/user");
const Post = require("../models/post");
const Comment = require("../models/comment");

exports.userById = async (req, res, next, id) => {
  User.findById(id).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    }

    req.profile = user; // adds profile object in req with user info
    next();
  });
};

exports.hasAuthorization = (req, res, next) => {
  const authorized =
    req.profile && req.auth && req.profile._id === req.auth._id;

  if (!authorized) {
    return res.status(403).json({
      error: "User is not authorized to perform this action",
    });
  }
};

exports.allUsers = async (req, res) => {
  const page = req.query.page;
  const limit = 20;

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  let results = {};

  try {
    const userCollection = await User.countDocuments().exec();

    const numberOfPages = Math.ceil(userCollection / limit);
    results.numberOfPages = numberOfPages;

    results.results = await User.find({ role: "user" })
      .limit(limit)
      .skip(startIndex)
      .select("name email createdAt")
      .sort({ createdAt: -1 })
      .exec();

    if (startIndex > 0) {
      results.previous = {
        page: page - 1,
        limit: limit,
      };
    }

    if (endIndex < userCollection) {
      results.next = {
        page: page + 1,
        limit: limit,
      };
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/////////////////////////

exports.getUser = async (req, res) => {
  const page = parseInt(req.query.page);

  const limit = 20;

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  let results = {};

  try {
    const booksCollection = await Post.find({
      postedBy: req.profile._id,
    }).exec();
    const numberOfPages = Math.ceil(booksCollection.length / limit);

    results.numberOfPages = numberOfPages;

    results.results = await Post.find({ postedBy: req.profile._id })
      .skip(startIndex)
      .limit(limit)
      .exec();

    if (startIndex > 0) {
      results.previous = {
        page: page - 1,
        limit: limit,
      };
    }

    if (endIndex < booksCollection.length) {
      results.next = {
        page: page + 1,
        limit: limit,
      };
    }

    req.profile.books = results;
    req.profile.hashed_password = undefined;
    req.profile.salt = undefined;
    return res.json(req.profile);
  } catch (error) {}

  //   console.log("profile", req.profile);
};

exports.updateUser = (req, res, next) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Photo could not be uploaded!",
      });
    }

    let user = req.profile;
    user = _.extend(user, fields);
    user.updated = Date.now();

    if (files.photo) {
      user.photo.data = fs.readFileSync(files.photo.path);
      user.photo.contentType = files.photo.type;
    }

    user.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: err,
        });
      }

      user.hashed_password = undefined;
      user.salt = undefined;
      res.json(user);
    });
  });
};

exports.userPhoto = (req, res) => {
  res.set(("Content-Type", req.profile.photo.contentType));
  return res.send(req.profile.photo.data);
};

exports.deleteUser = async (req, res) => {
  const userId = req.params.userId;

  try {
    const deletedUserComms = await Comment.deleteMany({
      $or: [{ commentedBy: userId }, { postUserId: userId }],
    });

    const deletedPosts = await Post.deleteMany({ postedBy: userId });
    const deleteduser = await User.deleteOne({ _id: userId });
    res.json({ message: "User deleted successfully!!" });
  } catch (error) {
    res.status(400).json({ error });
  }
};
