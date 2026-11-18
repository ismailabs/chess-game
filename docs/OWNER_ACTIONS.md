# OWNER_ACTIONS.md — Manual Owner Handover Checklist

This document contains only the actions that the owner must perform manually (items that require external account access, personal devices, or third-party platform caches). All code, database schema migrations, and Edge Function deployments are handled directly by the agent.

---

## 1. Environment & Auth Configuration (Vercel & Google Cloud)
- [ ] **Verify Vercel Environment Variables:**
  - `VITE_SUPABASE_URL`: Check that this matches `https://fhlpgtkftfhqcgppfnud.supabase.co`.
  - `VITE_SUPABASE_PUBLISHABLE_KEY`: Check that the anon key is set.
- [ ] **Google OAuth Redirect URLs in Supabase Dashboard:**
  - Supabase Auth > URL Configuration > Site URL: `https://chess.ismailstudio.my`
  - Redirect URLs: `https://chess.ismailstudio.my/**`, `http://localhost:5173/**`

---

## 2. WhatsApp Social Preview Check
- [ ] Send the link `https://chess.ismailstudio.my?v=2` to yourself or a test chat on WhatsApp on your mobile phone.
- [ ] Verify that:
  - The preview card appears with the new pawn logo and board graphic.
  - The title reads: **Chess | Ismail Studio**
  - The description reads: **Play chess. Get better. Challenge friends, beat bots at your level, and climb the ladder.**
  - There is no awkward image cropping or illegible text.
  *Note:* WhatsApp aggressively caches link previews by URL. If an older preview is still showing, increment the query parameter (e.g. `?v=3`).

---

## 3. Favicon & Appearance on Real Device
- [ ] Open `https://chess.ismailstudio.my` in Chrome on Android / Safari on iOS:
  - Check tab bar favicon in Light system theme.
  - Check tab bar favicon in Dark system theme.
  - Add to Home Screen (PWA install) and verify the pawn app icon and splash screen.

---

## 4. MCP Exception Log
*If any MCP operation cannot be executed automatically during the run, it will be recorded here with the exact SQL or command needed.*

*(None currently. All migrations and functions configured for direct deployment via Supabase MCP).*
