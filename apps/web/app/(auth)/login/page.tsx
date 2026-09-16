import Link from "next/link";

import { LoginForm } from "../../../components/auth/LoginForm";
import { redirectIfAuthenticated } from "../redirect-if-authenticated";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <div>
      <h1>Log in</h1>
      <LoginForm />
      <p>
        Don&apos;t have an account? <Link href="/register">Register</Link>
      </p>
    </div>
  );
}
