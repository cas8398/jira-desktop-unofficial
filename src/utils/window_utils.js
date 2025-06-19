import { invoke } from "@tauri-apps/api/core";

export async function openWebsiteInNewWindow(url) {
  try {
    await invoke("open_website_window", { url });
    console.log("Opened new window:", url);
  } catch (error) {
    console.error("Failed to open window:", error);
  }
}
