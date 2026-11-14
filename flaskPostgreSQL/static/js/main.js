// Minimal Flask + PostgreSQL CRUD Application Frontend Logic

let deleteTargetId = null;
let deleteModalInstance = null;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    deleteModalInstance = new bootstrap.Modal(
        document.getElementById("deleteConfirmModal")
    );

    const form = document.getElementById("userForm");
    const tbody = document.getElementById("usersTableBody");

    form.addEventListener("submit", handleFormSubmit);

    document.getElementById("confirmDeleteBtn")
        .addEventListener("click", executeDelete);

    document.getElementById("closeAlertBtn")
        .addEventListener("click", hideAlert);

    document.getElementById("cancelBtn")
        .addEventListener("click", resetForm);

    document.getElementById("refreshBtn")
        .addEventListener("click", loadUsers);

    // Handle edit and delete button clicks using event delegation
    tbody.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const id = Number(button.dataset.userId);

        if (button.dataset.action === "edit") {
            startEditUser(id);
        }

        if (button.dataset.action === "delete") {
            promptDeleteUser(
                id,
                button.dataset.fullName,
                button.dataset.pet
            );
        }
    });

    loadUsers();
});

/**
 * Display a temporary dismissible alert notification.
 */
function showAlert(message, type = "success") {
    const alertBox = document.getElementById("alertBox");
    const alertMessage = document.getElementById("alertMessage");

    alertBox.className = `alert alert-${type} alert-dismissible fade show`;
    alertMessage.textContent = message;
    alertBox.classList.remove("d-none");

    // Auto dismiss after 4 seconds
    setTimeout(() => {
        hideAlert();
    }, 4000);
}

/**
 * Hide the global alert box.
 */
function hideAlert() {
    const alertBox = document.getElementById("alertBox");
    alertBox.classList.add("d-none");
    alertBox.classList.remove("show");
}

/**
 * Get CSS badge class for a given pet type.
 */
function getPetBadgeClass(pet) {
    switch (pet.toLowerCase()) {
        case "dog": return "badge-dog";
        case "cat": return "badge-cat";
        case "rabbit": return "badge-rabbit";
        case "bird": return "badge-bird";
        default: return "badge-other";
    }
}

/**
 * Fetch and display all user records.
 */
async function loadUsers() {
    const tbody = document.getElementById("usersTableBody");

    try {
        const response = await fetch("/api/users");
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Failed to load users");
        }

        const users = result.data || [];

        // Remove existing rows
        tbody.replaceChildren();

        if (users.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 5;
            cell.className = "text-center py-4 text-muted";
            cell.textContent =
                "No users found. Use the form above to add a user.";

            row.appendChild(cell);
            tbody.appendChild(row);

            return;
        }

        users.forEach(user => {
            const row = document.createElement("tr");
            row.id = `user-row-${user.id}`;

            // ID cell
            const idCell = document.createElement("td");
            idCell.textContent = user.id;
            idCell.className = "fw-semibold text-secondary";

            // First name cell
            const fnameCell = document.createElement("td");
            fnameCell.textContent = user.fname;

            // Last name cell
            const lnameCell = document.createElement("td");
            lnameCell.textContent = user.lname;

            // Pet cell
            const petCell = document.createElement("td");
            const petBadge = document.createElement("span");

            petBadge.className =
                `badge badge-pet ${getPetBadgeClass(user.pet)}`;

            petBadge.textContent = user.pet;
            petCell.appendChild(petBadge);

            // Actions cell
            const actionsCell = document.createElement("td");
            actionsCell.className = "text-end pe-3";

            // Edit button
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className =
                "btn btn-outline-primary btn-action me-1";

            editButton.dataset.action = "edit";
            editButton.dataset.userId = user.id;
            editButton.title = "Edit user";

            editButton.textContent = "Edit";

            // Delete button
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className =
                "btn btn-outline-danger btn-action";

            deleteButton.dataset.action = "delete";
            deleteButton.dataset.userId = user.id;
            deleteButton.dataset.fullName =
                `${user.fname} ${user.lname}`;
            deleteButton.dataset.pet = user.pet;
            deleteButton.title = "Delete user";

            deleteButton.textContent = "Delete";

            actionsCell.append(editButton, deleteButton);

            row.append(
                idCell,
                fnameCell,
                lnameCell,
                petCell,
                actionsCell
            );

            tbody.appendChild(row);
        });

    } catch (err) {
        tbody.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.className = "text-center py-4 text-danger";
        cell.textContent = err.message;

        row.appendChild(cell);
        tbody.appendChild(row);
    }
}

/**
 * Handle form submission for both Create (POST) and Update (PUT).
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    const form = document.getElementById("userForm");

    // Client-side validation check
    if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
    }

    const userId = document.getElementById("userId").value;
    const fname = document.getElementById("fname").value.trim();
    const lname = document.getElementById("lname").value.trim();
    const pet = document.getElementById("pet").value;

    const payload = { fname, lname, pet };
    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;

    try {
        let response;
        if (userId) {
            // Update existing user (PUT)
            response = await fetch(`/api/users/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } else {
            // Create new user (POST)
            response = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Operation failed.");
        }

        showAlert(result.message || "Record saved successfully!", "success");
        resetForm();
        loadUsers();
    } catch (err) {
        showAlert(err.message, "danger");
    } finally {
        submitBtn.disabled = false;
    }
}

/**
 * Populate the form with existing user data for editing.
 */
async function startEditUser(id) {
    try {
        const response = await fetch(`/api/users/${id}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Could not retrieve user details.");
        }

        const user = result.data;
        document.getElementById("userId").value = user.id;
        document.getElementById("fname").value = user.fname;
        document.getElementById("lname").value = user.lname;
        document.getElementById("pet").value = user.pet;

        // Update form UI to Edit mode
        document.getElementById("formTitle").textContent = `Edit User #${user.id}`;
        document.getElementById("submitBtn").textContent = "Update User";
        document.getElementById("cancelBtn").classList.remove("d-none");

        // Scroll smoothly to form
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
        showAlert(err.message, "danger");
    }
}

/**
 * Open confirmation modal before deleting.
 */
function promptDeleteUser(id, fullName, pet) {
    deleteTargetId = id;

    const detailsContainer =
        document.getElementById("deleteModalUserDetails");

    detailsContainer.textContent =
        `ID: ${id} | Name: ${fullName} | Pet: ${pet}`;

    deleteModalInstance.show();
}

/**
 * Execute delete request upon user confirmation.
 */
async function executeDelete() {
    if (!deleteTargetId) return;

    const confirmBtn = document.getElementById("confirmDeleteBtn");
    confirmBtn.disabled = true;

    try {
        const response = await fetch(`/api/users/${deleteTargetId}`, {
            method: "DELETE"
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Failed to delete user.");
        }

        deleteModalInstance.hide();
        showAlert(result.message || "User deleted successfully.", "success");

        // If the deleted user is currently loaded in the edit form, reset it
        if (document.getElementById("userId").value === String(deleteTargetId)) {
            resetForm();
        }

        deleteTargetId = null;
        loadUsers();
    } catch (err) {
        deleteModalInstance.hide();
        showAlert(err.message, "danger");
    } finally {
        confirmBtn.disabled = false;
    }
}

/**
 * Reset form back to default "Add User" state.
 */
function resetForm() {
    const form = document.getElementById("userForm");
    form.reset();
    form.classList.remove("was-validated");

    document.getElementById("userId").value = "";
    document.getElementById("formTitle").textContent = "Add User";
    document.getElementById("submitBtn").textContent = "Submit";
    document.getElementById("cancelBtn").classList.add("d-none");
}

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

