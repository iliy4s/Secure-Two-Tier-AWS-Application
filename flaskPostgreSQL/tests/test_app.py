import unittest
from unittest.mock import patch
from app import app

class FlaskCRUDTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_index_page_loads(self):
        """Test GET / renders the main HTML page."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"User Management System", response.data)
        self.assertIn(b"Add User", response.data)
        self.assertIn(b"User Records", response.data)

    @patch("db.get_all_users")
    def test_get_users_empty(self, mock_get_all):
        """Test GET /api/users when no users exist."""
        mock_get_all.return_value = []
        response = self.client.get("/api/users")
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertTrue(json_data["success"])
        self.assertEqual(json_data["data"], [])

    @patch("db.get_all_users")
    def test_get_users_list(self, mock_get_all):
        """Test GET /api/users returns list of users."""
        mock_get_all.return_value = [
            {"id": 1, "fname": "John", "lname": "Smith", "pet": "Dog"},
            {"id": 2, "fname": "David", "lname": "Kumar", "pet": "Cat"}
        ]
        response = self.client.get("/api/users")
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertTrue(json_data["success"])
        self.assertEqual(len(json_data["data"]), 2)
        self.assertEqual(json_data["data"][0]["fname"], "John")

    @patch("db.get_user_by_id")
    def test_get_user_found(self, mock_get_user):
        """Test GET /api/users/<id> for existing user."""
        mock_get_user.return_value = {"id": 1, "fname": "John", "lname": "Smith", "pet": "Dog"}
        response = self.client.get("/api/users/1")
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertTrue(json_data["success"])
        self.assertEqual(json_data["data"]["fname"], "John")

    @patch("db.get_user_by_id")
    def test_get_user_not_found(self, mock_get_user):
        """Test GET /api/users/<id> for non-existent user."""
        mock_get_user.return_value = None
        response = self.client.get("/api/users/999")
        self.assertEqual(response.status_code, 404)
        json_data = response.get_json()
        self.assertFalse(json_data["success"])
        self.assertIn("not found", json_data["error"])

    @patch("db.create_user")
    def test_create_user_success(self, mock_create):
        """Test POST /api/users successfully creates a user."""
        mock_create.return_value = {"id": 1, "fname": "Alice", "lname": "Wonderland", "pet": "Rabbit"}
        payload = {"fname": "Alice", "lname": "Wonderland", "pet": "Rabbit"}
        response = self.client.post("/api/users", json=payload)
        self.assertEqual(response.status_code, 201)
        json_data = response.get_json()
        self.assertTrue(json_data["success"])
        self.assertEqual(json_data["data"]["id"], 1)
        self.assertEqual(json_data["data"]["pet"], "Rabbit")

    def test_create_user_validation_failure(self):
        """Test POST /api/users with invalid input."""
        # Missing pet
        response = self.client.post("/api/users", json={"fname": "Bob", "lname": "Builder", "pet": ""})
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.get_json()["success"])

        # Invalid pet option
        response = self.client.post("/api/users", json={"fname": "Bob", "lname": "Builder", "pet": "Dinosaur"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid pet", response.get_json()["error"])

        # Missing fname
        response = self.client.post("/api/users", json={"fname": "", "lname": "Builder", "pet": "Cat"})
        self.assertEqual(response.status_code, 400)

    @patch("db.update_user")
    @patch("db.get_user_by_id")
    def test_update_user_success(self, mock_get, mock_update):
        """Test PUT /api/users/<id> successfully updates user."""
        mock_get.return_value = {"id": 1, "fname": "John", "lname": "Smith", "pet": "Dog"}
        mock_update.return_value = {"id": 1, "fname": "Johnny", "lname": "Smith", "pet": "Bird"}
        payload = {"fname": "Johnny", "lname": "Smith", "pet": "Bird"}

        response = self.client.put("/api/users/1", json=payload)
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertTrue(json_data["success"])
        self.assertEqual(json_data["data"]["fname"], "Johnny")
        self.assertEqual(json_data["data"]["pet"], "Bird")

    @patch("db.get_user_by_id")
    def test_update_user_not_found(self, mock_get):
        """Test PUT /api/users/<id> when user does not exist."""
        mock_get.return_value = None
        payload = {"fname": "Johnny", "lname": "Smith", "pet": "Bird"}
        response = self.client.put("/api/users/999", json=payload)
        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.get_json()["success"])

    @patch("db.delete_user")
    @patch("db.get_user_by_id")
    def test_delete_user_success(self, mock_get, mock_delete):
        """Test DELETE /api/users/<id> successfully deletes a record."""
        mock_get.return_value = {"id": 1, "fname": "John", "lname": "Smith", "pet": "Dog"}
        mock_delete.return_value = {"id": 1}
        response = self.client.delete("/api/users/1")
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertTrue(json_data["success"])

    @patch("db.get_user_by_id")
    def test_delete_user_not_found(self, mock_get):
        """Test DELETE /api/users/<id> when user does not exist."""
        mock_get.return_value = None
        response = self.client.delete("/api/users/999")
        self.assertEqual(response.status_code, 404)
        json_data = response.get_json()
        self.assertFalse(json_data["success"])

if __name__ == "__main__":
    unittest.main()

