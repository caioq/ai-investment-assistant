import { AuthScreen } from "../../../components/auth/AuthScreen";
import { redirectIfAuthenticated } from "../redirect-if-authenticated";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return <AuthScreen startMode="signin" />;
}
