const express = require("express");
const router = express.Router();

const {
  userById,
  allUsers,
  getUser,
  updateUser,
  deleteUser,
  userPhoto,
} = require("../controllers/user");

const { requireSignin } = require("../controllers/auth");

router.get("/users", allUsers);
router.get("/user/:userId", requireSignin, getUser);
router.put("/user/:userId", requireSignin, updateUser);
router.delete("/user/:userId", deleteUser);
//photo
router.get("/user/photo/:userId", userPhoto);

//any route containing :userId our app will first execute userById()
router.param("userId", userById);

module.exports = router;
