const fs = require("fs");
const _ = require("lodash");
const Post = require("../models/post");
const Comment = require("../models/comment");
const formidable = require("formidable");
const sgMail = require("@sendgrid/mail");
require("dotenv").config();

exports.postById = async (req, res, next, id) => {
  // Comment.find({ postId: id }, { new: true }).sort({ createdAt: -1 });
  // exec((err, comments) => {
  //   req.comments = comments;
  // });

  try {
    const comms = await Comment.find({ postId: id }, { new: true })
      .populate("commentedBy", "_id name visible")
      .select("_id text commentedBy postId postUserId createdAt")
      .sort({ createdAt: -1 })
      .exec();
    // console.log("comms", comms);
    const post = await Post.findById(id)
      .populate("postedBy", "_id name visible")
      // .populate("comments.postedBy", "_id name visible")
      // .populate("comments")
      .populate("postedBy", "_id name visible email")
      // .select("_id author title body createdAt likes comments photo")
      .select("_id author title body createdAt likes  photo")
      .sort({ createdAt: -1 })
      .exec();

    req.post = post;
    req.comments = comms;
    next();
  } catch (error) {
    return res.status(400).json({ error });
  }
  // Post.findById(id)
  //   .populate("postedBy", "_id name visible")
  //   // .populate("comments.postedBy", "_id name visible")
  //   // .populate("comments")
  //   .populate("postedBy", "_id name visible")
  //   // .select("_id author title body created likes comments photo")
  //   .select("_id author title body created likes  photo")
  //   .sort({ created: -1 })
  //   .exec((err, post) => {
  //     if (err || !post) {
  //       return res.status(400).json({
  //         error: err,
  //       });
  //     }

  //     req.post = post;

  //     next();
  //   });
};

const filteringProducts = (obj) => {
  let filters = {};

  for (let sth in obj) {
    if (obj[sth].length > 0) {
      filters[sth] = obj[sth];
    }
  }

  if (filters.text && filters.category) {
    return {
      // $text: { $search: filters.text },
      // category: filters.category,
      $or: [
        { author: { $regex: filters.text, $options: "i" } },
        { title: { $regex: filters.text, $options: "i" } },
      ],
      category: filters.category,
    };
  } else if (filters.text && !filters.category) {
    return {
      // $text: { $search: filters.text },
      // $text: { $search: filters.text },
      $or: [
        { author: { $regex: filters.text, $options: "i" } },
        { title: { $regex: filters.text, $options: "i" } },
      ],
    };
  } else if (!filters.text && filters.category) {
    return {
      category: filters.category,
    };
  }
};

exports.getFilteredPosts = async (req, res) => {
  const page = parseInt(req.query.page);
  const limit = 20;

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  let results = {};

  try {
    const filteredCollection = await Post.find(
      filteringProducts(req.body)
    ).exec();

    const numberOfPages = Math.ceil(filteredCollection.length / limit);

    results.numberOfPages = numberOfPages;
    results.numberOfRecords = filteredCollection.length;

    results.results = await Post.find(filteringProducts(req.body))
      .limit(limit)
      .skip(startIndex)
      .populate("postedBy", " _id name visible")
      .populate("comments")
      .select("_id author title body createdAt likes category")
      .sort({ createdAt: -1 })
      .exec();

    if (startIndex > 0) {
      results.previous = {
        page: page - 1,
        limit: limit,
      };
    }

    if (endIndex < filteredCollection.length) {
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

exports.getPosts = async (req, res) => {
  const limit = 20;

  try {
    const books = await Post.find().limit(limit).sort({ createdAt: -1 }).exec();

    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createPost = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Image could not be uploaded",
      });
    }

    let post = new Post(fields);
    req.profile.hashed_password = undefined;
    req.profile.salt = undefined;
    post.postedBy = req.profile;
    if (files.photo) {
      post.photo.data = fs.readFileSync(files.photo.path);
      post.photo.contentType = files.photo.type;
    }

    post.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: err,
        });
      }
      res.json(result);
    });
  });
};

/////////////////////////////////

exports.isPoster = (req, res, next) => {
  let isPoster = req.post && req.auth && req.post.postedBy._id == req.auth._id;

  if (!isPoster) {
    return res.status(403).json({
      error: "User is not authorized",
    });
  }
  next();
};

exports.updatePost = (req, res, next) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Photo could not be uploaded!",
      });
    }

    let post = req.post;
    post = _.extend(post, fields);
    post.updated = Date.now();

    if (files.photo) {
      post.photo.data = fs.readFileSync(files.photo.path);
      post.photo.contentType = files.photo.type;
    }

    post.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: err,
        });
      }
      res.json(post);
    });
  });
};

exports.deletePost = async (req, res) => {
  let post = req.post;

  const deletedComms = await Comment.deleteMany({ postId: post._id });

  await post.remove((err, post) => {
    if (err) {
      return res.status(400).json({
        error: err,
      });
    }
    res.json({
      message: "Post deleted successfully!",
    });
  });
};

exports.photo = (req, res, next) => {
  res.set("Content-Type", req.post.photo.contentType);
  return res.send(req.post.photo.data);
};

exports.singlePost = (req, res) => {
  return res.json({ post: req.post, comments: req.comments });
};

exports.like = (req, res) => {
  Post.findByIdAndUpdate(
    req.body.postId,
    { $push: { likes: req.body.userId } },
    { new: true }
  ).exec((err, result) => {
    if (err) {
      return res.status(400).json({
        error: err,
      });
    } else {
      res.json(result);
    }
  });
};

exports.unlike = (req, res) => {
  Post.findByIdAndUpdate(
    req.body.postId,
    { $pull: { likes: req.body.userId } },
    { new: true }
  ).exec((err, result) => {
    if (err) {
      return res.status(400).json({
        error: err,
      });
    } else {
      res.json(result);
    }
  });
};

exports.comment = async (req, res) => {
  try {
    const {
      userId,
      userName,
      postId,
      postTitle,
      postUserId,
      postUserEmail,
      text,
    } = req.body;

    let comm = {
      commentedBy: userId,
      postId,
      postUserId,
      text,
    };

    const comment = await new Comment(comm);
    await comment.save();

    const comments = await Comment.find({ postId }, { new: true })
      .populate("commentedBy", "_id name visible")
      .select("_id text commentedBy postId createdAt")
      .sort({ createdAt: -1 })
      .exec();

    sgMail.setApiKey(process.env.SENGRID_API_KEY);

    const msgToPostUser = {
      to: postUserEmail,
      from: "aviationbookz@gmail.com",
      subject: "Dodano komentarz do Twojego postu.",
      text: `Użytkownik ${userName} skomentował Twój post dotyczący książki pod tytułem ${postTitle}`,
    };

    sgMail
      .send(msgToPostUser)
      .then((response) => console.log("Email to postUser send..."))
      .catch((error) => console.log(error));

    res.json({ message: "Dodano komentarz!", comments });
  } catch (error) {
    res.status(400).json({ message: "Something went wrong!!" });
  }
};

exports.uncomment = async (req, res) => {
  const { _id, postId } = req.body;

  try {
    const deletedComment = await Comment.findOneAndDelete({ _id });
    const comments = await Comment.find({ postId })
      .populate("commentedBy", "_id name visible")
      .select("_id text commentedBy postId createdAt")
      .sort({ createdAt: -1 })
      .exec();
    res.json(comments);
  } catch (error) {
    res.status(400).json({ message: "Something went wrong" });
  }
};
