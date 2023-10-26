const database = include("databaseConnection");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

async function createUser(postData) {
  let createUserSQL = `
        INSERT INTO user
        (username, email, password, user_type_id, hashed_uid)
        VALUES
        (:user, :email, :passwordHash, 2, :hashedUid);
    `;

  let userId = uuidv4();
  let hashedUid = await bcrypt.hash(userId, 5);
  let params = {
    user: postData.username,
    email: postData.email,
    passwordHash: postData.password,
    hashedUid: hashedUid,
  };

  try {
    const results = await database.query(createUserSQL, params);

    console.log("Successfully created user");
    console.log(results[0]);
    return true;
  } catch (err) {
    console.log("Error inserting user");
    console.log(err);
    return false;
  }
}

async function getUsers() {
  let getUsersSQL = `
		SELECT id, username, email, user_type_id
		FROM user;
	`;

  try {
    const results = await database.query(getUsersSQL);

    console.log("Successfully retrieved users");
    console.log(results[0]);
    return results[0];
  } catch (err) {
    console.log("Error getting users");
    console.log(err);
    return false;
  }
}

async function getUser(postData) {
  let getUserSQL = `
	SELECT user.id, user.username, user.email, user.password, user.user_type_id
	FROM user
	JOIN user_type ON user.user_type_id = user_type.id
	WHERE user.email = :email;
	`;

  let params = {
    user: postData.user,
  };

  try {
    const results = await database.query(getUserSQL, params);

    console.log("Successfully found user");
    console.log(results[0]);
    return results[0];
  } catch (err) {
    console.log("Error trying to find user");
    console.log(err);
    return false;
  }
}

async function getUserByEmail(postData) {
  let getUserByEmailSQL = `
        SELECT user.user_id, user.username, user.email, user.password, user.user_type_id, user_type.name AS user_type_name
        FROM user
        JOIN user_type ON user.user_type_id = user_type.id
        WHERE user.email = :email;
    `;
  console.log(postData.email);

  let params = {
    email: postData.email,
  };

  try {
    const results = await database.query(getUserByEmailSQL, params);

    console.log("Successfully found user by email");
    console.log(results[0]);
    return results[0];
  } catch (err) {
    console.log("Error trying to find user by email");
    console.log(err);
    return false;
  }
}

async function getUserByID(id) {
  let getUserByIDSQL = `
		SELECT user.id, user.username, user.email, user.password, user.user_type_id
		FROM user
		JOIN user_type ON user.user_type_id = user_type.id
		WHERE user.id = ?;
	`;

  try {
    const results = await database.query(getUserByIDSQL, [id]);

    console.log("Successfully found user by ID");
    console.log(results[0]);
    return results[0];
  } catch (err) {
    console.log("Error trying to find user by ID");
    console.log(err);
    return null;
  }
}

async function addTodoByUsername(postData) {
  let user = await getUser({ user: postData.username });
  if (!user) {
    console.log("User not found");
    return false;
  }

  let addTodoSQL = `
	  INSERT INTO todo
	  (description, user_id)
	  VALUES
	  (:description, :user_id);
	`;

  let params = {
    description: postData.description,
    user_id: user.id,
  };

  try {
    const results = await database.query(addTodoSQL, params);

    console.log("Successfully added todo");
    console.log(results[0]);
    return true;
  } catch (err) {
    console.log("Error adding todo");
    console.log(err);
    return false;
  }
}

module.exports = {
  createUser,
  getUsers,
  getUser,
  getUserByEmail,
  addTodoByUsername,
  getUserByID,
};
