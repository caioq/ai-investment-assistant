import Link from "next/link";

import { RegisterForm } from "../../../components/auth/RegisterForm";
import { redirectIfAuthenticated } from "../redirect-if-authenticated";

export default async function RegisterPage() {
  await redirectIfAuthenticated();

  return (
    <div>
      <h1>Create account</h1>
      <RegisterForm />
      <p>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
