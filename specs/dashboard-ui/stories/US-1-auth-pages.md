# US-1: Sign in and create an account

**Status:** Ready
**Traces to:** spec Goal "Auth pages: login, register, and a logout control in the dashboard shell." / spec AC "Clicking logout calls `POST /auth/logout`, lands on `/login`, and a subsequent direct visit to a `(dashboard)` route redirects back to `/login`" (in `../spec.md`)

As a new or returning investor, I want to create an account and sign in from the web app, so that I can reach my portfolio without hand-crafting a request against the API.

## Tasks

- [x] [T-1: `LoginForm`](../tasks/DASHBOARD_UI_US-1_T-1-login-form.md)
- [x] [T-2: `RegisterForm`](../tasks/DASHBOARD_UI_US-1_T-2-register-form.md)
- [ ] [T-3: `(auth)` routes](../tasks/DASHBOARD_UI_US-1_T-3-auth-routes.md)
- [ ] [T-4: `LogoutButton`](../tasks/DASHBOARD_UI_US-1_T-4-logout-button.md)

## Notes

**The only story that is reachable while logged out**, which is why it lives outside the `(dashboard)` group and its guard. The inverse guard matters too: both pages redirect an already-authenticated visitor to `/`, or a stale `/login` bookmark offers a logged-in user a form to log into the session they already have.

**No token ever touches JavaScript.** `access_token` is an httpOnly cookie the API sets itself; the forms only need the api client's `credentials: 'include'`. If any task here starts reading a token from a response body, the auth spec has been misread.

**Login errors stay generic on purpose.** Distinguishing "no such email" from "wrong password" turns the form into an account-enumeration oracle. Register's `409` is the deliberate exception — the user is choosing that address, so there is nothing to leak.

**Logout closes the loop, and the request is the logout.** `access_token` is httpOnly, so JavaScript cannot clear it — only the server's `Set-Cookie` does. A redirect to `/login` without calling `POST /auth/logout` leaves a fully valid session cookie behind: the user looks logged out and isn't. `T-4`'s test asserts call order for that reason.

`LogoutButton` lives in the `(dashboard)` shell rather than on an auth page, so `T-4` is the one task in this story that depends on `SHARED_T-5`. It was added after the first breakdown pass, when the spec's Goals were amended to include it.
