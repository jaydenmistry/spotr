# Seller data requests

How to handle a seller (or anyone else whose vehicle shows up in Spotr) asking for their data to be deleted. Requests come in through hello@spotrcars.com, which the privacy page lists as the contact.

## What Spotr holds about a seller

Spotr doesn't collect seller contact details. For each listing it keeps what the Marketcheck feed provides: the VIN, vehicle details, asking price, city and state, listing URL, photo URL, and the seller name the listing shows (`sellerName`, usually a dealer). On top of that it can hold buyer-written notes, follow-ups and offers (`Lead` and `Activity` rows), and practice-chat transcripts (`Message` rows), which can mention the vehicle.

## Steps

1. **Confirm the request.** Ask for the VIN or the listing URL. A name alone isn't enough to find the right row, and it risks deleting someone else's data.
2. **Find the lead.** In Dokploy, open the Spotr app, go to its terminal, and run a dry run. It lists what matches and deletes nothing:

   ```sh
   node scripts/delete-seller-data.mjs --vin <VIN>
   ```

   If you only have a listing URL, find the lead in the dashboard's inventory search first and use its VIN. If nothing matches, the seller's listing just hasn't been pulled yet. Running the same command with `--confirm` still adds the VIN to the suppression list, so it never will be.
3. **Delete it.** Re-run with `--confirm`. That removes the lead and, through the database's cascades, its activity history and practice-chat messages. It also adds the VIN to the suppression list, so later pulls from Marketcheck skip it:

   ```sh
   node scripts/delete-seller-data.mjs --vin <VIN> --confirm
   ```
4. **Record the request** somewhere outside Spotr, like a private spreadsheet: the date, the VIN, who asked, and when it was deleted. Don't copy any seller details into it beyond what's needed to show the request was handled. It's also the list to re-run after restoring a backup.
5. **Reply** to confirm the deletion. Aim for within 30 days, and sooner is better.

## Backups and the database file

Backups taken before the deletion still contain the row until they age out, which takes up to about 4 weeks across every copy ([backups.md](backups.md) lists each one). Say so in the reply if asked, and don't restore an old backup without re-running the deletion afterwards.

SQLite also doesn't scrub deleted rows from the database file straight away; the space is reused over time. If a request needs the data gone from disk too, run `VACUUM` during a quiet moment (it briefly locks the database): `node -e 'new (require("@prisma/client").PrismaClient)().$executeRawUnsafe("VACUUM").then(() => console.log("done"))'`.

## Opt-out list

Suppressed VINs live in the `SuppressedVin` table, which holds only the VIN (uppercase) and when it was added. Its only purpose is to stop Spotr importing that vehicle again, so entries stay until the seller asks to be included again. `POST /api/leads/fetch` skips any listing whose VIN is on it. The script only adds a VIN that doesn't match a lead yet if it's a valid 17-character VIN, so a typo doesn't end up on the list.

To take a VIN off the list, run this in the Dokploy terminal with the VIN in capitals:

```sh
node -e 'new (require("@prisma/client").PrismaClient)().suppressedVin.deleteMany({ where: { vin: "<VIN>" } }).then(({ count }) => console.log(`removed ${count}`))'
```
