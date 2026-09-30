import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { get, ref, update } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

const adminName = document.getElementById("adminName");
const totalReports = document.getElementById("totalReports");
const totalPickups = document.getElementById("totalPickups");
const resolvedReports = document.getElementById("resolvedReports");
const totalCitizens = document.getElementById("totalCitizens");
const reportsTable = document.getElementById("reportsTable");
const pickupsTable = document.getElementById("pickupsTable");
const cleanlinessScore = document.getElementById("cleanlinessScore");
const activityList = document.getElementById("activityList");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {
        const userSnapshot = await get(ref(db, `users/${user.uid}`));
        const userData = userSnapshot.val();

        if (!userData || String(userData.role).toLowerCase() !== "admin") {
            alert("Admin access required.");
            window.location.href = "citizen.html";
            return;
        }

        adminName.textContent = userData.name || "Administrator";
        await Promise.all([
            loadReports(),
            loadPickups(),
            loadCitizens(),
            loadActivity()
        ]);
    } catch (error) {
        console.error("Admin check error:", error);
        alert("Unable to load admin dashboard.");
    }
});

async function loadReports() {
    try {
        const snapshot = await get(ref(db, "reports"));
        const reports = Object.entries(snapshot.val() || {}).map(([id, report]) => ({
            id,
            ...report
        }));

        reports.sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));
        const resolved = reports.filter(
            (report) => String(report.status || "").toLowerCase() === "resolved"
        ).length;

        totalReports.textContent = String(reports.length);
        resolvedReports.textContent = String(resolved);
        cleanlinessScore.textContent = reports.length
            ? `${Math.round((resolved / reports.length) * 100)}%`
            : "0%";

        reportsTable.innerHTML = reports.length
            ? reports.slice(0, 10).map(createReportRow).join("")
            : emptyRow(7, "No waste reports found.");
    } catch (error) {
        console.error("Reports error:", error);
        reportsTable.innerHTML = emptyRow(7, "Unable to load reports.");
    }
}

function createReportRow(report) {
    const status = String(report.status || "pending").toLowerCase();
    const statuses = ["pending", "reviewed", "in-progress", "resolved", "rejected"];
    const options = statuses.map((value) => `
        <option value="${value}" ${status === value ? "selected" : ""}>
            ${value.replace("-", " ").replace(/^./, (letter) => letter.toUpperCase())}
        </option>
    `).join("");

    return `
        <tr>
            <td><strong>${escapeHTML(`ET-${String(report.id).slice(-6).toUpperCase()}`)}</strong></td>
            <td>${escapeHTML(report.category || "-")}</td>
            <td>${escapeHTML(report.location || "-")}</td>
            <td>${escapeHTML(report.area || "-")}</td>
            <td>${escapeHTML(report.severity || "-")}</td>
            <td>
                <select id="reportStatus-${escapeHTML(report.id)}">${options}</select>
            </td>
            <td>
                <button class="save-btn" type="button" data-save-report="${escapeHTML(report.id)}">
                    Save
                </button>
            </td>
        </tr>
    `;
}

async function loadPickups() {
    try {
        const snapshot = await get(ref(db, "pickupRequests"));
        const pickups = Object.entries(snapshot.val() || {}).map(([id, pickup]) => ({
            id,
            ...pickup
        }));

        pickups.sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));
        totalPickups.textContent = String(pickups.length);
        pickupsTable.innerHTML = pickups.length
            ? pickups.slice(0, 10).map(createPickupRow).join("")
            : emptyRow(8, "No pickup requests found.");
    } catch (error) {
        console.error("Pickup requests error:", error);
        pickupsTable.innerHTML = emptyRow(8, "Unable to load pickup requests.");
    }
}

