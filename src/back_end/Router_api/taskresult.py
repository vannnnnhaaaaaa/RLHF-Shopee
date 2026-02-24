from fastapi import Depends ,APIRouter , HTTPException
from sqlmodel  import select ,Session

from src.back_end.schemas  import TaskResultUpdate , TaskResultResponse
from src.back_end.auth import get_current_user , get_session
from src.back_end.models import User , Task , TaskResult
from src.back_end.services.taskresult_service import updateTaskResult , get_conflict_tasks
taskResult_router = APIRouter()
@taskResult_router.patch('/updateTask/{taskId}', response_model=TaskResultResponse)
async def updateTask(
    taskId: int, 
    data: TaskResultUpdate, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    result =await  updateTaskResult(taskId , data , current_user , session)
    return result

@taskResult_router.get('/admin/conflicts')
async def getTaskConflict(session: Session = Depends(get_session) , current_user : User = Depends(get_current_user)) :
    if current_user.auth != 'admin' :
        raise HTTPException(status_code=403 , detail='Ban khong co quyen xem')
    result = await get_conflict_tasks(session)
    return result