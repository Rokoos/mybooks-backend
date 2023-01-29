const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const commentSchema = new mongoose.Schema(
  {
    commentedBy: {
      type: ObjectId,
      ref: "User",
    },
    postId: {
      type: ObjectId,
      ref: "Post",
    },
    postUserId: { type: ObjectId, ref: "User" },
    text: {
      type: "String",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
