// registration.js
const { connectDB } = require("../../dbConfig");
// const { ObjectId } = require("mongodb");

async function registerUser(userInfo, requestBody) {
  const db = await connectDB();
  const usersCollection = db.collection("users");

  try {
    // Check if the user already exists
    const existingUser = await usersCollection.findOne({
      email: userInfo.email,
    });
    if (existingUser) {
      // User already exists
      return {
        message: "User exists. Logging you in!",
        userId: existingUser._id,
      };
    } else {
      // If the user is new, create a new user object including the data from Google
      const newUser = {
        email: userInfo.email,
        name: userInfo.name,
        isPremium: requestBody.premium,
        shippingAddressses: requestBody.address,
        shoppingCart: { cartId: "", items: [], cartSubtotal: 0.0 },
        watchlist: [],
        orderHistory: [],
        reviews: [],
      };

      // Insert the new user into the database
      const result = await usersCollection.insertOne(newUser);
      return {
        success: true,
        message: "User registered successfully.",
        userId: result.insertedId,
      };
    }
  } catch (error) {
    console.error("Error during registration:", error);
    throw new Error("Error during registration.");
  }
}

async function loginUser(userInfo, requestBody) {
  const db = await connectDB();
  const usersCollection = db.collection("users");

  try {
    // Check if the user exists by looking for their email in the database
    const user = await usersCollection.findOne({ email: userInfo.email });

    if (!user) {
      // No user found with the provided email
      throw new Error("No user found with the provided email.");
    } else {
      // User found, proceed with your login logic here
      // For the sake of this example, we're just returning a success message and the user's ID
      return {
        success: true,
        message: "Login successful.",
        userId: user._id,
      };
    }
  } catch (error) {
    console.error("Error during login:", error);
    throw new Error("Error during login.");
  }
}

module.exports = { registerUser, loginUser };
