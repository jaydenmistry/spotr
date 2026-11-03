# Backups

Spotr's data lives in one SQLite file, `/app/data/prod.db`, on the Dokploy volume mounted at `/app/data`. Losing that volume means losing every lead, note, follow-up and account, so it's backed up in two layers.

## On the server (automatic)

`prisma/backup.js` writes one copy of the database per day to `/app/data/backups/prod-YYYY-MM-DD.db` and keeps the newest 7. The container's entrypoint runs it once an hour in the background, and a run does nothing once today's copy exists, so a deploy or restart never adds an extra one. Each copy is written with `VACUUM INTO`, which gives a consistent file even while the app is writing, and it's checked with `PRAGMA quick_check` before it replaces anything. The Dokploy log shows `Saved a backup to ...` once a day, or `Backup failed: ...` if something went wrong.

Separately, `prisma/migrate.js` saves `prod.db.pre-migrate-<time>` next to the database before applying a migration, and keeps the newest 3.

These copies are on the same disk as the database, so they cover a bad migration or a mistaken deletion, not a lost server.

## Off the server (set up once in Dokploy)

1. **Create an R2 bucket** in Cloudflare (for example `spotr-backups`), and an R2 API token with read and write access to that bucket only.
2. **Add an S3 destination** in Dokploy (Settings → S3 Destinations) with the bucket name, the R2 endpoint `https://<account id>.r2.cloudflarestorage.com`, region `auto`, and the token's access key and secret.
3. **Add a volume backup** on the Spotr app for the volume mounted at `/app/data`, sending to that destination daily and keeping 14.
4. **Test a restore** once (below), so you know the steps work before you need them.

Back up the whole volume. The files in `backups/` are the ones to restore from, since `prod.db` itself might be copied mid-write.

## Restoring

1. Stop the Spotr app in Dokploy.
2. In a terminal on the volume, keep the current file in case you need it, then put the backup in its place:

   ```sh
   cd /app/data
   mv prod.db prod.db.broken-$(date +%F)
   rm -f prod.db-journal
   cp backups/prod-2026-11-03.db prod.db
   ```

   For an off-server copy, download it from R2 first and copy it in the same way.
3. Start the app. `migrate.js` applies any migrations newer than the backup, and `/api/health` should return ok.
4. Re-run any seller deletions handled after the backup was taken (docs/seller-data-requests.md), because the restored file still has those rows.
