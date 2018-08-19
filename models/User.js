const environment = process.env.NODE_ENV || "development";
const configuration = require("../knexfile")[environment];
const database = require("knex")(configuration);
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Log the SQL queries
database.on("query", function(queryData) {
  console.log(queryData.sql);
});

// bcrypt docs: https://github.com/kelektiv/node.bcrypt.js#readme
const hashPassword = password => {
  return new Promise((resolve, reject) =>
    bcrypt.hash(password, 10, (err, hash) => {
      err ? reject(err) : resolve(hash);
    })
  );
};

const createUser = user => {
  // return database
  //   .raw(
  //     "INSERT INTO users (username, password, token) VALUES (?, ?, ?) RETURNING id, username, token",
  //     [user.username, user.password, user.token]
  //   )
  //   .then(data => data.rows[0]);
  return database("users")
    .returning(["id", "username", "email", "role"])
    .insert(user);
};

const createToken = () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(16, (err, data) => {
      err ? reject(err) : resolve(data.toString("base64"));
    });
  });
};

const register = (request, response) => {
  const user = request.body;
  hashPassword(user.password)
    .then(hashedPassword => {
      // delete user.password;
      user.password = hashedPassword;
    })
    .then(() => createToken())
    .then(token => (user.token = token))
    .then(() => createUser(user))
    .then(user => {
      // delete user.password_digest;
      response.status(201).json({ user });
    })
    .catch(err => {
      response.status(403).json(err);
    });
};

const getUsers = (request, response) => {
  database("users")
    .select()
    .then(users => {
      response.status(200).json(users);
    })
    .catch(error => {
      response.status(500).json({ error });
    });
};

const getUser = (request, response) => {
  database("users")
    .where("id", request.params.id)
    .select()
    .then(users => {
      if (users.length) {
        response.status(200).json(users);
      } else {
        response.status(404).json({
          error: `Could not find paper with id ${request.params.id}`
        });
      }
    })
    .catch(error => {
      response.status(500).json({ error });
    });
};

module.exports = {
  register,
  getUsers,
  getUser
};
