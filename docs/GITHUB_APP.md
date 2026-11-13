# Setting up GitHub sign-in (project owner, once)

`vibe-rails connect` signs the user in to GitHub by having them type a short code on github.com. For that, GitHub needs to know which app is asking. Until this is set up, `connect` falls back to manual instructions.

1. On GitHub, go to **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in: name `Vibe Rails`, homepage `https://github.com/AmirHoseinSafari/Vibe-Rails`, callback URL the same address (it is not used).
3. Tick **Enable Device Flow**. **Expire user access tokens** can stay ticked: the tool renews sign-ins by itself.
4. Copy the **Client ID** (it looks like `Ov23li...`). It is public, not a secret. Do **not** create or share a client secret; the device flow does not need one.
5. Put the Client ID in `BUILT_IN_CLIENT_ID` in `src/lib/github.js`.

Done on 2026-11-12: the app is registered and its Client ID is built in. A fork that wants its own app repeats these steps, or sets `VIBE_RAILS_GITHUB_CLIENT_ID=<id>` to try one without changing the code.

What the app can do: it asks for the `repo` permission, which lets the tool create the user's private repository. The sign-in is stored by git's own credential storage on the user's computer (the Keychain on a Mac); With expiry on, a sign-in lasts eight hours and is renewed before each upload; the renewal token is kept in the same storage. Vibe Rails never writes either to a file of its own and never sends them anywhere except GitHub.
