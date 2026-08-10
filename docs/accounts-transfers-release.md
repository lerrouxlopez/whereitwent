# Accounts & transfers release checklist

Apply the database migrations in Supabase SQL Editor before merging the web release. Run them in this order:

1. `supabase/migrations/20260810_planned_transactions.sql`
2. `supabase/migrations/20260810_accounts_and_transfers.sql`

After the GitHub pull request is merged, the existing deployment workflow builds the web image and updates only the WIW container on the VPS.

## Live verification

1. Sign in and open **Accounts**.
2. Create a bank account and a credit-card account with a credit limit.
3. Add a card expense and confirm it increases the card amount owed once.
4. Record a transfer from the bank to the card and confirm the bank balance falls, card debt falls, and spending does not change.
5. Refresh the page, then sign in from a second browser session and confirm the accounts, account assignments, and transfer remain visible.
