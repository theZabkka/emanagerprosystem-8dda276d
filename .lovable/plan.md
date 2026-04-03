Migration SQL that:
1. Adds user_id column to customer_contacts
2. Backfills from profiles by email
3. Drops old contact-self RLS policies (id = auth.uid())
4. Creates new ones (user_id = auth.uid())
5. Creates helper function get_client_id_for_user()
6. Adds RLS policies for tasks/projects/tickets allowing client contacts to read their company data

Then update edge functions, useAuth, and frontend filters.