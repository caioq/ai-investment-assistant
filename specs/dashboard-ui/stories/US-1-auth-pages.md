# US-1: Sign in and create an account

**Status:** Ready
**Traces to:** spec Goal "Auth pages: login, register" (in `../spec.md`)

As a new or returning investor, I want to create an account and sign in from the web app, so that I can reach my portfolio without hand-crafting a request against the API.

## Tasks

- [ ] [T-1: `LoginForm`](../tasks/DASHBOARD_UI_US-1_T-1-login-form.md)
- [ ] [T-2: `RegisterForm`](../tasks/DASHBOARD_UI_US-1_T-2-register-form.md)
- [ ] [T-3: `(auth)` routes](../tasks/DASHBOARD_UI_US-1_T-3-auth-routes.md)

## Notes

**The only story that is reachable while logged out**, which is why it lives outside the `(dashboard)` group and its guard. The inverse guard matters too: both pages redirect an already-authenticated visitor to `/`, or a stale `/login` bookmark offers a logged-in user a form to log into the session they already have.

**No token ever touches JavaScript.** `access_token` is an httpOnly cookie the API sets itself; the forms only need the api client's `credentials: 'include'`. If any task here starts reading a token from a response body, the auth spec has been misread.

**Login errors stay generic on purpose.** Distinguishing "no such email" from "wrong password" turns the form into an account-enumeration oracle. Register's `409` is the deliberate exception — the user is choosing that address, so there is nothing to leak.

**Logout is not in this story.** The [auth](../../auth/spec.md) spec defines `POST /auth/logout`, but this module's Goals and component list don't include a logout control, so there's nowhere specified to put one. See the index's "Flagged for you".
