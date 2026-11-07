// Minimal Flask + PostgreSQL CRUD Application Frontend Logic

let deleteTargetId = null;
let deleteModalInstance = null;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    deleteModalInstance = new bootstrap.Modal(document.getElementById("deleteConfirmModal"));
    loadUsers();

    // Attach form submit handler
    const form = document.getElementById("userForm");
    form.addEventListener("submit", handleFormSubmit);

    // Attach modal confirm delete handler
    document.getElementById("confirmDeleteBtn").addEventListener("click", executeDelete);
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
        tbody.innerHTML = "";

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted">
                        <i class="bi bi-inbox fs-3 d-block mb-1"></i>
                        No users found. Use the form above to add a user.
                    </td>
                </tr>
            `;
            return;
        }

        users.forEach(user => {
            const tr = document.createElement("tr");
            tr.id = `user-row-${user.id}`;
            tr.innerHTML = `
                <td class="fw-semibold text-secondary">${escapeHtml(String(user.id))}</td>
                <td>${escapeHtml(user.fname)}</td>
                <td>${escapeHtml(user.lname)}</td>
                <td>
                    <span class="badge badge-pet ${getPetBadgeClass(user.pet)}">
                        ${escapeHtml(user.pet)}
                    </span>
                </td>
                <td class="text-end pe-3">
                    <button class="btn btn-outline-primary btn-action me-1" onclick="startEditUser(${user.id})" title="Edit user">
                        <i class="bi bi-pencil-square me-1"></i>Edit
                    </button>
                    <button class="btn btn-outline-danger btn-action" onclick="promptDeleteUser(${user.id}, '${escapeHtml(user.fname)} ${escapeHtml(user.lname)}', '${escapeHtml(user.pet)}')" title="Delete user">
                        <i class="bi bi-trash me-1"></i>Delete
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-danger">
                    <i class="bi bi-exclamation-triangle fs-4 d-block mb-1"></i>
                    ${escapeHtml(err.message)}
                </td>
            </tr>
        `;
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
        document.getElementById("formTitle").innerHTML = `<i class="bi bi-pencil-square me-2 text-primary"></i>Edit User #${user.id}`;
        document.getElementById("submitBtn").innerHTML = `<i class="bi bi-save me-1"></i> Update User`;
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
    const detailsContainer = document.getElementById("deleteModalUserDetails");
    detailsContainer.innerHTML = `<strong>ID:</strong> ${id} &nbsp;|&nbsp; <strong>Name:</strong> ${fullName} &nbsp;|&nbsp; <strong>Pet:</strong> ${pet}`;
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
    document.getElementById("formTitle").innerHTML = `<i class="bi bi-person-plus me-2 text-primary"></i>Add User`;
    document.getElementById("submitBtn").innerHTML = `<i class="bi bi-check-circle me-1"></i> Submit`;
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

