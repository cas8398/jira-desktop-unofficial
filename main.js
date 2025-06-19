// main.js
import { openWebsiteInNewWindow } from "./src/utils/window_utils.js";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getVersion } from "@tauri-apps/api/app";

// Put all DOM element queries and related logic inside the DOMContentLoaded listener
document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const instanceName = document.getElementById("instanceName");
  const instanceUrl = document.getElementById("instanceUrl");
  const saveBtn = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const addNewBtn = document.getElementById("addNewBtn");
  const urlInputContainer = document.getElementById("url-input-container");
  const savedUrlsContainer = document.getElementById("saved-urls-container");
  const instancesList = document.getElementById("instancesList");
  const errorDiv = document.getElementById("error");
  const githubLink = document.getElementById("github-link");
  const maintainerLink = document.getElementById("maintainer-link");
  const versionApp = document.getElementById("version-app");

  // --- Add Null Checks (Good Practice) ---
  if (!instanceName || !saveBtn || !instancesList) {
    console.error("Critical DOM elements not found! Check your HTML IDs.");
    return;
  }

  // Show/hide forms
  function showAddForm() {
    // Ensure elements exist before trying to access .style
    if (urlInputContainer) urlInputContainer.style.display = "block";
    if (savedUrlsContainer) savedUrlsContainer.style.display = "none";
    if (instanceName) instanceName.value = "";
    if (instanceUrl) instanceUrl.value = "";
    if (errorDiv) errorDiv.textContent = "";
  }

  function showSavedList() {
    if (urlInputContainer) urlInputContainer.style.display = "none";
    if (savedUrlsContainer) savedUrlsContainer.style.display = "block";
  }

  // Load instances from localStorage
  function loadInstances() {
    const data = localStorage.getItem("jiraInstances");
    return data ? JSON.parse(data) : [];
  }

  // Save instances to localStorage
  function saveInstances(instances) {
    localStorage.setItem("jiraInstances", JSON.stringify(instances));
  }

  // Render instances list
  function renderInstances() {
    if (!instancesList) return; // Null check for instancesList
    instancesList.innerHTML = "";
    const instances = loadInstances();

    if (instances.length === 0) {
      instancesList.innerHTML = "<li>No saved instances yet</li>";
      return;
    }

    instances.forEach((instance, index) => {
      const li = document.createElement("li");
      li.className = "saved-item";

      const span = document.createElement("span");
      span.classList.add("instance-url");
      span.textContent = `${instance.name} (${instance.url})`;
      span.onclick = () => openWebsiteInNewWindow(instance.url);
      //span.onclick = () => window.location.href = instance.url;

      const deleteBtn = document.createElement("button");
      deleteBtn.classList.add("warning");
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = (e) => {
        e.stopPropagation();

        // Create a custom modal dialog
        const modal = document.createElement("div");
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.backgroundColor = "rgba(0,0,0,0.5)";
        modal.style.display = "flex";
        modal.style.justifyContent = "center";
        modal.style.alignItems = "center";
        modal.style.zIndex = "1000";

        modal.innerHTML = `
          <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px;">
            <h3>Jira Desktop Unofficial</h3>
            <p>Are you sure you want to delete "${instance.name}"?</p>
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
              <button id="confirmCancel" class="warning">Cancel</button>
              <button id="confirmDelete" class="danger">Delete</button>
            </div>
          </div>
        `;

        document.body.appendChild(modal);

        // Handle button clicks - make sure to get them *after* appending modal to DOM
        const confirmCancelBtn = modal.querySelector("#confirmCancel");
        const confirmDeleteBtn = modal.querySelector("#confirmDelete");

        if (confirmCancelBtn) {
          confirmCancelBtn.onclick = () => {
            document.body.removeChild(modal);
          };
        }

        if (confirmDeleteBtn) {
          confirmDeleteBtn.onclick = () => {
            document.body.removeChild(modal);
            deleteInstance(index);
          };
        }
      };

      li.appendChild(span);
      li.appendChild(deleteBtn);
      instancesList.appendChild(li);
    });
  }

  // Delete an instance
  function deleteInstance(index) {
    const instances = loadInstances();
    instances.splice(index, 1);
    saveInstances(instances);
    renderInstances();
  }

  // Validate Jira URL
  function isValidJiraUrl(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.toLowerCase();

      // Basic Jira domain checks
      const isCloud = host.endsWith(".atlassian.net");
      const isCustom = host.includes("jira.") || host.endsWith(".jira.com");

      // Optional: also check if it's pointing to an issue or project
      const looksLikeJiraPath =
        path.startsWith("/browse/") || path.includes("/projects/");

      return (isCloud || isCustom) && path.length > 1; // basic path check
    } catch {
      return false;
    }
  }
  function addInstance() {
    const name = instanceName ? instanceName.value.trim() : "";
    const url = instanceUrl ? instanceUrl.value.trim() : "";

    if (!name || !url) {
      if (errorDiv) errorDiv.textContent = "Please fill in all fields";
      return;
    }

    try {
      new URL(url); // Basic URL validation
    } catch {
      if (errorDiv) errorDiv.textContent = "Please enter a valid URL";
      return;
    }

    if (!isValidJiraUrl(url)) {
      if (errorDiv) errorDiv.textContent = "This is not a valid Jira URL";
      return;
    }

    const instances = loadInstances();
    instances.push({ name, url });
    saveInstances(instances);

    renderInstances();
    showSavedList();

    // Clear the input and error message
    if (instanceName) instanceName.value = "";
    if (instanceUrl) instanceUrl.value = "";
    if (errorDiv) errorDiv.textContent = "";
  }

  // Event listeners - ensure buttons exist before adding listeners
  if (saveBtn) saveBtn.addEventListener("click", addInstance);
  if (cancelBtn) cancelBtn.addEventListener("click", showSavedList);
  if (addNewBtn) addNewBtn.addEventListener("click", showAddForm);
  if (versionApp) {
    getVersion()
      .then((version) => {
        versionApp.textContent = `v${version}`;
      })
      .catch((err) => {
        versionApp.textContent = "Version unavailable";
        console.error("Failed to get version:", err);
      });
  }

  githubLink?.addEventListener("click", () =>
    openUrl("https://github.com/cas8398/jira-desktop-unofficial")
  );

  maintainerLink?.addEventListener("click", () =>
    openUrl("https://github.com/cas8398")
  );

  // Initial load
  renderInstances();
  showSavedList();
});
