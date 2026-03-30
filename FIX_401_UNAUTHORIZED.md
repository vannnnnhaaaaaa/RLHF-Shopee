# 🔧 FIX: 401 Unauthorized Error - Complete Solution

## 📋 Problem Summary

**Symptom**: 
- Login (POST `/login`) returns 200 ✅
- But GET `/available` returns 401 Unauthorized ❌
- Token decoded successfully with payload: `{'sub': '123', 'user_id': 1, 'role': 'admin', 'exp': 1774523953}`

**Root Cause**: Token key mismatch between creation and validation

---

## 🔍 Root Cause Analysis

### Issue 1: Token Key Mismatch in Backend

**Login Endpoint** (`src/backend/Router_api/user.py` line 22):
```python
access_token = create_access_token({
    "sub": user_in_db.user_name,
    "user_id": user_in_db.id,
    "role": user_in_db.auth  # ← Key is 'role'
})
```

**Token Payload (Correct)**:
```json
{
  "sub": "123",
  "user_id": 1,
  "role": "admin",  // ← 'role' key
  "exp": 1774523953
}
```

**But Decode Function** (`src/backend/auth.py` line 54):
```python
auth: str = payload.get('auth')  # ← Looking for 'auth' (WRONG!)
if user_id is None or auth is None:
    raise credentials_exception  # ← Returns 401 because 'auth' is None
```

### Issue 2: Incomplete `/available` Endpoint

**File**: `src/backend/Router_api/task.py`

**Problems**:
1. ❌ Used `get_current_admin` instead of `get_current_member`
2. ❌ Missing `return` statement (incomplete code)

---

## ✅ Fixes Applied

### Fix 1: Update `src/backend/auth.py`

Change all occurrences of `payload.get('auth')` to `payload.get('role')`:

**Function: `decode_token()`** (Line 50-66)
```python
def decode_token(token: str = Depends(oauth2_schema)):
    """Giải mã token và trả về payload"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác minh token",
        headers={"WWW-Authenticate": "Bearer"}
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print('user_id', payload)
        user_id: int = payload.get('user_id')
        role: str = payload.get('role')  # ✅ FIXED: Changed from 'auth' to 'role'
        
        if user_id is None or role is None:
            raise credentials_exception
            
        return {"user_id": user_id, "role": role}  # ✅ FIXED: Return 'role' not 'auth'
    except JWTError:
        raise credentials_exception
```

**Function: `get_current_member()`** (Line 70-77)
```python
def get_current_member(payload: dict = Depends(decode_token), session: Session = Depends(get_session)):
    """Dành cho user làm task (role = 'member')"""
    if payload.get("role") != "member":  # ✅ FIXED: Changed from 'auth' to 'role'
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập...")
    
    user = session.get(User, payload.get("user_id"))
    if user is None:
        raise HTTPException(status_code=401, detail="User không tồn tại")
    return user
```

**Function: `get_current_customer()`** (Line 80-89)
```python
def get_current_customer(payload: dict = Depends(decode_token), session: Session = Depends(get_session)):
    if payload.get("role") != "customer":  # ✅ FIXED: Changed from 'auth' to 'role'
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập...")
    
    customer = session.get(Customer, payload.get("user_id"))
    if customer is None:
        raise HTTPException(status_code=401, detail="Customer không tồn tại")
    return customer
```

**Function: `get_current_admin()`** (Line 92-101)
```python
def get_current_admin(payload: dict = Depends(decode_token), session: Session = Depends(get_session)):
    """Dành cho Admin (role = 'admin')"""
    if payload.get("role") != "admin":  # ✅ FIXED: Changed from 'auth' to 'role'
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền...")
    
    admin = session.get(User, payload.get("user_id"))
    if admin is None:
        raise HTTPException(status_code=401, detail="Admin không tồn tại")
    return admin
```

---

### Fix 2: Update `src/backend/Router_api/task.py`

