# MongoDB Basics and User API

This project is a small Node.js API using MongoDB. Users can register with their name, email, password, and place; log in; list users; and read, update, or delete their own profile.

## What can MongoDB store?

MongoDB stores data as **documents** (JSON-like objects) inside **collections**. For example, an application could store:

- User accounts and profile details
- Products, prices, and inventory
- Orders and payment status (never store raw card details)
- Blog posts, comments, and tags
- Tasks, messages, and application settings
- Event or activity records

Choose fields that your application needs. Do not store passwords as plain text; this API stores a password hash instead.

## MongoDB words to know

| Term | Meaning | Example |
|---|---|---|
| Database | A container for related collections | `user_api` |
| Collection | A group of documents, similar to a table | `users` |
| Document | One record, similar to a row | One user's name and email |
| Field | A named value in a document | `email: "alex@example.com"` |
| `_id` | MongoDB's unique identifier for a document | `ObjectId("...")` |
| Schema | Rules describing the expected document fields | The Mongoose User model |

MongoDB documents can contain nested objects and arrays. Documents in a collection do not all have to contain exactly the same fields, although an application commonly applies a schema for consistency.

## A one-day beginner study plan

This is a practical introduction, not a promise to master MongoDB in one day.

1. **Hour 1 — Concepts:** Learn databases, collections, documents, fields, and `_id`.
2. **Hours 2–3 — MongoDB Compass:** Connect to your database, inspect the `users` collection, and view a document created by registration.
3. **Hours 4–5 — CRUD:** Practice creating, reading, updating, and deleting test documents.
4. **Hour 6 — Queries:** Learn filters such as finding a document by email, and basic sorting and limits.
5. **Hour 7 — Mongoose:** Review schemas, models, validation, and how this project connects to MongoDB.
6. **Hour 8 — Indexes and safe handling:** Learn why unique indexes help prevent duplicate emails. Practice with test data, and never expose database credentials or store plain-text passwords.

Take breaks and use a separate test database for experiments. Avoid deleting or changing real data while learning.

## CRUD examples

CRUD means **Create, Read, Update, and Delete**. In MongoDB Compass, these operations can be practiced using a test collection. In a Node.js application, Mongoose provides methods for them:

```js
// Create
const user = await User.create({ name: "Alex", email: "alex@example.com", passwordHash });

// Read
const foundUser = await User.findOne({ email: "alex@example.com" });

// Update
await User.updateOne({ email: "alex@example.com" }, { $set: { name: "Alex Example" } });

// Delete — use only with test data while learning
await User.deleteOne({ email: "alex@example.com" });
```

In this project, the `User` model defines the stored fields and timestamps. The API hashes passwords before storing them, and does not return the password hash in profile responses.

## Run this API

Requirements: Node.js and a MongoDB server or MongoDB Atlas connection.

1. Install dependencies with `npm install`.
2. Configure the local `.env` file with `MONGODB_URI` and a long random `JWT_SECRET` (at least 32 characters). Do not share or commit `.env`.
3. Start the API with `npm run dev` or `npm start`.

The API listens at `http://localhost:3000` by default. When connected, the server prints the MongoDB database name.

## Try it in Postman

Import `postman/User API.postman_collection.json`. Run **Register**, then **Login**; the login request saves the token to a collection variable. Use that token for **List users**, **Get profile**, **Update my profile**, and **Delete my account**.

### Register

`POST http://localhost:3000/api/auth/register`

Body → raw → JSON:

```json
{
  "name": "Alex Example",
  "email": "alex@example.com",
  "password": "password123",
  "place": "Mumbai"
}
```

`place` is optional and can contain up to 100 characters. The password must have at least 8 characters. A successful response contains the user's ID, name, email, and place, but not the password or password hash.

### Login

`POST http://localhost:3000/api/auth/login`

```json
{
  "email": "alex@example.com",
  "password": "password123"
}
```

The response contains a JWT valid for one hour.

### List users

`GET http://localhost:3000/api/users?page=1&limit=20`

Requires the login token. Pagination defaults to page 1 with 20 results; `limit` must be between 1 and 100. The response includes user IDs, names, and places, but excludes email addresses and password hashes.

### Get profile

`GET http://localhost:3000/api/users/profile`

Send the login token in the request header:

```text
Authorization: Bearer <token>
```

### Update your profile

`PATCH http://localhost:3000/api/users/profile`

Requires the login token. Send either or both editable fields:

```json
{
  "name": "Alex Example",
  "place": "Pune"
}
```

Only the account associated with the token can be updated. Name must be 1–100 characters; place can be up to 100 characters.

### Delete your account

`DELETE http://localhost:3000/api/users/profile`

Requires the login token. This permanently deletes the account associated with that token. Use it carefully, especially when testing with non-test data.
