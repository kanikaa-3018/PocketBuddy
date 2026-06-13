from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import uuid
import datetime
from app.core.config import settings
from app.core.security import get_current_user
from app.core.database import get_db

from app.api import auth, profile, transactions, subscriptions, pools, webhook, checkins, companion

app = FastAPI(title="PocketBuddy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["subscriptions"])
app.include_router(pools.router, prefix="/api/cart-pools", tags=["pools"])
app.include_router(checkins.router, prefix="/api/checkins", tags=["checkins"])
app.include_router(companion.router, prefix="/api/companion", tags=["companion"])
app.include_router(webhook.router, prefix="/api/ingest", tags=["ingest"])
app.include_router(webhook.router, prefix="/webhook", tags=["webhook"])

@app.get("/api/campus-food")
async def get_campus_food():
    db = get_db()
    cursor = db.campus_food.find({})
    items = await cursor.to_list(length=100)
    from app.core.security import map_docs
    return map_docs(items)

@app.post("/api/seed")
async def seed_data(user_id: str = Depends(get_current_user)):
    db = get_db()
    
    # Clear existing data for a clean slate
    await db.transactions.delete_many({"user_id": user_id})
    await db.subscriptions.delete_many({"user_id": user_id})
    
    now = datetime.datetime.utcnow()
    
    # Seed subscriptions (Netflix and Spotify Premium)
    subs = [
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "service_name": "Spotify Premium",
            "amount": 17900,
            "billing_cycle": "monthly",
            "next_debit_date": now + datetime.timedelta(days=3),
            "is_active": True,
            "detected_from": "auto_detected",
            "created_at": now - datetime.timedelta(days=10)
        },
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "service_name": "Netflix India",
            "amount": 19900,
            "billing_cycle": "monthly",
            "next_debit_date": now + datetime.timedelta(days=5),
            "is_active": True,
            "detected_from": "auto_detected",
            "created_at": now - datetime.timedelta(days=15)
        }
    ]
    await db.subscriptions.insert_many(subs)
        
    # Seed transactions (food, travel, photocopy, etc.)
    txns = [
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": 12000,
            "raw_merchant_string": "Hostel 1 Night Canteen",
            "mapped_merchant_name": "Hostel 1 Night Canteen",
            "category": "food",
            "source": "auto_detected",
            "is_mapped": True,
            "created_at": now - datetime.timedelta(hours=6)
        },
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": 8000,
            "raw_merchant_string": "Mess Extra Chicken",
            "mapped_merchant_name": "Mess Extra Chicken",
            "category": "food",
            "source": "auto_detected",
            "is_mapped": True,
            "created_at": now - datetime.timedelta(days=1, hours=2)
        },
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": 15000,
            "raw_merchant_string": "Auto to Gwalior station",
            "mapped_merchant_name": "Auto to Gwalior station",
            "category": "travel",
            "source": "auto_detected",
            "is_mapped": True,
            "created_at": now - datetime.timedelta(days=2)
        },
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": 3000,
            "raw_merchant_string": "Photocopy library",
            "mapped_merchant_name": "Photocopy library",
            "category": "stationery",
            "source": "auto_detected",
            "is_mapped": True,
            "created_at": now - datetime.timedelta(days=3)
        },
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": 25000,
            "raw_merchant_string": "Movie ticket",
            "mapped_merchant_name": "Movie ticket",
            "category": "other",
            "source": "auto_detected",
            "is_mapped": True,
            "created_at": now - datetime.timedelta(days=4)
        }
    ]
    await db.transactions.insert_many(txns)
        
    # Seed campus food
    await db.campus_food.delete_many({})
    foods = [
        {
            "_id": str(uuid.uuid4()),
            "venue_name": "Hostel 1 Canteen",
            "venue": "Hostel 1 Canteen",
            "item_name": "Egg Maggi",
            "price": 4000,
            "available_from": "18:00",
            "available_until": "03:00",
            "created_at": now
        },
        {
            "_id": str(uuid.uuid4()),
            "venue_name": "Campus Café",
            "venue": "Campus Café",
            "item_name": "Masala Dosa",
            "price": 5000,
            "available_from": "08:00",
            "available_until": "20:00",
            "created_at": now
        },
        {
            "_id": str(uuid.uuid4()),
            "venue_name": "Nescafe Booth",
            "venue": "Nescafe Booth",
            "item_name": "Cold Coffee & Patty",
            "price": 4500,
            "available_from": "08:00",
            "available_until": "22:00",
            "created_at": now
        },
        {
            "_id": str(uuid.uuid4()),
            "venue_name": "Library Canteen",
            "venue": "Library Canteen",
            "item_name": "Veg Grilled Sandwich",
            "price": 5000,
            "available_from": "09:00",
            "available_until": "21:00",
            "created_at": now
        }
    ]
    await db.campus_food.insert_many(foods)

    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
