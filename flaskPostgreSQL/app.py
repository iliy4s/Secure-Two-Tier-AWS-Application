import logging
from flask import Flask, render_template, request, jsonify
from config import Config
import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config.from_object(Config)

ALLOWED_PETS = {"Dog", "Cat", "Rabbit", "Bird", "Other"}

def validate_user_payload(data):
    """Validate user input fields."""
    if not data or not isinstance(data, dict):
        return "Request body must be valid JSON."
    
    fname = str(data.get("fname", "")).strip()
    lname = str(data.get("lname", "")).strip()
    pet = str(data.get("pet", "")).strip()

    if not fname:
        return "First Name (fname) is required."
    if len(fname) > 100:
        return "First Name must not exceed 100 characters."

    if not lname:
        return "Last Name (lname) is required."
    if len(lname) > 100:
        return "Last Name must not exceed 100 characters."

    if not pet:
        return "Pet selection is required."
    if pet not in ALLOWED_PETS:
        return f"Invalid pet '{pet}'. Allowed values: {', '.join(sorted(ALLOWED_PETS))}."

    return None

@app.route("/")
def index():
    """Render the single main application page."""
    return render_template("index.html")

@app.route("/api/users", methods=["GET"])
def get_users():
    """Retrieve all users."""
    try:
        users = db.get_all_users()
        return jsonify({"success": True, "data": users}), 200
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        return jsonify({"success": False, "error": "Failed to fetch users from database."}), 500

@app.route("/api/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    """Retrieve a specific user by ID."""
    try:
        user = db.get_user_by_id(user_id)
        if not user:
            return jsonify({"success": False, "error": f"User with ID {user_id} not found."}), 404
        return jsonify({"success": True, "data": user}), 200
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {e}")
        return jsonify({"success": False, "error": "Database error while fetching user."}), 500

@app.route("/api/users", methods=["POST"])
def add_user():
    """Create a new user record."""
    data = request.get_json(silent=True)
    validation_error = validate_user_payload(data)
    if validation_error:
        return jsonify({"success": False, "error": validation_error}), 400

    fname = data["fname"].strip()
    lname = data["lname"].strip()
    pet = data["pet"].strip()

    try:
        new_user = db.create_user(fname, lname, pet)
        return jsonify({
            "success": True,
            "message": "User added successfully.",
            "data": new_user
        }), 201
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        return jsonify({"success": False, "error": "Database error while creating user."}), 500

@app.route("/api/users/<int:user_id>", methods=["PUT"])
def edit_user(user_id):
    """Update an existing user record."""
    data = request.get_json(silent=True)
    validation_error = validate_user_payload(data)
    if validation_error:
        return jsonify({"success": False, "error": validation_error}), 400

    fname = data["fname"].strip()
    lname = data["lname"].strip()
    pet = data["pet"].strip()

    try:
        # Check if user exists
        existing = db.get_user_by_id(user_id)
        if not existing:
            return jsonify({"success": False, "error": f"User with ID {user_id} not found."}), 404

        updated_user = db.update_user(user_id, fname, lname, pet)
        return jsonify({
            "success": True,
            "message": "User updated successfully.",
            "data": updated_user
        }), 200
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}")
        return jsonify({"success": False, "error": "Database error while updating user."}), 500

@app.route("/api/users/<int:user_id>", methods=["DELETE"])
def remove_user(user_id):
    """Delete a user record by ID."""
    try:
        existing = db.get_user_by_id(user_id)
        if not existing:
            return jsonify({"success": False, "error": f"User with ID {user_id} not found."}), 404

        db.delete_user(user_id)
        return jsonify({
            "success": True,
            "message": f"User {user_id} deleted successfully."
        }), 200
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {e}")
        return jsonify({"success": False, "error": "Database error while deleting user."}), 500

if __name__ == "__main__":
    db.init_db()
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.FLASK_DEBUG
    )

