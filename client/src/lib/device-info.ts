export interface DeviceInfo {
  deviceType: string;
  os: string;
  browser: string;
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  language: string;
  deviceFingerprint?: string;
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (/Windows NT 10/i.test(ua)) return "Windows 10";
  if (/Windows NT 6.3/i.test(ua)) return "Windows 8.1";
  if (/Windows NT 6.2/i.test(ua)) return "Windows 8";
  if (/Windows NT 6.1/i.test(ua)) return "Windows 7";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown";
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (/Edg/i.test(ua)) return "Edge";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Opera|OPR/i.test(ua)) return "Opera";
  if (/MSIE|Trident/i.test(ua)) return "IE";
  return "Unknown";
}

function detectDeviceType(): string {
  const ua = navigator.userAgent;
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) return "mobile";
  return "desktop";
}

function generateSessionId(): string {
  // Generate a random session identifier (not a fingerprint)
  // This is privacy-friendly and doesn't track users across sessions
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getDeviceInfo(): DeviceInfo {
  return {
    deviceType: detectDeviceType(),
    os: detectOS(),
    browser: detectBrowser(),
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language,
    deviceFingerprint: generateSessionId(),
  };
}

export function getStoredSessionToken(shopId: string): string | null {
  try {
    return localStorage.getItem(`hdos_session_${shopId}`);
  } catch {
    return null;
  }
}

export function storeSessionToken(shopId: string, token: string): void {
  try {
    localStorage.setItem(`hdos_session_${shopId}`, token);
  } catch {
    // localStorage may not be available
  }
}

export function getStoredCustomer(shopId: string): { id: string; name: string; phone: string } | null {
  try {
    const data = localStorage.getItem(`hdos_customer_${shopId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function storeCustomer(shopId: string, customer: { id: string; name: string; phone: string }): void {
  try {
    localStorage.setItem(`hdos_customer_${shopId}`, JSON.stringify(customer));
  } catch {
    // localStorage may not be available
  }
}

export function clearStoredCustomer(shopId: string): void {
  try {
    localStorage.removeItem(`hdos_customer_${shopId}`);
  } catch {
    // ignore
  }
}