function createPickupRow(pickup) {
    const status = String(pickup.status || "pending").toLowerCase();
    const statuses = ["pending", "scheduled", "picked-up", "rejected"];
    const options = statuses.map((value) => `
        <option value="${value}" ${status === value ? "selected" : ""}>
            ${value.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase())}
        </option>
    `).join("");

    return `
        <tr>
            <td><strong>${escapeHTML(`PK-${String(pickup.id).slice(-6).toUpperCase()}`)}</strong></td>
            <td>${escapeHTML(pickup.wasteType || "-")}</td>
            <td>${escapeHTML(pickup.address || "-")}</td>
            <td>${escapeHTML(pickup.area || "-")}</td>
            <td>${escapeHTML(pickup.date || "-")}</td>
            <td>${escapeHTML(pickup.time || "-")}</td>
            <td>
                <select id="pickupStatus-${escapeHTML(pickup.id)}">${options}</select>
            </td>
            <td>
                <button class="save-btn" type="button" data-save-pickup="${escapeHTML(pickup.id)}">
                    Save
                </button>
            </td>
        </tr>
    `;
}

async function loadCitizens() {
    try {
        const snapshot = await get(ref(db, "users"));
        const users = Object.values(snapshot.val() || {});
        totalCitizens.textContent = String(
            users.filter((userData) => String(userData.role || "").toLowerCase() !== "admin").length
        );
    } catch (error) {
        console.error("Citizens error:", error);
        totalCitizens.textContent = "0";
    }
}

async function loadActivity() {
    try {
        const [reportsSnapshot, pickupsSnapshot] = await Promise.all([
            get(ref(db, "reports")),
            get(ref(db, "pickupRequests"))
        ]);
        const activities = [];

        Object.values(reportsSnapshot.val() || {}).forEach((report) => {
            activities.push({
                type: "report",
                title: "Waste report submitted",
                detail: report.category || "Waste Report",
                time: toTimestamp(report.createdAt)
            });
        });

        Object.values(pickupsSnapshot.val() || {}).forEach((pickup) => {
            activities.push({
                type: "pickup",
                title: "Pickup request submitted",
                detail: pickup.wasteType || "Pickup Request",
                time: toTimestamp(pickup.createdAt)
            });
        });

        activities.sort((a, b) => b.time - a.time);
        activityList.innerHTML = activities.length
            ? activities.slice(0, 6).map((activity) => `
                <div class="activity">
                    <div class="activity-icon">${activity.type === "report" ? "📋" : "🚛"}</div>
                    <div class="activity-text">
                        <strong>${escapeHTML(activity.title)}</strong>
                        <p>${escapeHTML(activity.detail)}</p>
                    </div>
                </div>
            `).join("")
            : '<div class="empty">No recent activity found.</div>';
    } catch (error) {
        console.error("Activity error:", error);
        activityList.innerHTML = '<div class="empty">Unable to load recent activity.</div>';
    }
}

reportsTable.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-save-report]");
    if (!button) return;

    const reportId = button.dataset.saveReport;
    const status = document.getElementById(`reportStatus-${reportId}`)?.value;
    if (!status) return;

    button.disabled = true;
    try {
        await update(ref(db, `reports/${reportId}`), {
            status,
            updatedAt: Date.now()
        });
        await loadReports();
        alert("Report updated successfully.");
    } catch (error) {
        console.error("Save report error:", error);
        alert("Unable to update report.");
    } finally {
        button.disabled = false;
    }
});

pickupsTable.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-save-pickup]");
    if (!button) return;

    const pickupId = button.dataset.savePickup;
    const status = document.getElementById(`pickupStatus-${pickupId}`)?.value;
    if (!status) return;

    button.disabled = true;
    try {
        await update(ref(db, `pickupRequests/${pickupId}`), {
            status,
            updatedAt: Date.now()
        });
        await loadPickups();
        alert("Pickup request updated successfully.");
    } catch (error) {
        console.error("Save pickup error:", error);
        alert("Unable to update pickup request.");
    } finally {
        button.disabled = false;
    }
});

function emptyRow(columnCount, message) {
    return `<tr><td colspan="${columnCount}" class="empty">${escapeHTML(message)}</td></tr>`;
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function toTimestamp(value) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
    const parsed = Date.parse(value || "");
    return Number.isNaN(parsed) ? 0 : parsed;
}

window.goTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
window.scrollToReports = () => document.getElementById("reportsSection").scrollIntoView({ behavior: "smooth" });
window.scrollToPickups = () => document.getElementById("pickupsSection").scrollIntoView({ behavior: "smooth" });
window.scrollToActivity = () => document.getElementById("activitySection").scrollIntoView({ behavior: "smooth" });

logoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout error:", error);
        alert("Unable to logout. Please try again.");
    }
});
