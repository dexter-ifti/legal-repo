Here is a step-by-step breakdown of how the invite link system works under the hood and how it binds a user to a specific workspace:

---

### **1. Invite Generation (Admin Action)**
When an Admin creates an invite from the Dashboard:
1. **Unguessable Token**: The backend generates a cryptographically secure, random 32-character token (using `secrets.token_urlsafe(32)`).
2. **Database Binding**: A record is created in the `invites` table that links this token directly to the Admin's **Workspace (`tenant_id`)**:
   ```python
   invite = Invite(
       id=uuid.uuid4(),
       tenant_id=tenant_id,        # <--- Binds token to this specific Workspace
       email="teammate@company.com",
       role="member",               # 'admin' or 'member'
       token="x8F2kL9...",          # Unique unguessable token
       status="pending",
       expires_at=datetime.utcnow() + timedelta(days=7)
   )
   ```
3. **URL Creation**: The system produces the shareable link format:  
   `https://<your-app-domain>/login?invite=x8F2kL9...`

---

### **2. Validation (When Recipient Clicks the Link)**
When the recipient opens the link in their browser:
1. The frontend extracts `?invite=<token>` from the URL parameters.
2. The frontend calls the public API endpoint:  
   `GET /api/invites/validate/x8F2kL9...`
3. The backend checks the `invites` table for `token == "x8F2kL9..."`:
   * It checks if `status == "pending"` and `expires_at > current_time`.
   * It queries the `tenants` table using `invite.tenant_id` to get the workspace name.
4. The API returns:
   ```json
   {
     "valid": true,
     "email": "teammate@company.com",
     "role": "member",
     "tenantName": "Acme Corp Workspace"
   }
   ```
5. The UI displays: *"You have been invited to join Acme Corp Workspace as a Member."*

---

### **3. Acceptance & Workspace Provisioning**
When the user clicks **Sign Up** or completes authentication:
1. The backend receives the auth payload along with the `invite_token`.
2. It looks up the `Invite` record using the token to retrieve the associated `tenant_id`.
3. Instead of creating a new workspace, the backend provisions the user record in the database with:
   * `user.tenant_id = invite.tenant_id` (assigns user to the target workspace).
   * `user.role = invite.role` (assigns 'admin' or 'member').
4. The invite record is marked as `status = "accepted"`.

---

### **Summary Key Takeaway**
The system knows which workspace an invite belongs to because the **token acts as a secure database pointer to the exact `tenant_id` (Workspace ID)** created when the admin generated the link.
