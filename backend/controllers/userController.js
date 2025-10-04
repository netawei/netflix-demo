const User = require('../models/User');
const bcrypt = require('bcrypt');


exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).send('user already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword
    });

    req.session.user = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      isAdmin: newUser.isAdmin
    };

    res.status(201).send('Registration successful');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).send("Invalid email or password");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send('Invalid email or password');

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin
    };

    res.send('Login successful');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Server error');
    res.clearCookie('connect.sid');
    res.send('Logout successful');
  });
};