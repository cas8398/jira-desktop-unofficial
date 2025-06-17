import { invoke } from "@tauri-apps/api/core";

export async function openWebsiteInNewWindow(url) {
  try {
    await invoke("open_website_window", { url: url });
    console.log(`Successfully opened window for URL: ${url}`);
  } catch (error) {
    console.error(`Failed to open window for URL: ${url}`, error);
  }
}
