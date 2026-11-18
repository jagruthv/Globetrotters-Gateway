# Frontend Auth Context — Logic Audit & Implementation Status

This document provides a factual, code-verified audit of authentication state management in `frontend/src/context/AuthContext.jsx`.

---

## Implemented Logic
- **State Initialization**: Reads initially saved user profile from `localStorage.getItem('globetrotter_user')`.
- **Cross-Component / Cross-Tab Synchronization**:
  - Registers a `window.addEventListener('auth-change', ...)` hook.
  - Whenever `authService.login()`, `register()`, `logout()`, or an automatic 401 session expiration occurs, an `auth-change` event is dispatched.
  - The context automatically syncs its React state without needing page reloads.
- **Exposed Properties**:
  - `user`: User profile payload (id, email, fullName, role).
  - `role`: Role string (e.g. `ROLE_TOURIST`, `ROLE_STAFF`, `ROLE_ADMIN`).
  - `isAuthenticated`: Boolean (`!!user`).
  - `isAdmin`: Boolean (`user?.role === 'ROLE_ADMIN'`).
  - `isStaff`: Boolean (`user?.role === 'ROLE_STAFF' || user?.role === 'ROLE_ADMIN'`).
  - `isTourist`: Boolean (`user?.role === 'ROLE_TOURIST'`).
  - `login(email, password)`: Async action updating local state.
  - `register(userData)`: Async action updating local state.
  - `logout()`: Clears credentials and resets state to null.
- **Custom Hook**: `useAuth()` provides safe access, throwing an error if invoked outside an `AuthProvider`.

---

---

## Architecture & CodeRabbit Quality Compliance
- **Zero Fast Refresh Violations**: Conforms strictly to Vite and Oxlint `react/only-export-components` guidelines. `createContext` is defined in `authContextDef.js`, the React component `AuthProvider` resides in `AuthContext.jsx`, and the consumer hook `useAuth()` is encapsulated in `useAuth.js`.
- **Static Analysis**: Verified with 0 errors and 0 warnings under Oxlint.
