from fastapi import APIRouter, Depends, Query

from app.core.database import get_db
from app.core.security import get_current_user, map_docs

router = APIRouter()


@router.get("/logs")
async def get_companion_logs(
    limit: int = Query(default=20, ge=1, le=100),
    user_id: str = Depends(get_current_user),
):
    db = get_db()
    cursor = db.companion_sync_log.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
    logs = await cursor.to_list(length=limit)
    return map_docs(logs)
