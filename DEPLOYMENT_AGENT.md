# Sovereign Deployment Agent

## Objective
To serve as the final gateway between the local development environment and the production Vercel infrastructure. The agent ensures that no code is pushed to `netguy47/Health-Shield-AI.git` without passing a full "Sovereign Audit."

## Operational Protocol

### 1. Pre-Flight Verification
Before any deployment or push, the agent MUST run:
- `npm run build`: Ensures TypeScript and Vite bundling are successful.
- `node scripts/sovereign-audit.cjs`: Validates environment variables and asset integrity.
- **Bundle Analysis**: Rejects push if critical chunks exceed 1MB (optimizes for PWA).

### 2. Deployment Standards
- **Remote Guard**: Only push to the `main` branch of `https://github.com/netguy47/Health-Shield-AI.git`.
- **Secret Protection**: Scans for `NEXT_PUBLIC_` prefixes on sensitive keys (Stripe Secret, Firebase Admin).
- **Environment Handling**: Maps variables based on `VERCEL_ENV` (development | preview | production).

### 3. Build Optimizations (from @vercel/build-utils)
- Use `output: 'standalone'` in Next.js/Vite if moving to containerized nodes.
- Implement manual chunking for Lucide-React and Radix UI to keep index bundle under 200kB.

## Verification Commands
```powershell
# Run the pre-flight check
node scripts/push-verify.cjs
```
