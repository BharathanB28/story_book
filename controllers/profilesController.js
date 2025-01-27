const Profile = require("../model/Profile");
const User = require("../model/User");
const Genre = require("../model/Genre");
const Story = require("../model/Story");
const Comment = require("../model/Comment");
const Reply = require("../model/Reply");

// GET USER PROFILE
const getProfile = async (req, res) => {
  // check if no params
  if (!req.params.username) {
    return res.status(400).json({ message: "No username provided." });
  }

  // check if profile exists
  const profileExists = await Profile.findOne({
    username: req.params.username,
  }).exec();

  if (!profileExists) {
    return res.status(404).json({
      message: `No profile with username ${req.params.username} found.`,
    });
  }

  // find and return profile
  const profile = await Profile.findOne({
    username: req.params.username,
  }).exec();

  res.status(200).json(profile);
};

// GET ALL PROFILES
const getAllProfiles = async (req, res) => {
  const profiles = await Profile.find({}).exec();

  res.status(200).json(profiles);
};

// UPDATE USER PROFILE
const updateProfile = async (req, res) => {
  // check if no params
  if (!req.params.username) {
    return res.status(400).json({ message: "No username provided." });
  }

  // check if no body
  if (!req.body) {
    return res.status(400).json({ message: "No update provided." });
  }

  // check if bio is empty
  if (req.body.bio === "") {
    return res.status(400).json({ message: "Bio cannot be empty." });
  }

  const newUserName =
    req.params.username.charAt(0).toUpperCase() +
    req.params.username.slice(1).toLowerCase();
  const updatedUserName =
    req.body.username.charAt(0).toUpperCase() +
    req.body.username.slice(1).toLowerCase();

  // check if profile exists
  const profileExists = await Profile.findOne({
    username: newUserName,
  }).exec();

  if (!profileExists) {
    return res.status(404).json({
      message: `No profile with username ${newUserName} found.`,
    });
  }

  const { base64 } = req.body;

  // get date from old profile
  const dateJoined = profileExists.dateJoined;

  // create new profile
  const profile = new Profile({
    firstname: profileExists.firstname,
    lastname: profileExists.lastname,
    username: updatedUserName ? updatedUserName : profileExists.username,
    bio: req.body.bio ? req.body.bio : profileExists.bio,
    profilePicture: base64 ? base64 : profileExists.profilePicture,
    coverPicture: req.body.coverPicture
      ? req.body.coverPicture
      : profileExists.coverPicture,
    dateJoined: dateJoined,
  });

  // if bio is more than 250 characters, return error
  if (profile.bio.length > 250) {
    return res.status(400).json({
      message: "Bio cannot be more than 250 characters",
    });
  }

  // if bios is less than 50 characters, return error
  if (profile.bio.length < 10) {
    return res.status(400).json({
      message: "Bio cannot be less than 10 characters",
    });
  }

  // check if username has been taken by another user
  if (profile.username !== profileExists.username) {
    const userNameExists = await User.findOne({
      username: profile.username,
    }).exec();

    if (userNameExists) {
      return res.status(400).json({
        message: `Username ${profile.username} has been taken. Please choose another username`,
      });
    }
  }

  // delete old profile
  await Profile.findOneAndDelete({ username: newUserName }).exec();

  try {
    const result = await profile.save();

    if (updatedUserName) {
      // update the username in the users collection
      await User.findOneAndUpdate(
        { username: newUserName },
        { $set: { username: updatedUserName } }
      ).exec();

      // if username is updated, update the author field in the stories collection
      await Story.updateMany(
        // find all stories with the old username
        { author: newUserName },
        // update the author field with the new username
        { $set: { author: updatedUserName } }
      ).exec();

      // update comments with the new username
      await Comment.updateMany(
        // find all comments with the old username\
        { commenter: newUserName },
        // update the username field with the new username
        { $set: { commenter: updatedUserName } }
      ).exec();

      // update the username in the replies
      await Reply.updateMany(
        // find all replies with the old username
        { commenter: newUserName },
        // update the username field with the new username
        { $set: { commenter: updatedUserName } }
      ).exec();

      // update comment likes by the new username
      await Comment.updateMany(
        // find all likes that include the old username
        { likes: newUserName },
        // replace the old username with the new username in the likes array
        { $set: { "likes.$[element]": updatedUserName } },
        // arrayFilters to update the likes array
        { arrayFilters: [{ element: newUserName }] }
      ).exec();
    }

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getAllProfiles,
};
