# Setting up GitHub sign-in (project owner, once)

`vibe-rails connect` signs the user in to GitHub by having them type a short code on github.com. For that, GitHub needs to know which app is asking. Until this is set up, `connect` falls back to manual instructions.

1. On GitHub, go to **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in: name `Vibe Rails`, homepage `https://github.com/AmirHoseinSafari/Vibe-Rails`, callback URL the same address (it is not used).
3. After creating it, tick **Enable Device Flow** and save.
4. Copy the **Client ID** (it looks like `Ov23li...`). It is public, not a secret. Do **not** create or share a client secret; the device flow does not need one.
5. Put the Client ID in `BUILT_IN_CLIENT_ID` in `src/lib/github.js`.

To try it before step 5: `VIBE_RAILS_GITHUB_CLIENT_ID=<id> vibe-rails connect` inside a test project.

What the app can do: it asks for the `repo` permission, which lets the tool create the user's private repository. The sign-in is stored by git's own credential storage on the user's computer (the Keychain on a Mac); Vibe Rails never writes it to a file of its own and never sends it anywhere except GitHub.
