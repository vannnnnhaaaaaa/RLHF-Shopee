from passlib.context import CryptContext
from datetime import datetime , timedelta
from jose import jwt , JWTError
from fastapi.security import OAuth2PasswordBearer 
from fastapi import Depends  , HTTPException , status
from sqlmodel import Session 
from src.back_end.models import User
from src.back_end.connect_database import get_session
pwd_context = CryptContext(schemes=["bcrypt"] , deprecated = "auto") 

SECRET_KEY = 'TOI_YEU_LAP_TRINH_FULLSTACK_AI'
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 

oauth2_schema = OAuth2PasswordBearer(tokenUrl="/login")

def hash_password(password : str) :
    print('day là mat kahau : ')
    print (password)
    return pwd_context.hash(password[:71])

def verify_password ( plain_password , hashed_password) :
    return pwd_context.verify(plain_password , hashed_password )

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user (token : str = Depends(oauth2_schema) , session : Session = Depends(get_session) ) :
    credentials_exception= HTTPException (
        status_code=status.HTTP_401_UNAUTHORIZED ,
        detail="khong the xac minh nguoi dung" ,
        headers= {"WWW-Authenticate": "Bearer"}
    )
    try :
        payload = jwt.decode(token , SECRET_KEY , algorithms=[ALGORITHM])
        user_id : int = payload.get('user_id')
        if user_id is None:
            print ("ko tìm thấy token")
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = session.get(User, user_id)
    if user is None:
        raise credentials_exception
    return user