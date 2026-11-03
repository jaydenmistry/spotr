# Backups

Spotr's data lives in one SQLite file, `/app/data/prod.db`, on the Dokploy volume mounted at `/app/data`. Losing that volume means losing every lead, note, follow-up and account, so it's backed up in two layers.

The Spotr app in Dokploy needs a named volume mount at `/app/data` (Advanced → Volumes, a Volume Mount named something like `spotr-data`). Without one, Docker gives each new container its own empty, unnamed volume (the Dockerfile declares `VOLUME ["/app/data"]`), so every deploy would start from an empty database and Dokploy's volume backup would have no volume to pick.

## On the server (automatic)

`prisma/backup.js` writes one copy of the database per day to `/app/data/backups/prod-YYYY-MM-DD.db` and keeps the newest 7. The container's entrypoint runs it once an hour in the background, and a run does nothing once today's copy exists, so a deploy or restart never adds an extra one. Each copy is written with `VACUUM INTO`, which gives a consistent file while the app is running (writes wait a moment until the copy finishes), and it's checked with `PRAGMA quick_check` before it replaces anything. The Dokploy log shows `Saved a backup to ...` once a day, or `Backup failed: ...` if something went wrong.

Separately, `prisma/migrate.js` saves `prod.db.pre-migrate-<time>` next to the database before applying a migration. It keeps the newest 3, and the daily backup deletes any that are over 14 days old.

Backup files are readable by the container's owner only, since they hold password hashes and lead data.

The first run of each UTC day takes the copy, so a restore can lose up to a day of changes. These copies are on the same disk as the database, so they cover a bad migration or a mistaken deletion, not a lost server. `/api/health/backups` returns 200 while the newest copy is under 26 hours old, and 503 when it's older, missing, or can't be checked. `.github/workflows/uptime.yml` checks it and `/api/health` every 30 minutes, and GitHub emails you when a run fails (Settings → Notifications → Actions on GitHub controls that email). Any other uptime monitor pointed at both URLs works too. It's separate from `/api/health` on purpose: Docker's healthcheck uses that one, and a backup problem shouldn't get the app restarted.

## Off the server (set up once in Dokploy)

1. **Create an R2 bucket** in Cloudflare (for example `spotr-backups`), and an R2 API token with read and write access to that bucket only.
2. **Add an S3 destination** in Dokploy (Settings → S3 Destinations) with the bucket name, the R2 endpoint `https://<account id>.r2.cloudflarestorage.com`, region `auto`, and the token's access key and secret.
3. **Add a volume backup** on the Spotr app for the volume mounted at `/app/data`, sending to that destination daily and keeping 14.
4. **Test a restore** once (below), so you know the steps work before you need them.
5. **Turn on failure notifications** for backups in Dokploy (Settings → Notifications) if your version offers them for volume backups. `/api/health/backups` only watches the copies on the server, not the uploads to R2.

Back up the whole volume. The files in `backups/` are the ones to restore from, since `prod.db` itself might be copied mid-write.

## How long deleted data survives

A seller deletion (docs/seller-data-requests.md) removes the rows from `prod.db` straight away, but copies made before it still have them:

| Copy | Kept | Gone after the deletion |
| --- | --- | --- |
| Daily copies in `backups/` | newest 7 | about 7 days |
| `prod.db.pre-migrate-*` | newest 3, max 14 days old | at most 14 days |
| Dokploy volume backups in R2 | 14 | about 14 days after the last local copy with the row is gone, so up to about 4 weeks |
| `prod.db.broken-*` from a restore | until you delete it | delete it once the restore is confirmed |

## Restoring

1. Stop the Spotr app in Dokploy.
2. In a terminal on the volume, keep the current file in case you need it, then put the backup in its place:

   ```sh
   cd /app/data
   mv prod.db prod.db.broken-$(date +%F)
   rm -f prod.db-journal prod.db-wal prod.db-shm
   cp backups/prod-2026-11-03.db prod.db
   ```

   For an off-server copy, download it from R2 first and copy it in the same way.
3. Start the app. `migrate.js` applies any migrations newer than the backup, the seed re-applies `ADMIN_PASSWORD`, and `/api/health` should return ok.
4. Sign everyone out, because sessions revoked after the backup was taken are valid again in the old file:

   ```sh
   node -e 'new (require("@prisma/client").PrismaClient)().user.updateMany({ data: { sessionVersion: { increment: 1 } } }).then(() => console.log("done"))'
   ```
5. Re-run every seller deletion recorded after the backup's date (the request log from docs/seller-data-requests.md, step 4). The restored file still has those rows, and their VINs are missing from the suppression list.
6. Once everything checks out, delete the `prod.db.broken-*` file.
