import { removeBackground } from "@imgly/background-removal";

self.onmessage = async (e: MessageEvent) => {
  const { imageUrl } = e.data;
  if (!imageUrl) return;

  try {
    const imageBlob = await removeBackground(imageUrl);
    self.postMessage({ success: true, blob: imageBlob });
  } catch (error: any) {
    self.postMessage({ success: false, error: error?.message || "Unknown error" });
  }
};
