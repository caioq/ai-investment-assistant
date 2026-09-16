"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api-client";
import { Button } from "../ui/Button";

const LOGOUT_FAILED_NOTICE =
  "We couldn't reach the server to log you out, but you've been signed out on this device.";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleLogout() {
    setIsLoggingOut(true);

    // The request is the logout: access_token is httpOnly, so only the
    // server's Set-Cookie can clear it. A failed request still redirects
    // locally below — leaving the user parked on an authenticated screen
    // because the network/server is down is the worse outcome.
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      setNotice(LOGOUT_FAILED_NOTICE);
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {notice !== null && <p role="status">{notice}</p>}
      <Button
        type="button"
        variant="ghost"
        disabled={isLoggingOut}
        onClick={handleLogout}
      >
        Log out
      </Button>
    </>
  );
}
