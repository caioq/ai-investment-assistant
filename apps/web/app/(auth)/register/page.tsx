import { AuthScreen } from "../../../components/auth/AuthScreen";
import { redirectIfAuthenticated } from "../redirect-if-authenticated";

export default async function RegisterPage() {
  await redirectIfAuthenticated();

  return <AuthScreen startMode="signup" />;
}
