# AP Circle Digital Transactions Dashboard

Real-time tracking of cumulative MTD booking-counter transactions across all offices in AP Postal Circle.

## How to update the dashboard each morning

1. Download the Booking Paymentwise Report (CSV, cumulative MTD) from the India Post portal.
2. Open `https://<your-vercel-url>/upload` in any browser.
3. Drag the CSV file into the box.
4. Verify the snapshot date matches today's date.
5. Click **Confirm Upload**.
6. Done. The public dashboard at `https://<your-vercel-url>/` will reflect the new data within seconds.

> If you see any red ⚠ icon during validation, stop and notify Sri Prasanna.

## Development

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build
npm run lint      # Lint check
```

## Seed offices (one-time)

1. Place `Hierarchy_data_latest_30_03_2026.xlsx` in `data/`
2. Run: `npx tsx scripts/seed-offices.ts`

## Environment variables

See `.env.example`. Set these in Vercel under Project Settings → Environment Variables.
