const express = require("express");
const router = express.Router();

const { commentValidator } = require("../validator");

const { requireSignin } = require("../controllers/auth");
const { userById } = require("../controllers/user");

const {
  getPosts,
  createPost,
  postById,
  isPoster,
  deletePost,
  updatePost,
  photo,
  singlePost,
  like,
  unlike,
  comment,
  uncomment,
  getFilteredPosts,
} = require("../controllers/post");

router.get("/posts", getPosts);

//like unlike
router.put("/post/like", requireSignin, like);
router.put("/post/unlike", requireSignin, unlike);

//comments
router.post("/post/comment", requireSignin, commentValidator, comment);
router.delete("/post/uncomment", requireSignin, uncomment);

router.post("/post/new/:userId", requireSignin, createPost);
router.get("/post/:postId", singlePost);
router.put("/post/:postId", requireSignin, isPoster, updatePost);
router.delete("/post/:postId", requireSignin, isPoster, deletePost);
router.post("/filters", getFilteredPosts);

//photo
router.get("/post/photo/:postId", photo);

//any route containing :userId our app will first execute userById()
router.param("userId", userById);

router.param("postId", postById);

module.exports = router;
