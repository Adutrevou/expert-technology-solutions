# Expert Technology Solutions Deployment Runbook

## Purpose

This project is currently deployed as a static VPS build. Follow this runbook exactly to avoid reintroducing the broken deployment shape.

## Safe Deployment Rules

- Never deploy `dist/client` for this static setup.
- Use `npm run build:static`.
- Do not change the root layout as part of deployment work unless separately tested.
- Do not touch `/agent` on production unless it has been explicitly implemented, reviewed, and tested.
- Do not expose keys or secrets in repo files, logs, screenshots, or shell history.

## Pre-Deploy Checks

1. Confirm you are on the expected recovery branch or approved release branch.
   `git branch --show-current`
2. Confirm the recovery reference if needed.
   `git rev-parse --short HEAD`
3. Run the local guardrail script.
   `npm run predeploy:check`
4. Build the static output.
   `npm run build:static`
5. Confirm the generated entry file exists.
   `test -f dist/index.html && echo "dist/index.html present"`
6. Confirm the built app contains the correct API base URL.
   `rg -n "https://api.intergrai.co.za" dist`

## Deploy Command

Use this exact command:

```bash
rsync -av --delete --exclude 'server/' --exclude 'uploads/' /root/expert-technology-solutions/dist/ /var/www/experttechnologysolutions.intergrai.co.za/
```

Notes:

- The trailing slashes matter.
- `--exclude 'server/'` and `--exclude 'uploads/'` are required for this static VPS deployment.
- The uploads exclusion protects hosted email and signature images from `rsync --delete`.
- Do not replace this with a `dist/client` deploy path.

## Web Server Reload

After sync, reload Nginx:

```bash
sudo systemctl reload nginx
```

## Post-Deploy Verification

Run these checks after the files are in place:

```bash
curl -I https://experttechnologysolutions.intergrai.co.za/
curl -I https://experttechnologysolutions.intergrai.co.za/leads
curl -I https://experttechnologysolutions.intergrai.co.za/campaigns
```

Expected result:

- Each request should return a successful HTTP response for the static app entry.

Then perform a browser test:

- Open `/`
- Open `/leads`
- Open `/campaigns`
- Confirm the app loads and requests live data from `https://api.intergrai.co.za`
- Confirm no broken `/agent` flow appears in navigation or routing

## Rollback

If the deployment is bad and you need to return to the last confirmed working state, rebuild from commit `99f3c13` and redeploy:

```bash
git checkout 99f3c13
npm run build:static
rsync -av --delete --exclude 'server/' --exclude 'uploads/' /root/expert-technology-solutions/dist/ /var/www/experttechnologysolutions.intergrai.co.za/
sudo systemctl reload nginx
```

After rollback:

- Re-run the curl checks for `/`, `/leads`, and `/campaigns`
- Browser test the production site again

## Operator Notes

- Current confirmed working branch: `stable-production-recovery`
- Current confirmed working commit: `99f3c13`
- Static env value required for VPS build:
  `VITE_LEADS_API_BASE_URL=https://api.intergrai.co.za`
