export function getDeviceInfo() {
  const ua = navigator.userAgent;
  
  let os = "Unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  let browser = "Unknown";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  
  const deviceType = /Mobile|Android|iPhone|iPad|iPod/i.test(ua) ? "Mobile" : "Desktop";
  
  return { os, browser, deviceType, userAgent: ua };
}

export async function trackPageVisit(page: string, shopId?: string | null) {
  try {
    const { os, browser, deviceType, userAgent } = getDeviceInfo();
    
    await fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page,
        shopId: shopId || null,
        os,
        browser,
        deviceType,
        userAgent,
      }),
    });
  } catch (error) {
    console.error("Failed to track visit:", error);
  }
}