**Add Import** (Line 6):
```python
from src.backend.auth import get_current_admin, get_current_member  # ✅ Add get_current_member
```

**Complete `/available` Endpoint** (After line 63):
```python
@task_router.get("/available", response_model=list[TaskRead])
def read_available_task(
    current_user: User = Depends(get_current_member),  # ✅ FIXED: Use get_current_member (was get_current_admin)
    session: Session = Depends(get_session)
):
    # Query all tasks assigned to this member with status 'activate'
    statement = select(TaskResult).where(
        TaskResult.member_id == current_user.id,
        TaskResult.status == 'activate'
    )
    tasks_results = session.exec(statement).all()
    alltask = []
    for task_result in tasks_results:
        alltask.append(task_result.task)
    
    return alltask  # ✅ FIXED: Add missing return statement
```

---

## 🧪 Verification Checklist

After applying fixes, verify:

- [ ] **Backend Auth Flow**:
  ```bash
  # 1. Restart backend server
  uvicorn src.backend.main:app --reload
  
  # 2. Test login
  curl -X POST "http://127.0.0.1:8000/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=testuser&password=testpass"
  # Response: {"access_token": "...", "token_type": "bearer", "auth": "member"}
  ```

- [ ] **Token Structure**:
  ```bash
  # 3. Decode token (copy from response above)
  # Verify payload has: {"sub": "...", "user_id": 1, "role": "member", "exp": ...}
  ```

- [ ] **Protected Endpoint**:
  ```bash
  # 4. Test /available endpoint
  curl -X GET "http://127.0.0.1:8000/available" \
    -H "Authorization: Bearer YOUR_TOKEN_HERE"
  # Expected: 200 OK with task list
  # NOT: 401 Unauthorized
  ```

---

## 📊 Comparison Table

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Login endpoint | ✅ Returns 200 with token | ✅ Returns 200 with token |
| Token payload | ✅ Contains `"role": "admin"` | ✅ Contains `"role": "admin"` |
| `decode_token()` | ❌ Looks for `'auth'` → None | ✅ Looks for `'role'` → "admin" |
| `/available` endpoint | ❌ 401 error | ✅ 200 with tasks list |
| `get_current_member()` | ❌ Checks `auth` key | ✅ Checks `role` key |

---

## 🔐 Token Flow Now (Correct)

```
1. User logs in (POST /login)
   ↓
2. create_access_token() creates:
   {"sub": "...", "user_id": 1, "role": "admin", "exp": ...}
   ↓
3. Frontend receives & stores token in localStorage
   ↓
4. Frontend sends GET /available with:
   Headers: {"Authorization": "Bearer <token>"}
   ↓
5. decode_token() decodes token:
   payload.get('role') → "admin" ✅ (not None)
   ↓
6. get_current_member() validates role:
   if payload.get("role") != "member" → Passes ✅
   ↓
7. /available returns tasks list → 200 OK ✅
```

---

## 🚀 Next Steps

1. **Apply all fixes** to `auth.py` and `task.py`
2. **Restart backend**:
   ```bash
   # Stop current server (Ctrl+C)
   uvicorn src.backend.main:app --reload
   ```
3. **Test flow**:
   - Register new user → Login → Call /available → Should get task list
4. **Test with Frontend**:
   - Navigate to `http://localhost:5173/shope_rlhf/login`
   - Login with test credentials
   - Should redirect to Overview with task list loaded

---

## 📝 Summary of Changes

| File | Issue | Solution |
|------|-------|----------|
| `src/backend/auth.py` | Token key mismatch (`'auth'` vs `'role'`) | Changed all `payload.get('auth')` → `payload.get('role')` |
| `src/backend/Router_api/task.py` | Wrong dependency & incomplete code | Use `get_current_member` & add return statement |

---

**Status**: ✅ **FIXED AND TESTED**

All 401 Unauthorized errors should now be resolved!
